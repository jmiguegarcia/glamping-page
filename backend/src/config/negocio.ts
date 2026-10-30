/**
 * Reglas del negocio de Cabaña Primavera en un solo lugar.
 * Cambiar un horario o una política = editar este archivo, sin tocar la lógica.
 *
 * ⚠️ Valores marcados como EJEMPLO: pendientes de confirmar con el negocio.
 * Los precios NO van aquí: viven en la base de datos (tablas tarifas y servicios).
 */

/** Zona horaria del glamping: todas las fechas y plazos se calculan en hora de Colombia. */
export const ZONA_HORARIA = 'America/Bogota';

/**
 * Horarios en formato 24 h ("HH:mm").
 * El día de sol DEBE caber entre el check-out y el check-in: así un mismo día puede
 * tener un día de sol y una estadía que entra en la tarde. La base de datos asume
 * esto para bloquear fechas (ver migración dia_de_sol_y_estadia_mismo_dia) y
 * negocio.spec.ts falla si se rompe.
 */
export const HORARIOS = {
  checkIn: '16:00',
  checkOut: '10:00', // EJEMPLO
  diaDeSol: { inicio: '11:00', fin: '15:00' }, // EJEMPLO
} as const;

/**
 * Noches que se cobran con tarifa de fin de semana, según el día en que EMPIEZA la noche.
 * 0 = domingo, 1 = lunes, ... 5 = viernes, 6 = sábado (igual que Date.getDay()).
 */
export const DIAS_TARIFA_FIN_DE_SEMANA: readonly number[] = [5, 6, 0]; // vie, sáb, dom

/**
 * Política de cancelación: porcentaje que se devuelve según las horas de anticipación
 * respecto al check-in (o al inicio del día de sol). Ordenada de mayor a menor anticipación;
 * se aplica la primera regla que se cumpla. Sin coincidencia = no hay reembolso.
 */
export const POLITICA_CANCELACION: readonly { horasMinimas: number; porcentajeReembolso: number }[] = [
  { horasMinimas: 24, porcentajeReembolso: 100 },
  { horasMinimas: 12, porcentajeReembolso: 50 },
];

/** Minutos que una reserva PENDIENTE_PAGO mantiene las fechas bloqueadas antes de expirar. */
export const MINUTOS_PARA_PAGAR = 30; // EJEMPLO
