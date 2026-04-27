import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export function findAll(filter?: { activo?: boolean }) {
  return prisma.horario.findMany({
    where: filter?.activo === undefined ? undefined : { activo: filter.activo },
    orderBy: { id: 'asc' },
  });
}

export function findById(id: number) {
  return prisma.horario.findUnique({ where: { id } });
}

export function create(data: Prisma.HorarioCreateInput) {
  return prisma.horario.create({ data });
}

export function update(id: number, data: Prisma.HorarioUpdateInput) {
  return prisma.horario.update({ where: { id }, data });
}

export function setActivo(id: number, activo: boolean) {
  return prisma.horario.update({ where: { id }, data: { activo } });
}

export function countTurnosUsando(id: number) {
  return prisma.turno.count({ where: { id_horario: id } });
}
