-- CreateEnum
CREATE TYPE "TipoTarifa" AS ENUM ('NOCHE_ENTRE_SEMANA', 'NOCHE_FIN_DE_SEMANA', 'DIA_DE_SOL');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('PENDIENTE_PAGO', 'CONFIRMADA', 'CANCELADA', 'EXPIRADA', 'COMPLETADA');

-- CreateEnum
CREATE TYPE "TipoReserva" AS ENUM ('ESTADIA', 'DIA_DE_SOL');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('COBRO', 'REEMBOLSO');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'ANULADO');

-- CreateTable
CREATE TABLE "alojamientos" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alojamientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarifas" (
    "id" SERIAL NOT NULL,
    "alojamiento_id" INTEGER NOT NULL,
    "tipo" "TipoTarifa" NOT NULL,
    "precio" INTEGER NOT NULL,

    CONSTRAINT "tarifas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precio" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoReserva" NOT NULL DEFAULT 'ESTADIA',
    "alojamiento_id" INTEGER NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "fecha_entrada" DATE NOT NULL,
    "fecha_salida" DATE NOT NULL,
    "noches" INTEGER NOT NULL,
    "huespedes" INTEGER NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "notas" TEXT,
    "subtotal_alojamiento" INTEGER NOT NULL,
    "subtotal_servicios" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "expira_en" TIMESTAMP(3),
    "cancelada_en" TIMESTAMP(3),
    "monto_reembolso" INTEGER,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas_servicios" (
    "reserva_id" INTEGER NOT NULL,
    "servicio_id" INTEGER NOT NULL,
    "precio_unitario" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "reservas_servicios_pkey" PRIMARY KEY ("reserva_id","servicio_id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "reserva_id" INTEGER NOT NULL,
    "tipo" "TipoPago" NOT NULL DEFAULT 'COBRO',
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "monto" INTEGER NOT NULL,
    "proveedor" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "respuesta" JSONB,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alojamientos_slug_key" ON "alojamientos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tarifas_alojamiento_id_tipo_key" ON "tarifas"("alojamiento_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_slug_key" ON "servicios"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_codigo_key" ON "reservas"("codigo");

-- CreateIndex
CREATE INDEX "reservas_alojamiento_id_fecha_entrada_fecha_salida_idx" ON "reservas"("alojamiento_id", "fecha_entrada", "fecha_salida");

-- CreateIndex
CREATE UNIQUE INDEX "pagos_referencia_key" ON "pagos"("referencia");

-- AddForeignKey
ALTER TABLE "tarifas" ADD CONSTRAINT "tarifas_alojamiento_id_fkey" FOREIGN KEY ("alojamiento_id") REFERENCES "alojamientos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_alojamiento_id_fkey" FOREIGN KEY ("alojamiento_id") REFERENCES "alojamientos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_servicios" ADD CONSTRAINT "reservas_servicios_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas_servicios" ADD CONSTRAINT "reservas_servicios_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Reglas escritas a mano (Prisma no sabe generarlas desde schema.prisma)
-- ─────────────────────────────────────────────────────────────────────────────

-- Fechas coherentes con el tipo de reserva:
--   estadía    → la salida es posterior a la entrada y noches = días entre ambas
--   día de sol → mismo día de entrada y salida, 0 noches
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_fechas_validas" CHECK (
  ("tipo" = 'ESTADIA'    AND "fecha_salida" > "fecha_entrada" AND "noches" = "fecha_salida" - "fecha_entrada")
  OR
  ("tipo" = 'DIA_DE_SOL' AND "fecha_salida" = "fecha_entrada" AND "noches" = 0)
);

-- btree_gist permite combinar "=" (mismo alojamiento) con "&&" (rangos que se cruzan)
-- en una sola restricción de exclusión.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Sin reservas dobles: dos estadías ACTIVAS del mismo alojamiento no pueden
-- cruzarse en fechas. El rango '[)' incluye la entrada y excluye la salida, así
-- que alguien puede entrar el mismo día que otro sale.
-- Las canceladas/expiradas/completadas no bloquean fechas.
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sin_solapamiento"
  EXCLUDE USING gist (
    "alojamiento_id" WITH =,
    daterange("fecha_entrada", "fecha_salida", '[)') WITH &&
  )
  WHERE ("tipo" = 'ESTADIA' AND "estado" IN ('PENDIENTE_PAGO', 'CONFIRMADA'));

-- Un solo día de sol activo por alojamiento y fecha.
CREATE UNIQUE INDEX "reservas_un_dia_de_sol_por_fecha"
  ON "reservas" ("alojamiento_id", "fecha_entrada")
  WHERE ("tipo" = 'DIA_DE_SOL' AND "estado" IN ('PENDIENTE_PAGO', 'CONFIRMADA'));
