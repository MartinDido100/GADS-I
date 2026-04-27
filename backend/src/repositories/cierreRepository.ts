import { EstadoCierre } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function findGlobalByPeriodo(periodo: Date) {
  return prisma.cierreMensual.findFirst({
    where: { periodo, id_empleado: null },
  });
}

export async function upsertGlobal(
  periodo: Date,
  data: { estado?: EstadoCierre; ruta_archivo_exportado?: string; fecha_cierre?: Date | null },
) {
  // El input usa `estado` por claridad; lo traducimos al campo real de la DB.
  const dbData = {
    ...(data.estado !== undefined && { estado_borrador_cerrado: data.estado }),
    ...(data.ruta_archivo_exportado !== undefined && { ruta_archivo_exportado: data.ruta_archivo_exportado }),
    ...(data.fecha_cierre !== undefined && { fecha_cierre: data.fecha_cierre }),
  };
  const existing = await prisma.cierreMensual.findFirst({ where: { periodo, id_empleado: null } });
  if (existing) {
    return prisma.cierreMensual.update({ where: { id: existing.id }, data: dbData });
  }
  return prisma.cierreMensual.create({ data: { periodo, ...dbData } });
}

export async function ensureGlobal(periodo: Date) {
  const existing = await prisma.cierreMensual.findFirst({ where: { periodo, id_empleado: null } });
  if (existing) return existing;
  return prisma.cierreMensual.create({
    data: { periodo, estado_borrador_cerrado: EstadoCierre.B },
  });
}

export function listPeriodos() {
  return prisma.cierreMensual.findMany({
    where: { id_empleado: null },
    orderBy: { periodo: 'desc' },
  });
}
