-- Día de sol (11:00–15:00) y estadía (check-in 16:00, check-out 10:00) pueden
-- compartir fecha. Para que la base de datos lo entienda, cada fecha se divide
-- en dos turnos consecutivos sobre una línea numérica:
--
--   turno de DÍA   de la fecha F = 2 * (F - 2000-01-01)
--   turno de NOCHE de la fecha F = 2 * (F - 2000-01-01) + 1
--
--   Estadía E→S  ocupa [noche de E, día de S)   → no toca el día de E ni el de S
--   Día de sol D ocupa [día de D, noche de D)   → solo el turno de día
--
-- Ejemplo: estadía 26→28 = noche 26, día 27, noche 27.
--   Día de sol 26 ✅  día de sol 27 ⛔  día de sol 28 ✅  estadía 28→29 ✅
--
-- El día de sol se reconoce por noches = 0 (garantizado por reservas_fechas_validas).
-- Supone que el día de sol cabe entre check-out y check-in: src/config/negocio.spec.ts lo verifica.

ALTER TABLE "reservas" DROP CONSTRAINT "reservas_sin_solapamiento";
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sin_solapamiento"
  EXCLUDE USING gist (
    "alojamiento_id" WITH =,
    int4range(
      2 * ("fecha_entrada" - DATE '2000-01-01') + (CASE WHEN "noches" = 0 THEN 0 ELSE 1 END),
      2 * ("fecha_salida"  - DATE '2000-01-01') - (CASE WHEN "noches" = 0 THEN 1 ELSE 0 END),
      '[)'
    ) WITH &&
  )
  WHERE ("estado" IN ('PENDIENTE_PAGO', 'CONFIRMADA'));
