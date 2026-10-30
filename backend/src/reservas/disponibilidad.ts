/**
 * Disponibilidad día por día, para pintar el calendario del frontend.
 * Función pura: recibe los intervalos ya ocupados y calcula qué se puede reservar.
 *
 * Es una vista previa: la decisión final la toma PostgreSQL al crear la reserva.
 */
import { DIA_DE_SOL, ESTADIA, OCASIONAL } from '../config/negocio.js';
import { diaSemana, diasEntre, formatearFecha, formatearHora, instante, minutosDelDia, seCruzan, sumarDias } from './calendario.js';
import { conLimpieza, horasInicioOcasional } from './cotizacion.js';

/** Intervalo bloqueado por una reserva existente (uso + limpieza). */
export interface Ocupacion {
  inicio: Date;
  bloqueoHasta: Date;
}

export interface DisponibilidadDia {
  fecha: string;
  /** ¿Se puede pasar la noche que empieza este día? (check-in hoy, check-out mañana) */
  noche: boolean;
  diaDeSol: boolean;
  /** Horas de inicio libres para un ocasional este día. */
  ocasional: string[];
}

export function calcularDisponibilidad(
  desde: Date,
  hasta: Date,
  ocupadas: Ocupacion[],
  ahora: Date = new Date(),
): DisponibilidadDia[] {
  // Una reserva nueva también necesita su tiempo de limpieza antes de la siguiente.
  const libre = (inicio: Date, fin: Date) =>
    inicio > ahora && !ocupadas.some((o) => seCruzan(inicio, conLimpieza(fin), o.inicio, o.bloqueoHasta));

  const dias: DisponibilidadDia[] = [];
  for (let i = 0; i <= diasEntre(desde, hasta); i++) {
    const fecha = sumarDias(desde, i);
    const dia = diaSemana(fecha);

    const noche = libre(instante(fecha, ESTADIA.checkIn), instante(sumarDias(fecha, 1), ESTADIA.checkOut));

    const diaDeSol =
      DIA_DE_SOL.dias.includes(dia) && libre(instante(fecha, DIA_DE_SOL.inicio), instante(fecha, DIA_DE_SOL.fin));

    const ocasional = OCASIONAL.dias.includes(dia)
      ? horasInicioOcasional().filter((hora) => {
          const fin = formatearHora(minutosDelDia(hora) + OCASIONAL.duracionHoras * 60);
          return libre(instante(fecha, hora), instante(fecha, fin));
        })
      : [];

    dias.push({ fecha: formatearFecha(fecha), noche, diaDeSol, ocasional });
  }
  return dias;
}
