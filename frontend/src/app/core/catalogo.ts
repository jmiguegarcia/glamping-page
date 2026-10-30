import { Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';

/** Tipos que devuelve GET /api/catalogo (ver backend/src/catalogo/catalogo.service.ts). */
export type TipoTarifa = 'NOCHE_ENTRE_SEMANA' | 'NOCHE_FIN_DE_SEMANA' | 'DIA_DE_SOL' | 'OCASIONAL';

export interface Alojamiento {
  slug: string;
  nombre: string;
  descripcion: string;
  capacidad: number;
  tarifas: Partial<Record<TipoTarifa, number>>;
}

export interface Servicio {
  slug: string;
  nombre: string;
  descripcion: string;
  precio: number;
}

export interface Catalogo {
  alojamientos: Alojamiento[];
  servicios: Servicio[];
  horarios: {
    estadia: { checkIn: string; checkOut: string; maxNoches: number; diasTarifaFinDeSemana: number[] };
    diaDeSol: { inicio: string; fin: string; dias: number[] };
    ocasional: {
      duracionHoras: number;
      inicioMasTemprano: string;
      finMasTardio: string;
      dias: number[];
      horasInicio: string[];
    };
  };
  politicaCancelacion: { horasMinimas: number; porcentajeReembolso: number }[];
}

/**
 * Catálogo compartido por toda la app. httpResource hace la petición una vez y expone
 * el resultado como signal: `catalogo.datos.value()`. Con SSR, la respuesta viaja del
 * servidor al navegador dentro del HTML, así no se pide dos veces.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoService {
  readonly datos = httpResource<Catalogo>(() => '/api/catalogo');
}
