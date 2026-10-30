import { calcularDisponibilidad } from './disponibilidad.js';

// Estas pruebas asumen HORAS_LIMPIEZA = 2 (src/config/negocio.ts).
const AHORA = new Date('2026-11-01T12:00:00Z');
const fecha = (s: string) => new Date(`${s}T00:00:00Z`);
/** Intervalo bloqueado, en hora Colombia: "2026-12-09T14:00" → con desfase −05:00. */
const bloqueo = (inicio: string, hasta: string) => ({
  inicio: new Date(`${inicio}:00-05:00`),
  bloqueoHasta: new Date(`${hasta}:00-05:00`),
});

// Estadía del jueves 10 al sábado 12 de diciembre: 10 16:00 → 12 11:00, + 2 h de limpieza.
const estadia = bloqueo('2026-12-10T16:00', '2026-12-12T13:00');
const TODAS_LAS_HORAS = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

describe('calcularDisponibilidad', () => {
  const dias = calcularDisponibilidad(fecha('2026-12-09'), fecha('2026-12-12'), [estadia], AHORA);
  const dia = (f: string) => dias.find((d) => d.fecha === f)!;

  it('devuelve un registro por día, incluyendo ambos extremos', () => {
    expect(dias.map((d) => d.fecha)).toEqual(['2026-12-09', '2026-12-10', '2026-12-11', '2026-12-12']);
  });

  it('el día anterior está totalmente libre', () => {
    expect(dia('2026-12-09')).toEqual({ fecha: '2026-12-09', noche: true, diaDeSol: true, ocasional: TODAS_LAS_HORAS });
  });

  it('el día de entrada: día de sol sí (14:00 + 2 h de limpieza = 16:00), noche y ocasional no', () => {
    expect(dia('2026-12-10')).toEqual({ fecha: '2026-12-10', noche: false, diaDeSol: true, ocasional: [] });
  });

  it('un día con la estadía en curso está ocupado', () => {
    expect(dia('2026-12-11')).toEqual({ fecha: '2026-12-11', noche: false, diaDeSol: false, ocasional: [] });
  });

  it('el día de salida (11:00 + 2 h): noche y ocasional libres; día de sol no porque es sábado', () => {
    expect(dia('2026-12-12')).toEqual({ fecha: '2026-12-12', noche: true, diaDeSol: false, ocasional: TODAS_LAS_HORAS });
  });

  it('tras un ocasional 14–18 el siguiente puede empezar a las 20:00 (2 h para limpiar)', () => {
    const [d] = calcularDisponibilidad(fecha('2026-12-09'), fecha('2026-12-09'), [bloqueo('2026-12-09T14:00', '2026-12-09T20:00')], AHORA);
    expect(d.ocasional).toEqual(['20:00']);
    expect(d.noche).toBe(false);
  });

  it('tras un día de sol el ocasional puede empezar desde las 16:00', () => {
    const [d] = calcularDisponibilidad(fecha('2026-12-09'), fecha('2026-12-09'), [bloqueo('2026-12-09T08:00', '2026-12-09T16:00')], AHORA);
    expect(d.ocasional).toEqual(['16:00', '17:00', '18:00', '19:00', '20:00']);
    expect(d.noche).toBe(true);
  });

  it('un ocasional no puede terminar sin dejar 2 h libres antes de la siguiente reserva', () => {
    // Ocasional ya reservado 20–24: el último inicio posible antes es 14:00 (14–18 + 2 h = 20:00).
    const [d] = calcularDisponibilidad(fecha('2026-12-09'), fecha('2026-12-09'), [bloqueo('2026-12-09T20:00', '2026-12-10T02:00')], AHORA);
    expect(d.ocasional).toEqual(['14:00']);
  });

  it('lo que ya pasó no está disponible', () => {
    const [d] = calcularDisponibilidad(fecha('2026-11-01'), fecha('2026-11-01'), [], AHORA); // 07:00 en Colombia
    expect(d.diaDeSol).toBe(false);
    expect(d.noche).toBe(true);
  });
});
