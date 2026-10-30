-- Tiempo de limpieza entre reservas: cada reserva bloquea la cabaña desde su
-- inicio hasta bloqueo_hasta = fin + horas de limpieza (src/config/negocio.ts).
-- (La tabla reservas está vacía en este punto, por eso NOT NULL sin valor por defecto.)

-- AlterTable
ALTER TABLE "reservas" ADD COLUMN     "bloqueo_hasta" TIMESTAMPTZ NOT NULL;

-- ─── Reglas escritas a mano ───

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_bloqueo_despues_de_fin" CHECK ("bloqueo_hasta" >= "fin");

-- Ahora el cruce se mide con el bloqueo completo (uso + limpieza). Ejemplo con 2 h:
--   Ocasional 14–18 bloquea [14:00, 20:00) → otro ocasional puede empezar a las 20:00, no a las 18:00.
ALTER TABLE "reservas" DROP CONSTRAINT "reservas_sin_solapamiento";
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sin_solapamiento"
  EXCLUDE USING gist (
    "alojamiento_id" WITH =,
    tstzrange("inicio", "bloqueo_hasta", '[)') WITH &&
  )
  WHERE ("estado" IN ('PENDIENTE_PAGO', 'CONFIRMADA'));
