import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Todas las rutas empiezan por /api (ej: /api/salud, /api/reservas)
  app.setGlobalPrefix('api');

  // Permite que el frontend de Angular llame a esta API desde otro puerto
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:4200' });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
