import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

export interface EstadoSalud {
  api: 'ok';
  baseDeDatos: 'ok' | 'error';
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  /** Comprueba que la API responde y que PostgreSQL acepta consultas. */
  async salud(): Promise<EstadoSalud> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { api: 'ok', baseDeDatos: 'ok' };
    } catch {
      return { api: 'ok', baseDeDatos: 'error' };
    }
  }
}
