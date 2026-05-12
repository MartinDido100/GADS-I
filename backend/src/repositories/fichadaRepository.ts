import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const fichadaInclude = {
  empleado: { select: { legajo: true, nombre: true } },
  usuario_carga: { select: { legajo: true, nombre: true } },
} as const;

export interface FichadaFilter {
  legajo?: number;
  desde?: Date;
  hasta?: Date;
  soloActivas?: boolean;
}

export function findAll(filter: FichadaFilter = {}) {
  const where: Prisma.FichadaWhereInput = {};
  if (filter.legajo !== undefined) where.id_empleado = filter.legajo;
  if (filter.soloActivas) where.activo = true;
  if (filter.desde || filter.hasta) {
    where.timestamp = {
      ...(filter.desde && { gte: filter.desde }),
      ...(filter.hasta && { lte: filter.hasta }),
    };
  }

  return prisma.fichada.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    include: fichadaInclude,
  });
}

export function findById(identidad: number) {
  return prisma.fichada.findUnique({
    where: { identidad },
    include: fichadaInclude,
  });
}

export function create(data: Prisma.FichadaCreateInput) {
  return prisma.fichada.create({ data, include: fichadaInclude });
}

export function marcarInactiva(identidad: number) {
  return prisma.fichada.update({
    where: { identidad },
    data: { activo: false },
    include: fichadaInclude,
  });
}

export function findUltimaFichadaDelDia(legajo: number, fecha: Date) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(23, 59, 59, 999);

  return prisma.fichada.findFirst({
    where: {
      id_empleado: legajo,
      activo: true,
      timestamp: { gte: inicio, lte: fin },
      origen: { not: 'ALMUERZO' }, // el almuerzo no afecta el toggle E/S biométrico
    },
    orderBy: { timestamp: 'desc' },
  });
}
