import { EstadoNovedad, OrigenNovedad } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const novedadInclude = {
  tipo: true,
  empleado: { select: { legajo: true, nombre: true } },
} as const;

export interface NovedadFilter {
  legajo?: number;
  desde?: Date;
  hasta?: Date;
  origen?: OrigenNovedad;
  estado?: EstadoNovedad;
  idTipoNovedad?: number;
}

export function findAll(filter: NovedadFilter = {}) {
  return prisma.novedad.findMany({
    where: {
      ...(filter.legajo !== undefined && { id_empleado: filter.legajo }),
      ...(filter.idTipoNovedad !== undefined && { tipo_novedad: filter.idTipoNovedad }),
      ...(filter.origen && { origen: filter.origen }),
      ...(filter.estado && { estado: filter.estado }),
      ...(filter.desde || filter.hasta
        ? {
            fecha: {
              ...(filter.desde && { gte: filter.desde }),
              ...(filter.hasta && { lte: filter.hasta }),
            },
          }
        : {}),
    },
    include: novedadInclude,
    orderBy: [{ fecha: 'desc' }, { id_novedad: 'desc' }],
  });
}

export function findById(id: number) {
  return prisma.novedad.findUnique({ where: { id_novedad: id }, include: novedadInclude });
}

export interface NovedadCreateData {
  id_empleado: number;
  fecha: Date;
  tipo_novedad: number;
  origen: OrigenNovedad;
  estado?: EstadoNovedad;
  observacion?: string;
}

export function create(data: NovedadCreateData) {
  return prisma.novedad.create({
    data: {
      id_empleado: data.id_empleado,
      fecha: data.fecha,
      tipo_novedad: data.tipo_novedad,
      origen: data.origen,
      estado: data.estado ?? EstadoNovedad.PENDIENTE,
      observacion: data.observacion,
    },
    include: novedadInclude,
  });
}

export function updateEstado(id: number, estado: EstadoNovedad, observacion?: string) {
  return prisma.novedad.update({
    where: { id_novedad: id },
    data: { estado, ...(observacion !== undefined && { observacion }) },
    include: novedadInclude,
  });
}

export function deleteNovedad(id: number) {
  return prisma.novedad.delete({ where: { id_novedad: id } });
}

export function findAutosByEmpleadoYPeriodo(legajo: number, desde: Date, hasta: Date) {
  return prisma.novedad.findMany({
    where: {
      id_empleado: legajo,
      origen: OrigenNovedad.AUTOMATICA,
      fecha: { gte: desde, lte: hasta },
    },
    include: novedadInclude,
  });
}

export function deleteAutosByEmpleadoYPeriodo(legajo: number, desde: Date, hasta: Date) {
  return prisma.novedad.deleteMany({
    where: {
      id_empleado: legajo,
      origen: OrigenNovedad.AUTOMATICA,
      estado: EstadoNovedad.PENDIENTE,
      fecha: { gte: desde, lte: hasta },
    },
  });
}

export function listTiposNovedad() {
  return prisma.tipoNovedad.findMany({ orderBy: { id_tipo_novedad: 'asc' } });
}

export function findTipoByDescripcion(descripcion: string) {
  return prisma.tipoNovedad.findUnique({ where: { descripcion } });
}
