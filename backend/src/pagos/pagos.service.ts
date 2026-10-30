import { randomBytes } from 'node:crypto';
import {
  BadGatewayException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MINUTOS_PARA_PAGAR } from '../config/negocio.js';
import { configWompi } from '../config/wompi.js';
import { EstadoPago, EstadoReserva } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { CRUCE_DE_HORARIO, codigoPostgres } from '../prisma/errores.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReservasService } from '../reservas/reservas.service.js';
import { eventoAutentico, firmaIntegridad } from './firmas.js';

const MONEDA = 'COP';

/** Lo que nos importa de una transacción de Wompi (GET /transactions/:id o evento). */
interface TransaccionWompi {
  id: string;
  reference: string;
  status: string; // PENDING | APPROVED | DECLINED | VOIDED | ERROR
  amount_in_cents: number;
  currency: string;
}

const ESTADO_SEGUN_WOMPI: Record<string, EstadoPago> = {
  PENDING: EstadoPago.PENDIENTE,
  APPROVED: EstadoPago.APROBADO,
  DECLINED: EstadoPago.RECHAZADO,
  ERROR: EstadoPago.RECHAZADO,
  VOIDED: EstadoPago.ANULADO,
};

export interface ResultadoPago {
  codigo: string;
  estadoPago: EstadoPago;
  estadoReserva: EstadoReserva;
  total: number;
}

@Injectable()
export class PagosService {
  private readonly log = new Logger(PagosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reservas: ReservasService,
  ) {}

  /**
   * Prepara el cobro de una reserva pendiente y devuelve la URL del checkout de Wompi.
   * El monto y la referencia van firmados: el cliente no puede cambiarlos.
   */
  async iniciar(codigo: string): Promise<{ urlCheckout: string }> {
    const wompi = configWompi();
    await this.reservas.expirarPendientes();

    const reserva = await this.prisma.reserva.findUnique({ where: { codigo: codigo.toUpperCase() } });
    if (!reserva) throw new NotFoundException('No encontramos esa reserva.');
    if (reserva.estado === EstadoReserva.CONFIRMADA) throw new ConflictException('Esta reserva ya está pagada.');
    if (reserva.estado !== EstadoReserva.PENDIENTE_PAGO) {
      throw new ConflictException('Esta reserva ya no está disponible para pagar. Puedes hacer una nueva reserva.');
    }

    // Mientras paga, las fechas siguen apartadas. El checkout vence a la misma hora:
    // así nadie puede pagar una reserva que ya se liberó.
    const expiraEn = new Date(Date.now() + MINUTOS_PARA_PAGAR * 60 * 1000);
    const referencia = `${reserva.codigo}-${randomBytes(4).toString('hex')}`;
    const montoEnCentavos = reserva.total * 100;

    await this.prisma.$transaction([
      this.prisma.reserva.update({ where: { id: reserva.id }, data: { expiraEn } }),
      this.prisma.pago.create({
        data: { reservaId: reserva.id, monto: reserva.total, proveedor: 'wompi', referencia },
      }),
    ]);

    const parametros = new URLSearchParams({
      'public-key': wompi.llavePublica,
      currency: MONEDA,
      'amount-in-cents': String(montoEnCentavos),
      reference: referencia,
      'expiration-time': expiraEn.toISOString(),
      'signature:integrity': firmaIntegridad({
        referencia,
        montoEnCentavos,
        moneda: MONEDA,
        expiracion: expiraEn.toISOString(),
        secreto: wompi.secretoIntegridad,
      }),
      'redirect-url': `${process.env.FRONTEND_URL ?? 'http://cabana.localhost:4200'}/reserva/${reserva.codigo}/pago`,
    });
    return { urlCheckout: `${wompi.urlCheckout}?${parametros}` };
  }

  /**
   * Al volver del checkout, Wompi agrega ?id=<transacción>. Consultamos a Wompi el estado
   * real (no confiamos en lo que diga la URL) y lo aplicamos. Esto además cubre el
   * desarrollo local, donde los webhooks de Wompi no pueden llegar a localhost.
   */
  async consultarTransaccion(id: string): Promise<ResultadoPago> {
    const wompi = configWompi();
    const respuesta = await fetch(`${wompi.urlApi}/transactions/${encodeURIComponent(id)}`);
    if (respuesta.status === 404) throw new NotFoundException('No encontramos ese pago.');
    if (!respuesta.ok) throw new BadGatewayException('No pudimos consultar el pago con Wompi. Inténtalo de nuevo.');

    const { data } = (await respuesta.json()) as { data: TransaccionWompi };
    const resultado = await this.aplicarTransaccion(data);
    if (!resultado) throw new NotFoundException('No encontramos ese pago.');
    return resultado;
  }

  /** Webhook: Wompi avisa cada cambio de estado de una transacción. */
  async procesarEvento(evento: unknown): Promise<void> {
    const wompi = configWompi();
    if (!eventoAutentico(evento, wompi.secretoEventos)) {
      this.log.warn('Evento de Wompi con firma inválida: ignorado.');
      throw new UnauthorizedException('Firma inválida.');
    }
    if (evento.event !== 'transaction.updated') return;
    await this.aplicarTransaccion(evento.data['transaction'] as TransaccionWompi);
  }

  /**
   * Aplica el estado de una transacción al pago y a la reserva. Es idempotente: Wompi
   * puede avisar varias veces y el cliente puede recargar la página de resultado.
   */
  async aplicarTransaccion(tx: TransaccionWompi): Promise<ResultadoPago | undefined> {
    const pago = await this.prisma.pago.findUnique({ where: { referencia: tx.reference }, include: { reserva: true } });
    if (!pago) {
      this.log.warn(`Transacción ${tx.id} con referencia desconocida ${tx.reference}.`);
      return undefined;
    }

    // Defensa: el monto cobrado debe ser exactamente el de la reserva.
    if (tx.currency !== MONEDA || tx.amount_in_cents !== pago.monto * 100) {
      this.log.error(`Transacción ${tx.id}: monto ${tx.amount_in_cents} ${tx.currency} no coincide con el pago ${pago.referencia}.`);
      return this.resultado(pago.reserva.codigo, EstadoPago.RECHAZADO, pago.reserva.estado, pago.monto);
    }

    const estadoPago = ESTADO_SEGUN_WOMPI[tx.status] ?? EstadoPago.PENDIENTE;
    await this.prisma.pago.update({
      where: { id: pago.id },
      data: { estado: estadoPago, idTransaccion: tx.id, respuesta: tx as unknown as Prisma.InputJsonValue },
    });

    let estadoReserva = pago.reserva.estado;
    if (estadoPago === EstadoPago.APROBADO) estadoReserva = await this.confirmarReserva(pago.reserva.id, pago.referencia);
    return this.resultado(pago.reserva.codigo, estadoPago, estadoReserva, pago.monto);
  }

  private async confirmarReserva(reservaId: number, referencia: string): Promise<EstadoReserva> {
    try {
      // Solo se confirma una reserva que esperaba pago (o que expiró mientras se pagaba).
      // Una cancelada no "revive": ese dinero se devuelve.
      const { count } = await this.prisma.reserva.updateMany({
        where: { id: reservaId, estado: { in: [EstadoReserva.PENDIENTE_PAGO, EstadoReserva.EXPIRADA] } },
        data: { estado: EstadoReserva.CONFIRMADA, expiraEn: null },
      });
      const { estado } = await this.prisma.reserva.findUniqueOrThrow({ where: { id: reservaId }, select: { estado: true } });
      if (!count && estado !== EstadoReserva.CONFIRMADA) {
        this.log.error(`Pago ${referencia} aprobado para una reserva ${estado}: requiere reembolso manual.`);
      }
      return estado;
    } catch (e) {
      // Caso raro: la reserva expiró y otra persona tomó el horario antes de que llegara el pago.
      if (codigoPostgres(e) === CRUCE_DE_HORARIO) {
        this.log.error(`Pago ${referencia} aprobado pero el horario ya está ocupado: requiere reembolso manual.`);
        return EstadoReserva.EXPIRADA;
      }
      throw e;
    }
  }

  private resultado(codigo: string, estadoPago: EstadoPago, estadoReserva: EstadoReserva, total: number): ResultadoPago {
    return { codigo, estadoPago, estadoReserva, total };
  }
}
