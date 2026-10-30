import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FechaISO } from '../compartido/fechas';

/** Tipos de GET/POST de backend/src/reservas (ver reservas.service.ts). */
export type TipoReserva = 'ESTADIA' | 'DIA_DE_SOL' | 'OCASIONAL';

export interface DisponibilidadDia {
  fecha: FechaISO;
  noche: boolean;
  diaDeSol: boolean;
  ocasional: string[];
}

export interface SolicitudCotizacion {
  tipo: TipoReserva;
  fechaEntrada: FechaISO;
  fechaSalida?: FechaISO;
  horaInicio?: string;
  huespedes: number;
  servicios: string[];
}

export interface SolicitudReserva extends SolicitudCotizacion {
  nombre: string;
  email: string;
  telefono: string;
  notas?: string;
}

interface LineaServicio {
  slug: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Cotizacion {
  disponible: boolean;
  tipo: TipoReserva;
  fechaEntrada: FechaISO;
  fechaSalida: FechaISO;
  noches: number;
  inicio: string;
  fin: string;
  huespedes: number;
  alojamiento: { concepto: string; precio: number }[];
  subtotalAlojamiento: number;
  servicios: LineaServicio[];
  subtotalServicios: number;
  total: number;
}

export interface ReservaCreada {
  codigo: string;
  estado: string;
  tipo: TipoReserva;
  fechaEntrada: FechaISO;
  fechaSalida: FechaISO;
  noches: number;
  inicio: string;
  fin: string;
  huespedes: number;
  cliente: { nombre: string; email: string; telefono: string };
  servicios: LineaServicio[];
  total: number;
  expiraEn: string | null;
}

export const URL_COTIZAR = '/api/reservas/cotizar';

export function urlDisponibilidad(desde: FechaISO, hasta: FechaISO): string {
  return `/api/disponibilidad?desde=${desde}&hasta=${hasta}`;
}

/** Acciones de reserva que no son lecturas (las lecturas usan httpResource en los componentes). */
@Service()
export class ReservasApi {
  private readonly http = inject(HttpClient);

  crear(solicitud: SolicitudReserva): Promise<ReservaCreada> {
    return firstValueFrom(this.http.post<ReservaCreada>('/api/reservas', solicitud));
  }
}

/**
 * Convierte un error de la API en un mensaje para el cliente.
 * NestJS responde { message: "..." } o, en errores de validación, { message: ["...", "..."] }.
 */
export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';
    const mensaje = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(mensaje)) return mensaje.join('. ');
    if (mensaje) return mensaje;
  }
  return 'Algo salió mal. Inténtalo de nuevo en un momento.';
}
