import { Controller, Get } from '@nestjs/common';
import { CatalogoService } from './catalogo.service.js';

@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  // GET /api/catalogo
  @Get()
  obtener() {
    return this.catalogo.obtener();
  }
}
