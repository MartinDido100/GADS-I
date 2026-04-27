-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('EMPLEADO', 'ADMINISTRADOR', 'CONTADOR');

-- CreateEnum
CREATE TYPE "EntradaSalida" AS ENUM ('E', 'S');

-- CreateEnum
CREATE TYPE "OrigenFichada" AS ENUM ('BIOMETRICO', 'MANUAL', 'QR', 'API');

-- CreateEnum
CREATE TYPE "EstadoCierre" AS ENUM ('B', 'C');

-- CreateEnum
CREATE TYPE "EstadoNovedad" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "OrigenNovedad" AS ENUM ('AUTOMATICA', 'MANUAL');

-- CreateTable
CREATE TABLE "Empleado" (
    "legajo" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" INTEGER NOT NULL,
    "cuil" TEXT NOT NULL,
    "fecha_ingreso" DATE NOT NULL,
    "categoria_laboral" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "rol" "Rol" NOT NULL DEFAULT 'EMPLEADO',
    "password_hash" TEXT,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("legajo")
);

-- CreateTable
CREATE TABLE "Biometria" (
    "id_empleado" INTEGER NOT NULL,
    "huella" TEXT,
    "facial" TEXT,
    "codigo_fichaje" TEXT,

    CONSTRAINT "Biometria_pkey" PRIMARY KEY ("id_empleado")
);

-- CreateTable
CREATE TABLE "Horario" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "horario_entrada" TEXT NOT NULL,
    "horario_retiro" TEXT NOT NULL,
    "horas_a_trabajar" INTEGER,
    "tolerancia_entrada" INTEGER NOT NULL DEFAULT 0,
    "tolerancia_retiro" INTEGER NOT NULL DEFAULT 0,
    "minutos_minimos_descanso" INTEGER NOT NULL DEFAULT 0,
    "umbral_horas_extras" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" SERIAL NOT NULL,
    "id_horario" INTEGER NOT NULL,
    "id_empleado" INTEGER NOT NULL,
    "dia" TEXT NOT NULL,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fichada" (
    "identidad" SERIAL NOT NULL,
    "id_empleado" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "entrada_salida" "EntradaSalida" NOT NULL,
    "origen" "OrigenFichada" NOT NULL,
    "legajo_usuario_carga" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "id_correccion" INTEGER,

    CONSTRAINT "Fichada_pkey" PRIMARY KEY ("identidad")
);

-- CreateTable
CREATE TABLE "TipoNovedad" (
    "id_tipo_novedad" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "TipoNovedad_pkey" PRIMARY KEY ("id_tipo_novedad")
);

-- CreateTable
CREATE TABLE "Novedad" (
    "id_novedad" SERIAL NOT NULL,
    "id_empleado" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo_novedad" INTEGER NOT NULL,
    "origen" "OrigenNovedad" NOT NULL,
    "estado" "EstadoNovedad" NOT NULL DEFAULT 'PENDIENTE',
    "observacion" TEXT,

    CONSTRAINT "Novedad_pkey" PRIMARY KEY ("id_novedad")
);

-- CreateTable
CREATE TABLE "CierreMensual" (
    "id" SERIAL NOT NULL,
    "id_empleado" INTEGER,
    "periodo" DATE NOT NULL,
    "fecha_cierre" TIMESTAMP(3),
    "estado_borrador_cerrado" "EstadoCierre" NOT NULL DEFAULT 'B',
    "ruta_archivo_exportado" TEXT,

    CONSTRAINT "CierreMensual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_dni_key" ON "Empleado"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Empleado_cuil_key" ON "Empleado"("cuil");

-- CreateIndex
CREATE UNIQUE INDEX "Turno_id_empleado_dia_key" ON "Turno"("id_empleado", "dia");

-- CreateIndex
CREATE INDEX "Fichada_id_empleado_timestamp_idx" ON "Fichada"("id_empleado", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "TipoNovedad_descripcion_key" ON "TipoNovedad"("descripcion");

-- CreateIndex
CREATE INDEX "Novedad_id_empleado_fecha_idx" ON "Novedad"("id_empleado", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "CierreMensual_id_empleado_periodo_key" ON "CierreMensual"("id_empleado", "periodo");

-- AddForeignKey
ALTER TABLE "Biometria" ADD CONSTRAINT "Biometria_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "Empleado"("legajo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_id_horario_fkey" FOREIGN KEY ("id_horario") REFERENCES "Horario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "Empleado"("legajo") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichada" ADD CONSTRAINT "Fichada_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "Empleado"("legajo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichada" ADD CONSTRAINT "Fichada_legajo_usuario_carga_fkey" FOREIGN KEY ("legajo_usuario_carga") REFERENCES "Empleado"("legajo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fichada" ADD CONSTRAINT "Fichada_id_correccion_fkey" FOREIGN KEY ("id_correccion") REFERENCES "Fichada"("identidad") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Novedad" ADD CONSTRAINT "Novedad_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "Empleado"("legajo") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Novedad" ADD CONSTRAINT "Novedad_tipo_novedad_fkey" FOREIGN KEY ("tipo_novedad") REFERENCES "TipoNovedad"("id_tipo_novedad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CierreMensual" ADD CONSTRAINT "CierreMensual_id_empleado_fkey" FOREIGN KEY ("id_empleado") REFERENCES "Empleado"("legajo") ON DELETE SET NULL ON UPDATE CASCADE;
