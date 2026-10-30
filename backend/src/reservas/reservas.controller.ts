import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CancelarReservaDto } from './dto/cancelar-reserva.dto.js';
import { CotizarDto } from './dto/cotizar.dto.js';
import { CrearReservaDto } from './dto/crear-reserva.dto.js';
import { DisponibilidadDto } from './dto/disponibilidad.dto.js';
import { ReservasService } from './reservas.service.js';

@Controller()
export class ReservasController {
  constructor(private readonly reservas: ReservasService) {}

  // GET /api/disponibilidad?desde=2026-12-01&hasta=2026-12-31
  @Get('disponibilidad')
  disponibilidad(@Query() dto: DisponibilidadDto) {
    return this.reservas.disponibilidad(dto);
  }

  // POST /api/reservas/cotizar — no guarda nada
  @Post('reservas/cotizar')
  @HttpCode(200)
  cotizar(@Body() dto: CotizarDto) {
    return this.reservas.cotizar(dto);
  }

  // POST /api/reservas
  @Post('reservas')
  crear(@Body() dto: CrearReservaDto) {
    return this.reservas.crear(dto);
  }

  // GET /api/reservas/CP-7K3M9Q?email=cliente@correo.com
  @Get('reservas/:codigo')
  consultar(@Param('codigo') codigo: string, @Query() { email }: CancelarReservaDto) {
    return this.reservas.consultar(codigo, email);
  }

  // POST /api/reservas/CP-7K3M9Q/cancelar   { "email": "cliente@correo.com" }
  @Post('reservas/:codigo/cancelar')
  @HttpCode(200)
  cancelar(@Param('codigo') codigo: string, @Body() { email }: CancelarReservaDto) {
    return this.reservas.cancelar(codigo, email);
  }
}
