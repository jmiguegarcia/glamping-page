import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// @Global: PrismaService queda disponible en todos los módulos sin importarlo de nuevo.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
