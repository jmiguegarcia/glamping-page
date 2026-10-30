-- Nuevo tipo de reserva/tarifa OCASIONAL y bloqueo por horas exactas.
-- (La tabla reservas está vacía en este punto, por eso las columnas pueden ser NOT NULL sin valor por defecto.)

-- AlterEnum
ALTER TYPE "TipoReserva" ADD VALUE 'OCASIONAL';

-- AlterEnum
ALTER TYPE "TipoTarifa" ADD VALUE 'OCASIONAL';

-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "fin" TIMESTAMPTZ NOT NULL,
ADD COLUMN     "inicio" TIMESTAMPTZ NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reglas escritas a mano
-- ─────────────────────────────────────────────────────────────────────────────

-- Fechas coherentes con el tipo. Ahora día de sol y ocasional usan entrada = salida.
-- (No se nombra 'OCASIONAL' aquí: PostgreSQL no permite usar un valor de enum
--  en la misma transacción en que se crea. "<> 'ESTADIA'" cubre ambos tipos.)
ALTER TABLE "reservas" DROP CONSTRAINT "reservas_fechas_validas";
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_fechas_validas" CHECK (
  ("tipo" = 'ESTADIA'  AND "fecha_salida" > "fecha_entrada" AND "noches" = "fecha_salida" - "fecha_entrada")
  OR
  ("tipo" <> 'ESTADIA' AND "fecha_salida" = "fecha_entrada" AND "noches" = 0)
);

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_inicio_antes_de_fin" CHECK ("inicio" < "fin");

-- Sin reservas que se crucen: dos reservas ACTIVAS del mismo alojamiento no pueden
-- compartir ni un instante. '[)' incluye el inicio y excluye el fin, así una
-- reserva puede empezar exactamente cuando termina otra.
--   Estadía 10→12      = [10 16:00, 12 11:00)
--   Día de sol 12      = [12 08:00, 12 14:00)  → choca con la estadía (sale 11:00)
--   Ocasional 12 14-18 = [12 14:00, 12 18:00)  → no choca con el día de sol
-- Los horarios viven en src/config/negocio.ts; cambiarlos no requiere migración.
ALTER TABLE "reservas" DROP CONSTRAINT "reservas_sin_solapamiento";
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sin_solapamiento"
  EXCLUDE USING gist (
    "alojamiento_id" WITH =,
    tstzrange("inicio", "fin", '[)') WITH &&
  )
  WHERE ("estado" IN ('PENDIENTE_PAGO', 'CONFIRMADA'));
