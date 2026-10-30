/**
 * Utilidades de fechas y horas en hora de Colombia.
 *
 * Convención: una "fecha" (sin hora) se representa como Date a medianoche UTC,
 * que es como Prisma lee y escribe las columnas @db.Date. Un "instante" es un Date
 * real con hora, calculado en hora de Colombia.
 */
import { ZONA_HORARIA } from '../config/negocio.js';

// Colombia no tiene horario de verano: siempre UTC−5.
const DESFASE_COLOMBIA = '-05:00';
const MS_POR_DIA = 24 * 60 * 60 * 1000;

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** "2026-12-24" → Date (medianoche UTC). Devuelve null si el texto no es una fecha real. */
export function parsearFecha(texto: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const fecha = new Date(`${texto}T00:00:00Z`);
  // Descarta fechas imposibles como 2026-02-30 (JS las "corrige" al mes siguiente).
  return formatearFecha(fecha) === texto ? fecha : null;
}

/** Date (medianoche UTC) → "2026-12-24". */
export function formatearFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * MS_POR_DIA);
}

export function diasEntre(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / MS_POR_DIA);
}

/** 0 = domingo ... 6 = sábado. */
export function diaSemana(fecha: Date): number {
  return fecha.getUTCDay();
}

export function nombreDia(dia: number): string {
  return NOMBRES_DIAS[dia];
}

/** "14:30" → 870. Acepta "24:00" (= 1440, medianoche al final del día). */
export function minutosDelDia(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 870 → "14:30". */
export function formatearHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Instante de una fecha a cierta hora de Colombia. "24:00" = 00:00 del día siguiente. */
export function instante(fecha: Date, hhmm: string): Date {
  const medianoche = Date.parse(`${formatearFecha(fecha)}T00:00:00${DESFASE_COLOMBIA}`);
  return new Date(medianoche + minutosDelDia(hhmm) * 60 * 1000);
}

/** Fecha actual en Colombia (medianoche UTC), sin importar la zona del servidor. */
export function hoyEnColombia(ahora: Date = new Date()): Date {
  // 'en-CA' formatea como AAAA-MM-DD.
  const texto = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(ahora);
  return new Date(`${texto}T00:00:00Z`);
}

/** ¿Los intervalos [a1, a2) y [b1, b2) comparten algún instante? Misma regla que PostgreSQL. */
export function seCruzan(a1: Date, a2: Date, b1: Date, b2: Date): boolean {
  return a1 < b2 && b1 < a2;
}
