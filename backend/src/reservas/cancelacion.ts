import { POLITICA_CANCELACION } from '../config/negocio.js';

export interface Reembolso {
  horasDeAnticipacion: number;
  porcentaje: number;
  monto: number;
}

/**
 * Aplica la política de cancelación: cuánto se devuelve de lo pagado según cuántas
 * horas faltan para el inicio de la reserva.
 */
export function calcularReembolso(montoPagado: number, inicio: Date, ahora: Date = new Date()): Reembolso {
  const horasDeAnticipacion = (inicio.getTime() - ahora.getTime()) / (60 * 60 * 1000);
  const regla = POLITICA_CANCELACION.find((r) => horasDeAnticipacion >= r.horasMinimas);
  const porcentaje = regla?.porcentajeReembolso ?? 0;
  return {
    horasDeAnticipacion,
    porcentaje,
    monto: Math.round((montoPagado * porcentaje) / 100),
  };
}
