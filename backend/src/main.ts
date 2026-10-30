import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas las rutas empiezan por /api (ej: /api/salud, /api/reservas)
  app.setGlobalPrefix('api');

  // Valida cada petición contra su DTO: rechaza campos desconocidos y convierte
  // el JSON en instancias de la clase (aplicando valores por defecto).
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  // Permite que el frontend de Angular llame a esta API desde otro puerto
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://cabana.localhost:4200' });

  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
