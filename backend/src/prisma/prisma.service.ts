import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * Cliente de base de datos compartido por toda la app.
 * Cualquier servicio puede pedirlo en su constructor:
 *   constructor(private prisma: PrismaService) {}
 * La conexión se abre en la primera consulta.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
