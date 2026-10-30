/**
 * Cálculo de horarios y precios de una reserva. Funciones puras: no tocan la base de
 * datos, reciben los precios como parámetro. Así se prueban sin PostgreSQL.
 */
import { BadRequestException } from '@nestjs/common';
import { DIA_DE_SOL, ESTADIA, HORAS_LIMPIEZA, OCASIONAL } from '../config/negocio.js';
import { TipoReserva, TipoTarifa } from '../generated/prisma/enums.js';
import {
  diaSemana,
  diasEntre,
  fechaLegible,
  formatearHora,
  instante,
  minutosDelDia,
  nombreDia,
  parsearFecha,
  sumarDias,
} from './calendario.js';

export interface SolicitudCotizacion {
  tipo: TipoReserva;
  fechaEntrada: string; // "AAAA-MM-DD"
  fechaSalida?: string; // solo estadía
  horaInicio?: string; // solo ocasional, "HH:mm"
  huespedes: number;
  servicios: string[]; // slugs
}

/** Precios vigentes, leídos de la base de datos por quien llama. */
export interface Catalogo {
  capacidad: number;
  tarifas: Partial<Record<TipoTarifa, number>>;
  servicios: { slug: string; nombre: string; precio: number }[];
}

export interface LineaAlojamiento {
  concepto: string; // "Noche del viernes 11 de diciembre"
  tarifa: TipoTarifa;
  precio: number;
}

export interface LineaServicio {
  slug: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Cotizacion {
  tipo: TipoReserva;
  fechaEntrada: Date;
  fechaSalida: Date;
  noches: number;
  inicio: Date;
  fin: Date;
  /** fin + tiempo de limpieza: hasta aquí la cabaña no admite otra reserva. */
  bloqueoHasta: Date;
  huespedes: number;
  alojamiento: LineaAlojamiento[];
  subtotalAlojamiento: number;
  servicios: LineaServicio[];
  subtotalServicios: number;
  total: number;
}

/** Instantes [inicio, fin) que ocupa una reserva, más su detalle de cobro de alojamiento. */
interface Horario {
  fechaSalida: Date;
  noches: number;
  inicio: Date;
  fin: Date;
  alojamiento: LineaAlojamiento[];
}

export function cotizar(sol: SolicitudCotizacion, catalogo: Catalogo, ahora: Date = new Date()): Cotizacion {
  const fechaEntrada = parsearFecha(sol.fechaEntrada);
  if (!fechaEntrada) throw new BadRequestException('La fecha de entrada no es válida.');

  if (sol.huespedes < 1 || sol.huespedes > catalogo.capacidad) {
    throw new BadRequestException(`La cabaña admite máximo ${catalogo.capacidad} personas.`);
  }

  const horario = calcularHorario(sol, fechaEntrada, catalogo);

  if (horario.inicio <= ahora) {
    throw new BadRequestException('Ese horario ya pasó. Elige una fecha u hora futura.');
  }

  const servicios = calcularServicios(sol.servicios, horario.noches, catalogo);
  const subtotalAlojamiento = suma(horario.alojamiento.map((l) => l.precio));
  const subtotalServicios = suma(servicios.map((s) => s.subtotal));

  return {
    tipo: sol.tipo,
    fechaEntrada,
    ...horario,
    bloqueoHasta: conLimpieza(horario.fin),
    huespedes: sol.huespedes,
    subtotalAlojamiento,
    servicios,
    subtotalServicios,
    total: subtotalAlojamiento + subtotalServicios,
  };
}

function calcularHorario(sol: SolicitudCotizacion, entrada: Date, catalogo: Catalogo): Horario {
  switch (sol.tipo) {
    case TipoReserva.ESTADIA:
      return horarioEstadia(sol, entrada, catalogo);
    case TipoReserva.DIA_DE_SOL:
      return horarioDiaDeSol(entrada, catalogo);
    case TipoReserva.OCASIONAL:
      return horarioOcasional(sol, entrada, catalogo);
  }
}

function horarioEstadia(sol: SolicitudCotizacion, entrada: Date, catalogo: Catalogo): Horario {
  const salida = sol.fechaSalida ? parsearFecha(sol.fechaSalida) : null;
  if (!salida) throw new BadRequestException('La fecha de salida no es válida.');

  const noches = diasEntre(entrada, salida);
  if (noches < 1) throw new BadRequestException('La salida debe ser al menos un día después de la entrada.');
  if (noches > ESTADIA.maxNoches) {
    throw new BadRequestException(`La estadía máxima es de ${ESTADIA.maxNoches} noches.`);
  }

  const alojamiento: LineaAlojamiento[] = [];
  for (let i = 0; i < noches; i++) {
    const fecha = sumarDias(entrada, i);
    const dia = diaSemana(fecha);
    const tarifa = ESTADIA.diasTarifaFinDeSemana.includes(dia)
      ? TipoTarifa.NOCHE_FIN_DE_SEMANA
      : TipoTarifa.NOCHE_ENTRE_SEMANA;
    alojamiento.push({
      concepto: `Noche del ${fechaLegible(fecha)}`,
      tarifa,
      precio: precioTarifa(catalogo, tarifa),
    });
  }

  return {
    fechaSalida: salida,
    noches,
    inicio: instante(entrada, ESTADIA.checkIn),
    fin: instante(salida, ESTADIA.checkOut),
    alojamiento,
  };
}

function horarioDiaDeSol(fecha: Date, catalogo: Catalogo): Horario {
  if (!DIA_DE_SOL.dias.includes(diaSemana(fecha))) {
    throw new BadRequestException(`El día de sol solo está disponible ${listarDias(DIA_DE_SOL.dias)}.`);
  }
  return {
    fechaSalida: fecha,
    noches: 0,
    inicio: instante(fecha, DIA_DE_SOL.inicio),
    fin: instante(fecha, DIA_DE_SOL.fin),
    alojamiento: [
      {
        concepto: `Día de sol del ${fechaLegible(fecha)}`,
        tarifa: TipoTarifa.DIA_DE_SOL,
        precio: precioTarifa(catalogo, TipoTarifa.DIA_DE_SOL),
      },
    ],
  };
}

function horarioOcasional(sol: SolicitudCotizacion, fecha: Date, catalogo: Catalogo): Horario {
  if (!OCASIONAL.dias.includes(diaSemana(fecha))) {
    throw new BadRequestException(`El ocasional solo está disponible ${listarDias(OCASIONAL.dias)}.`);
  }
  if (!sol.horaInicio || !horasInicioOcasional().includes(sol.horaInicio)) {
    throw new BadRequestException(
      `Elige una hora de inicio en punto entre ${horasInicioOcasional()[0]} y ${horasInicioOcasional().at(-1)}.`,
    );
  }
  const fin = formatearHora(minutosDelDia(sol.horaInicio) + OCASIONAL.duracionHoras * 60);
  return {
    fechaSalida: fecha,
    noches: 0,
    inicio: instante(fecha, sol.horaInicio),
    fin: instante(fecha, fin),
    alojamiento: [
      {
        concepto: `Ocasional del ${fechaLegible(fecha)}, ${sol.horaInicio}–${fin}`,
        tarifa: TipoTarifa.OCASIONAL,
        precio: precioTarifa(catalogo, TipoTarifa.OCASIONAL),
      },
    ],
  };
}

/** Momento hasta el que una reserva que termina en `fin` bloquea la cabaña. */
export function conLimpieza(fin: Date): Date {
  return new Date(fin.getTime() + HORAS_LIMPIEZA * 60 * 60 * 1000);
}

/** Horas en punto en que puede empezar un ocasional: ["14:00", ..., "20:00"]. */
export function horasInicioOcasional(): string[] {
  const primera = minutosDelDia(OCASIONAL.inicioMasTemprano);
  const ultima = minutosDelDia(OCASIONAL.finMasTardio) - OCASIONAL.duracionHoras * 60;
  const horas: string[] = [];
  for (let m = primera; m <= ultima; m += 60) horas.push(formatearHora(m));
  return horas;
}

function calcularServicios(slugs: string[], noches: number, catalogo: Catalogo): LineaServicio[] {
  // En estadía se cobra por noche; en día de sol y ocasional, una vez.
  const cantidad = Math.max(noches, 1);
  return [...new Set(slugs)].map((slug) => {
    const servicio = catalogo.servicios.find((s) => s.slug === slug);
    if (!servicio) throw new BadRequestException(`El servicio "${slug}" no existe o no está disponible.`);
    return {
      slug,
      nombre: servicio.nombre,
      precioUnitario: servicio.precio,
      cantidad,
      subtotal: servicio.precio * cantidad,
    };
  });
}

function precioTarifa(catalogo: Catalogo, tarifa: TipoTarifa): number {
  const precio = catalogo.tarifas[tarifa];
  // Falta de configuración en la base de datos, no error del cliente → 500.
  if (precio === undefined) throw new Error(`No hay tarifa ${tarifa} configurada para este alojamiento.`);
  return precio;
}

function listarDias(dias: readonly number[]): string {
  if (dias.length === 7) return 'todos los días';
  const nombres = dias.map(nombreDia);
  return nombres.length === 1 ? `los ${nombres[0]}` : `los ${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`;
}

const suma = (valores: number[]) => valores.reduce((a, b) => a + b, 0);
