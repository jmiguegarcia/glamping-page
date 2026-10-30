-- El día de sol ahora ocupa el rango [D, D+1), igual que "la noche de D".
-- Así una sola restricción de exclusión evita los tres choques posibles:
--   estadía ↔ estadía, estadía ↔ día de sol y día de sol ↔ día de sol.
-- Una estadía que SALE el día D no choca con un día de sol en D
-- (check-out 10:00, día de sol desde 11:00), porque el rango excluye la salida.

DROP INDEX "reservas_un_dia_de_sol_por_fecha";

ALTER TABLE "reservas" DROP CONSTRAINT "reservas_fechas_validas";
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_fechas_validas" CHECK (
  ("tipo" = 'ESTADIA'    AND "fecha_salida" > "fecha_entrada" AND "noches" = "fecha_salida" - "fecha_entrada")
  OR
  ("tipo" = 'DIA_DE_SOL' AND "fecha_salida" = "fecha_entrada" + 1 AND "noches" = 0)
);

ALTER TABLE "reservas" DROP CONSTRAINT "reservas_sin_solapamiento";
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sin_solapamiento"
  EXCLUDE USING gist (
    "alojamiento_id" WITH =,
    daterange("fecha_entrada", "fecha_salida", '[)') WITH &&
  )
  WHERE ("estado" IN ('PENDIENTE_PAGO', 'CONFIRMADA'));
