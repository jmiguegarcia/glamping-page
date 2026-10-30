import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CatalogoModule } from './catalogo/catalogo.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReservasModule } from './reservas/reservas.module.js';

@Module({
  imports: [PrismaModule, CatalogoModule, ReservasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
