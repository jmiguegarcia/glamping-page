import { calcularReembolso } from './cancelacion.js';

const INICIO = new Date('2026-12-10T21:00:00Z');
const horasAntes = (h: number) => new Date(INICIO.getTime() - h * 60 * 60 * 1000);

describe('política de cancelación', () => {
  it.each([
    [48, 100, 400_000],
    [24, 100, 400_000], // justo 24 h: todavía reembolso total
    [23.9, 50, 200_000],
    [12, 50, 200_000],
    [11.9, 0, 0],
    [-1, 0, 0], // ya empezó
  ])('con %s h de anticipación devuelve %s%%', (horas, porcentaje, monto) => {
    const r = calcularReembolso(400_000, INICIO, horasAntes(horas));
    expect(r.porcentaje).toBe(porcentaje);
    expect(r.monto).toBe(monto);
  });
});
