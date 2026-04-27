import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const empleadoSelect = {
  legajo: true,
  nombre: true,
  dni: true,
  cuil: true,
  fecha_ingreso: true,
  categoria_laboral: true,
  activo: true,
  rol: true,
} as const;

export function findAll(filter?: { activo?: boolean }) {
  return prisma.empleado.findMany({
    where: filter?.activo === undefined ? undefined : { activo: filter.activo },
    orderBy: { legajo: 'asc' },
    select: empleadoSelect,
  });
}

export function findByLegajo(legajo: number) {
  return prisma.empleado.findUnique({
    where: { legajo },
    select: empleadoSelect,
  });
}

export function create(data: Prisma.EmpleadoCreateInput) {
  return prisma.empleado.create({ data, select: empleadoSelect });
}

export function update(legajo: number, data: Prisma.EmpleadoUpdateInput) {
  return prisma.empleado.update({ where: { legajo }, data, select: empleadoSelect });
}

export function setActivo(legajo: number, activo: boolean) {
  return prisma.empleado.update({
    where: { legajo },
    data: { activo },
    select: empleadoSelect,
  });
}

export function existsByDni(dni: number, excludeLegajo?: number) {
  return prisma.empleado.findFirst({
    where: { dni, ...(excludeLegajo ? { NOT: { legajo: excludeLegajo } } : {}) },
    select: { legajo: true },
  });
}

export function existsByCuil(cuil: string, excludeLegajo?: number) {
  return prisma.empleado.findFirst({
    where: { cuil, ...(excludeLegajo ? { NOT: { legajo: excludeLegajo } } : {}) },
    select: { legajo: true },
  });
}

export function existsByLegajo(legajo: number) {
  return prisma.empleado.findUnique({ where: { legajo }, select: { legajo: true } });
}
