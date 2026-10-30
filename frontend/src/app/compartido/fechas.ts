/**
 * Fechas sin hora como texto "AAAA-MM-DD", igual que las maneja la API.
 * Por dentro se usa Date a medianoche UTC para que la zona horaria del navegador
 * nunca corra un día hacia atrás o hacia adelante.
 */
export type FechaISO = string;

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const ZONA_COLOMBIA = 'America/Bogota';

const aFecha = (iso: FechaISO) => new Date(`${iso}T00:00:00Z`);
const aISO = (fecha: Date): FechaISO => fecha.toISOString().slice(0, 10);

export function sumarDias(iso: FechaISO, dias: number): FechaISO {
  return aISO(new Date(aFecha(iso).getTime() + dias * MS_POR_DIA));
}

export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / MS_POR_DIA);
}

/** 0 = domingo ... 6 = sábado. */
export function diaSemana(iso: FechaISO): number {
  return aFecha(iso).getUTCDay();
}

/** Fecha de hoy en Colombia, sin importar la zona horaria del dispositivo. */
export function hoyEnColombia(ahora: Date = new Date()): FechaISO {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_COLOMBIA }).format(ahora); // en-CA = AAAA-MM-DD
}

/** "2026-12-24" → "2026-12-01" */
export function inicioDeMes(iso: FechaISO): FechaISO {
  return `${iso.slice(0, 7)}-01`;
}

/** Suma meses a un inicio de mes: ("2026-12-01", 1) → "2027-01-01" */
export function sumarMeses(mes: FechaISO, meses: number): FechaISO {
  const fecha = aFecha(mes);
  return aISO(new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth() + meses, 1)));
}

export function finDeMes(mes: FechaISO): FechaISO {
  return sumarDias(sumarMeses(mes, 1), -1);
}

const formatoMes = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatoLargo = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const formatoCorto = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "2026-12-01" → "diciembre de 2026" */
export function nombreMes(mes: FechaISO): string {
  return formatoMes.format(aFecha(mes));
}

/** "2026-12-10" → "jueves, 10 de diciembre" */
export function fechaLarga(iso: FechaISO): string {
  return formatoLargo.format(aFecha(iso));
}

/** "2026-12-10" → "jue, 10 dic" */
export function fechaCorta(iso: FechaISO): string {
  return formatoCorto.format(aFecha(iso));
}

/**
 * Semanas del mes para pintar un calendario que empieza en lunes.
 * Los huecos antes del día 1 y después del último día son null.
 */
export function semanasDelMes(mes: FechaISO): (FechaISO | null)[][] {
  const huecosIniciales = (diaSemana(mes) + 6) % 7; // lunes = 0
  const dias: (FechaISO | null)[] = Array(huecosIniciales).fill(null);
  for (let f = mes; f <= finDeMes(mes); f = sumarDias(f, 1)) dias.push(f);
  while (dias.length % 7) dias.push(null);

  const semanas: (FechaISO | null)[][] = [];
  for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7));
  return semanas;
}
