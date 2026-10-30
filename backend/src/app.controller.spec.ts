import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;
  const prismaFalso = { $queryRaw: vi.fn() };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prismaFalso }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('salud', () => {
    it('reporta ok cuando la base de datos responde', async () => {
      prismaFalso.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      await expect(appController.salud()).resolves.toEqual({ api: 'ok', baseDeDatos: 'ok' });
    });

    it('reporta error cuando la base de datos falla', async () => {
      prismaFalso.$queryRaw.mockRejectedValue(new Error('sin conexión'));
      await expect(appController.salud()).resolves.toEqual({ api: 'ok', baseDeDatos: 'error' });
    });
  });
});
