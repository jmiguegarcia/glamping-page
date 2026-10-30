import { randomInt } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MINUTOS_PARA_PAGAR } from '../config/negocio.js';
import { Prisma } from '../generated/prisma/client.js';
import { EstadoReserva } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { diasEntre, formatearFecha, instante, parsearFecha, sumarDias } from './calendario.js';
import { calcularReembolso } from './cancelacion.js';
import { Catalogo, Cotizacion, cotizar } from './cotizacion.js';
import { calcularDisponibilidad } from './disponibilidad.js';
import { CotizarDto } from './dto/cotizar.dto.js';
import { CrearReservaDto } from './dto/crear-reserva.dto.js';
import { DisponibilidadDto } from './dto/disponibilidad.dto.js';

/** Estados que ocupan la cabaña (los mismos que usa la restricción de PostgreSQL). */
const ESTADOS_ACTIVOS: EstadoReserva[] = [EstadoReserva.PENDIENTE_PAGO, EstadoReserva.CONFIRMADA];
const MAX_DIAS_DISPONIBILIDAD = 92;
const MENSAJE_NO_DISPONIBLE = 'Ese horario ya no está disponible. Por favor elige otra fecha u hora.';

const incluirDetalle = {
  alojamiento: { select: { slug: true, nombre: true } },
  cliente: { select: { nombre: true, email: true, telefono: true } },
  servicios: { include: { servicio: { select: { slug: true, nombre: true } } } },
} satisfies Prisma.ReservaInclude;

type ReservaConDetalle = Prisma.ReservaGetPayload<{ include: typeof incluirDetalle }>;

@Injectable()
export class ReservasService {
  constructor(private readonly prisma: PrismaService) {}

  async disponibilidad(dto: DisponibilidadDto) {
    const desde = parsearFecha(dto.desde);
    const hasta = parsearFecha(dto.hasta);
    if (!desde || !hasta) throw new BadRequestException('Las fechas no son válidas.');
    const dias = diasEntre(desde, hasta);
    if (dias < 0 || dias >= MAX_DIAS_DISPONIBILIDAD) {
      throw new BadRequestException(`El rango debe ir hacia adelante y tener máximo ${MAX_DIAS_DISPONIBILIDAD} días.`);
    }

    const { id } = await this.buscarAlojamiento(dto.alojamiento);
    await this.expirarPendientes();
    // Margen de un día extra a cada lado: una estadía del día anterior afecta al primero.
    const ocupadas = await this.prisma.reserva.findMany({
      where: {
        alojamientoId: id,
        estado: { in: ESTADOS_ACTIVOS },
        inicio: { lt: instante(sumarDias(hasta, 2), '00:00') },
        bloqueoHasta: { gt: instante(sumarDias(desde, -1), '00:00') },
      },
      select: { inicio: true, bloqueoHasta: true },
    });

    return { alojamiento: dto.alojamiento, dias: calcularDisponibilidad(desde, hasta, ocupadas) };
  }

  /** Calcula precio y horario sin guardar nada, e indica si el horario está libre ahora mismo. */
  async cotizar(dto: CotizarDto) {
    const { id, catalogo } = await this.cargarCatalogo(dto.alojamiento);
    const cotizacion = cotizar(dto, catalogo);
    await this.expirarPendientes();
    const cruces = await this.prisma.reserva.count({
      where: {
        alojamientoId: id,
        estado: { in: ESTADOS_ACTIVOS },
        inicio: { lt: cotizacion.bloqueoHasta },
        bloqueoHasta: { gt: cotizacion.inicio },
      },
    });
    return { disponible: cruces === 0, ...formatearCotizacion(cotizacion) };
  }

  /**
   * Crea la reserva en PENDIENTE_PAGO. Si el horario se ocupó entre la cotización y
   * este momento, PostgreSQL la rechaza (reservas_sin_solapamiento) y respondemos 409.
   */
  async crear(dto: CrearReservaDto) {
    const { id: alojamientoId, catalogo } = await this.cargarCatalogo(dto.alojamiento);
    const c = cotizar(dto, catalogo);
    await this.expirarPendientes();

    const idsServicios = new Map(
      (await this.prisma.servicio.findMany({ select: { id: true, slug: true } })).map((s) => [s.slug, s.id]),
    );

    // Reintenta solo si el código aleatorio ya existía (muy improbable).
    for (let intento = 1; ; intento++) {
      try {
        const reserva = await this.prisma.$transaction(async (tx) => {
          const cliente = await tx.cliente.upsert({
            where: { email: dto.email.toLowerCase() },
            update: { nombre: dto.nombre, telefono: dto.telefono },
            create: { nombre: dto.nombre, email: dto.email.toLowerCase(), telefono: dto.telefono },
          });
          return tx.reserva.create({
            data: {
              codigo: generarCodigo(),
              tipo: c.tipo,
              alojamientoId,
              clienteId: cliente.id,
              fechaEntrada: c.fechaEntrada,
              fechaSalida: c.fechaSalida,
              noches: c.noches,
              inicio: c.inicio,
              fin: c.fin,
              bloqueoHasta: c.bloqueoHasta,
              huespedes: c.huespedes,
              notas: dto.notas,
              subtotalAlojamiento: c.subtotalAlojamiento,
              subtotalServicios: c.subtotalServicios,
              total: c.total,
              expiraEn: new Date(Date.now() + MINUTOS_PARA_PAGAR * 60 * 1000),
              servicios: {
                create: c.servicios.map((s) => ({
                  servicioId: idsServicios.get(s.slug)!,
                  precioUnitario: s.precioUnitario,
                  cantidad: s.cantidad,
                  subtotal: s.subtotal,
                })),
              },
            },
            include: incluirDetalle,
          });
        });
        return formatearReserva(reserva);
      } catch (e) {
        if (codigoPostgres(e) === '23P01') throw new ConflictException(MENSAJE_NO_DISPONIBLE);
        if (esCodigoRepetido(e) && intento < 3) continue;
        throw e;
      }
    }
  }

  async consultar(codigo: string, email: string) {
    await this.expirarPendientes();
    return formatearReserva(await this.buscarReserva(codigo, email));
  }

  /** Aplica la política de cancelación. El reembolso real con la pasarela llega en la etapa de pagos. */
  async cancelar(codigo: string, email: string) {
    await this.expirarPendientes();
    const reserva = await this.buscarReserva(codigo, email);

    if (!ESTADOS_ACTIVOS.includes(reserva.estado)) {
      throw new ConflictException(`La reserva no se puede cancelar porque está ${reserva.estado}.`);
    }
    // Una reserva pendiente no se ha pagado: no hay nada que devolver.
    const reembolso =
      reserva.estado === EstadoReserva.CONFIRMADA
        ? calcularReembolso(reserva.total, reserva.inicio)
        : { porcentaje: 0, monto: 0 };

    const cancelada = await this.prisma.reserva.update({
      where: { id: reserva.id },
      data: { estado: EstadoReserva.CANCELADA, canceladaEn: new Date(), montoReembolso: reembolso.monto },
      include: incluirDetalle,
    });
    return { ...formatearReserva(cancelada), reembolso: { porcentaje: reembolso.porcentaje, monto: reembolso.monto } };
  }

  /** Libera las fechas de reservas que no se pagaron a tiempo. */
  private async expirarPendientes() {
    await this.prisma.reserva.updateMany({
      where: { estado: EstadoReserva.PENDIENTE_PAGO, expiraEn: { lt: new Date() } },
      data: { estado: EstadoReserva.EXPIRADA },
    });
  }

  private async buscarAlojamiento(slug: string) {
    const alojamiento = await this.prisma.alojamiento.findFirst({ where: { slug, activo: true } });
    if (!alojamiento) throw new NotFoundException(`No existe el alojamiento "${slug}".`);
    return alojamiento;
  }

  private async cargarCatalogo(slug: string): Promise<{ id: number; catalogo: Catalogo }> {
    const alojamiento = await this.buscarAlojamiento(slug);
    const [tarifas, servicios] = await Promise.all([
      this.prisma.tarifa.findMany({ where: { alojamientoId: alojamiento.id } }),
      this.prisma.servicio.findMany({ where: { activo: true }, select: { slug: true, nombre: true, precio: true } }),
    ]);
    return {
      id: alojamiento.id,
      catalogo: {
        capacidad: alojamiento.capacidad,
        tarifas: Object.fromEntries(tarifas.map((t) => [t.tipo, t.precio])),
        servicios,
      },
    };
  }

  /** Busca por código y email: sin el email correcto, la reserva "no existe". */
  private async buscarReserva(codigo: string, email: string) {
    const reserva = await this.prisma.reserva.findUnique({ where: { codigo: codigo.toUpperCase() }, include: incluirDetalle });
    if (!reserva || reserva.cliente.email !== email.toLowerCase()) {
      throw new NotFoundException('No encontramos una reserva con ese código y email.');
    }
    return reserva;
  }
}

// Sin 0/O ni 1/I/L para que el código sea fácil de dictar por teléfono.
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function generarCodigo(): string {
  let codigo = 'CP-';
  for (let i = 0; i < 6; i++) codigo += ALFABETO[randomInt(ALFABETO.length)];
  return codigo;
}

/** Código de error original de PostgreSQL dentro de un error de Prisma (ej. "23P01"). */
function codigoPostgres(e: unknown): string | undefined {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  const meta = e.meta as { driverAdapterError?: { cause?: { originalCode?: string } } } | undefined;
  return meta?.driverAdapterError?.cause?.originalCode;
}

function esCodigoRepetido(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && JSON.stringify(e.meta).includes('codigo');
}

function formatearCotizacion(c: Cotizacion) {
  return {
    ...c,
    fechaEntrada: formatearFecha(c.fechaEntrada),
    fechaSalida: formatearFecha(c.fechaSalida),
  };
}

function formatearReserva(r: ReservaConDetalle) {
  return {
    codigo: r.codigo,
    estado: r.estado,
    tipo: r.tipo,
    alojamiento: r.alojamiento,
    cliente: r.cliente,
    fechaEntrada: formatearFecha(r.fechaEntrada),
    fechaSalida: formatearFecha(r.fechaSalida),
    noches: r.noches,
    inicio: r.inicio,
    fin: r.fin,
    huespedes: r.huespedes,
    notas: r.notas,
    servicios: r.servicios.map((s) => ({
      slug: s.servicio.slug,
      nombre: s.servicio.nombre,
      precioUnitario: s.precioUnitario,
      cantidad: s.cantidad,
      subtotal: s.subtotal,
    })),
    subtotalAlojamiento: r.subtotalAlojamiento,
    subtotalServicios: r.subtotalServicios,
    total: r.total,
    expiraEn: r.expiraEn,
    canceladaEn: r.canceladaEn,
    montoReembolso: r.montoReembolso,
    creadoEn: r.creadoEn,
  };
}
