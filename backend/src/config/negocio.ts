/**
 * Reglas del negocio de Cabaña Primavera en un solo lugar.
 * Cambiar un horario o una política = editar este archivo, sin tocar la lógica
 * ni la base de datos (las reservas guardan su inicio/fin exactos al crearse).
 *
 * ⚠️ Valores marcados como EJEMPLO: pendientes de confirmar con el negocio.
 * Los precios NO van aquí: viven en la base de datos (tablas tarifas y servicios).
 */

/** Zona horaria del glamping: todas las fechas y plazos se calculan en hora de Colombia. */
export const ZONA_HORARIA = 'America/Bogota';

/** Días de la semana como en Date.getDay(): 0 = domingo, 1 = lunes, ... 6 = sábado. */
const TODOS_LOS_DIAS = [0, 1, 2, 3, 4, 5, 6] as const;
const LUNES_A_VIERNES = [1, 2, 3, 4, 5] as const;

/** Estadía de una o más noches. Horarios en formato 24 h ("HH:mm"). */
export const ESTADIA = {
  checkIn: '16:00',
  checkOut: '11:00',
  maxNoches: 14, // EJEMPLO

  /** Noches con tarifa de fin de semana, según el día en que EMPIEZA la noche. */
  diasTarifaFinDeSemana: [5, 6, 0] as readonly number[], // vie, sáb, dom
} as const;

/** Pasadía sin noche. Choca con una estadía que sale ese día (check-out 11:00). */
export const DIA_DE_SOL = {
  inicio: '08:00',
  fin: '14:00',
  dias: LUNES_A_VIERNES as readonly number[],
} as const;

/**
 * Bloque de horas del sitio. El cliente elige la hora de inicio; el bloque completo
 * debe quedar dentro de [inicioMasTemprano, finMasTardio]. "24:00" = medianoche.
 * Choca con una estadía que entra ese día (check-in 16:00).
 */
export const OCASIONAL = {
  duracionHoras: 4,
  inicioMasTemprano: '14:00',
  finMasTardio: '24:00',
  dias: TODOS_LOS_DIAS as readonly number[],
} as const;

/**
 * Horas para limpiar y organizar la cabaña después de CUALQUIER reserva. Durante ese
 * tiempo no puede empezar otra. Ej.: con 2 h, tras un ocasional 14–18 el siguiente
 * puede empezar a las 20:00; tras un día de sol (fin 14:00), desde las 16:00.
 */
export const HORAS_LIMPIEZA = 2; // EJEMPLO

/**
 * Política de cancelación: porcentaje que se devuelve según las horas de anticipación
 * respecto al inicio de la reserva. Ordenada de mayor a menor anticipación; se aplica
 * la primera regla que se cumpla. Sin coincidencia = no hay reembolso.
 */
export const POLITICA_CANCELACION: readonly { horasMinimas: number; porcentajeReembolso: number }[] = [
  { horasMinimas: 24, porcentajeReembolso: 100 },
  { horasMinimas: 12, porcentajeReembolso: 50 },
];

/** Minutos que una reserva PENDIENTE_PAGO mantiene el horario bloqueado antes de expirar. */
export const MINUTOS_PARA_PAGAR = 30; // EJEMPLO
