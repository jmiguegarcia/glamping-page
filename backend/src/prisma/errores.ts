import { Prisma } from '../generated/prisma/client.js';

/** Código de error original de PostgreSQL dentro de un error de Prisma (ej. "23P01"). */
export function codigoPostgres(e: unknown): string | undefined {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  const meta = e.meta as { driverAdapterError?: { cause?: { originalCode?: string } } } | undefined;
  return meta?.driverAdapterError?.cause?.originalCode;
}

/** PostgreSQL rechazó la fila por la restricción reservas_sin_solapamiento. */
export const CRUCE_DE_HORARIO = '23P01';
