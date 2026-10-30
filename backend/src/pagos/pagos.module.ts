import { Module } from '@nestjs/common';
import { ReservasModule } from '../reservas/reservas.module.js';
import { PagosController } from './pagos.controller.js';
import { PagosService } from './pagos.service.js';

@Module({
  imports: [ReservasModule],
  controllers: [PagosController],
  providers: [PagosService],
})
export class PagosModule {}
