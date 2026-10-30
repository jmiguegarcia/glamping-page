-- Id que asigna la pasarela (Wompi) a cada cobro, separado de nuestra referencia.
-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "id_transaccion" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pagos_id_transaccion_key" ON "pagos"("id_transaccion");

