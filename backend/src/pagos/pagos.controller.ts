import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { PagosService } from './pagos.service.js';

class IniciarPagoDto {
  @IsString()
  @Matches(/^CP-[A-Z0-9]{6}$/i, { message: 'codigo no es válido' })
  codigo: string;
}

@Controller('pagos')
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  // POST /api/pagos/iniciar   { "codigo": "CP-7K3M9Q" }  →  { urlCheckout }
  @Post('iniciar')
  @HttpCode(200)
  iniciar(@Body() { codigo }: IniciarPagoDto) {
    return this.pagos.iniciar(codigo);
  }

  // GET /api/pagos/wompi/transacciones/:id  — la usa la página a la que vuelve el cliente
  @Get('wompi/transacciones/:id')
  consultar(@Param('id') id: string) {
    return this.pagos.consultarTransaccion(id);
  }

  // POST /api/pagos/wompi/eventos  — URL de eventos que se configura en el dashboard de Wompi.
  // Wompi espera un 200; si recibe otro código, reintenta más tarde.
  @Post('wompi/eventos')
  @HttpCode(200)
  async eventos(@Body() evento: unknown) {
    await this.pagos.procesarEvento(evento);
    return { recibido: true };
  }
}
