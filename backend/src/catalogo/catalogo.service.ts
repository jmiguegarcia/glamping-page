import { Injectable } from '@nestjs/common';
import { DIA_DE_SOL, ESTADIA, OCASIONAL, POLITICA_CANCELACION } from '../config/negocio.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { horasInicioOcasional } from '../reservas/cotizacion.js';

/** Todo lo que el frontend necesita para mostrar precios, horarios y reglas. */
@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  async obtener() {
    const [alojamientos, servicios] = await Promise.all([
      this.prisma.alojamiento.findMany({
        where: { activo: true },
        include: { tarifas: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.servicio.findMany({
        where: { activo: true },
        select: { slug: true, nombre: true, descripcion: true, precio: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    return {
      alojamientos: alojamientos.map((a) => ({
        slug: a.slug,
        nombre: a.nombre,
        descripcion: a.descripcion,
        capacidad: a.capacidad,
        tarifas: Object.fromEntries(a.tarifas.map((t) => [t.tipo, t.precio])),
      })),
      servicios,
      horarios: {
        estadia: ESTADIA,
        diaDeSol: DIA_DE_SOL,
        ocasional: { ...OCASIONAL, horasInicio: horasInicioOcasional() },
      },
      politicaCancelacion: POLITICA_CANCELACION,
    };
  }
}
