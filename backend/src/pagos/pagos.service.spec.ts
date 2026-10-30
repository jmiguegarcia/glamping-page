import { createHash } from 'node:crypto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { EstadoPago, EstadoReserva } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReservasService } from '../reservas/reservas.service.js';
import { PagosService } from './pagos.service.js';

const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');

const ENV = {
  WOMPI_LLAVE_PUBLICA: 'pub_test_llave',
  WOMPI_SECRETO_INTEGRIDAD: 'test_integrity_secreto',
  WOMPI_SECRETO_EVENTOS: 'test_events_secreto',
  FRONTEND_URL: 'http://cabana.localhost:4200',
};

const reservaPendiente = { id: 7, codigo: 'CP-ABC234', estado: EstadoReserva.PENDIENTE_PAGO, total: 450000 };
const pago = { id: 3, referencia: 'CP-ABC234-a1b2c3d4', monto: 450000, reserva: reservaPendiente };

function crearServicio() {
  const prisma = {
    $transaction: vi.fn(async (ops: unknown[]) => ops),
    reserva: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    pago: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
  const reservas = { expirarPendientes: vi.fn() };
  const servicio = new PagosService(prisma as unknown as PrismaService, reservas as unknown as ReservasService);
  return { servicio, prisma };
}

describe('PagosService', () => {
  beforeEach(() => Object.assign(process.env, ENV));

  describe('iniciar', () => {
    it('arma la URL del checkout con el monto en centavos, la expiración y la firma correcta', async () => {
      const { servicio, prisma } = crearServicio();
      prisma.reserva.findUnique.mockResolvedValue(reservaPendiente);

      const { urlCheckout } = await servicio.iniciar('cp-abc234');
      const url = new URL(urlCheckout);
      const p = url.searchParams;

      expect(url.origin + url.pathname).toBe('https://checkout.wompi.co/p/');
      expect(p.get('public-key')).toBe('pub_test_llave');
      expect(p.get('amount-in-cents')).toBe('45000000');
      expect(p.get('currency')).toBe('COP');
      expect(p.get('reference')).toMatch(/^CP-ABC234-[0-9a-f]{8}$/);
      expect(p.get('redirect-url')).toBe('http://cabana.localhost:4200/reserva/CP-ABC234/pago');
      expect(p.get('signature:integrity')).toBe(
        sha256(`${p.get('reference')}45000000COP${p.get('expiration-time')}test_integrity_secreto`),
      );
      // El pago se registra con la misma referencia que se firmó.
      expect(prisma.pago.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ referencia: p.get('reference'), monto: 450000, reservaId: 7 }),
      });
    });

    it('no deja pagar una reserva ya confirmada', async () => {
      const { servicio, prisma } = crearServicio();
      prisma.reserva.findUnique.mockResolvedValue({ ...reservaPendiente, estado: EstadoReserva.CONFIRMADA });
      await expect(servicio.iniciar('CP-ABC234')).rejects.toThrow(ConflictException);
    });

    it('no deja pagar una reserva expirada', async () => {
      const { servicio, prisma } = crearServicio();
      prisma.reserva.findUnique.mockResolvedValue({ ...reservaPendiente, estado: EstadoReserva.EXPIRADA });
      await expect(servicio.iniciar('CP-ABC234')).rejects.toThrow(/ya no está disponible/);
    });
  });

  describe('aplicarTransaccion', () => {
    const tx = { id: '1-2-3', reference: pago.referencia, status: 'APPROVED', amount_in_cents: 45000000, currency: 'COP' };

    it('un pago aprobado confirma la reserva', async () => {
      const { servicio, prisma } = crearServicio();
      prisma.pago.findUnique.mockResolvedValue(pago);
      prisma.reserva.updateMany.mockResolvedValue({ count: 1 });
      prisma.reserva.findUniqueOrThrow.mockResolvedValue({ estado: EstadoReserva.CONFIRMADA });

      const r = await servicio.aplicarTransaccion(tx);

      expect(prisma.pago.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ estado: EstadoPago.APROBADO, idTransaccion: '1-2-3' }) }),
      );
      expect(prisma.reserva.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { estado: EstadoReserva.CONFIRMADA, expiraEn: null } }),
      );
      expect(r).toEqual({ codigo: 'CP-ABC234', estadoPago: 'APROBADO', estadoReserva: 'CONFIRMADA', total: 450000 });
    });

    it('un pago rechazado no confirma la reserva', async () => {
      const { servicio, prisma } = crearServicio();
      prisma.pago.findUnique.mockResolvedValue(pago);
      const r = await servicio.aplicarTransaccion({ ...tx, status: 'DECLINED' });
      expect(prisma.reserva.updateMany).not.toHaveBeenCalled();
      expect(r?.estadoPago).toBe('RECHAZADO');
      expect(r?.estadoReserva).toBe('PENDIENTE_PAGO');
    });

    it('si el monto cobrado no coincide, no toca el pago ni la reserva', async () => {
      const { servicio, prisma } = crearServicio();
      prisma.pago.findUnique.mockResolvedValue(pago);
      const r = await servicio.aplicarTransaccion({ ...tx, amount_in_cents: 100 });
      expect(prisma.pago.update).not.toHaveBeenCalled();
      expect(prisma.reserva.updateMany).not.toHaveBeenCalled();
      expect(r?.estadoPago).toBe('RECHAZADO');
    });

    it('ignora referencias que no son nuestras', async () => {
      const { servicio, prisma } = crearServicio();
      prisma.pago.findUnique.mockResolvedValue(null);
      expect(await servicio.aplicarTransaccion(tx)).toBeUndefined();
    });
  });

  describe('procesarEvento', () => {
    it('rechaza eventos con firma inválida', async () => {
      const { servicio } = crearServicio();
      const falso = {
        event: 'transaction.updated',
        data: { transaction: { id: '1' } },
        signature: { properties: ['transaction.id'], checksum: 'abc' },
        timestamp: 1,
      };
      await expect(servicio.procesarEvento(falso)).rejects.toThrow(UnauthorizedException);
    });

    it('aplica eventos auténticos de transaction.updated', async () => {
      const { servicio, prisma } = crearServicio();
      prisma.pago.findUnique.mockResolvedValue(pago);
      prisma.reserva.updateMany.mockResolvedValue({ count: 1 });
      prisma.reserva.findUniqueOrThrow.mockResolvedValue({ estado: EstadoReserva.CONFIRMADA });
      const transaction = { id: '9-9-9', reference: pago.referencia, status: 'APPROVED', amount_in_cents: 45000000, currency: 'COP' };
      const timestamp = 1761840000;
      const evento = {
        event: 'transaction.updated',
        data: { transaction },
        signature: {
          properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'],
          checksum: sha256(`9-9-9APPROVED45000000${timestamp}test_events_secreto`),
        },
        timestamp,
      };

      await servicio.procesarEvento(evento);
      expect(prisma.reserva.updateMany).toHaveBeenCalled();
    });
  });
});
