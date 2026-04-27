import { prisma } from '../lib/prisma.js';

const turnoInclude = {
  horario: true,
  empleado: {
    select: { legajo: true, nombre: true, activo: true },
  },
} as const;

export function findByEmpleado(legajo: number) {
  return prisma.turno.findMany({
    where: { id_empleado: legajo },
    include: { horario: true },
    orderBy: { dia: 'asc' },
  });
}

export function findByHorario(idHorario: number) {
  return prisma.turno.findMany({
    where: { id_horario: idHorario },
    include: turnoInclude,
    orderBy: [{ id_empleado: 'asc' }, { dia: 'asc' }],
  });
}

export function findById(id: number) {
  return prisma.turno.findUnique({ where: { id }, include: turnoInclude });
}

export function upsertEmpleadoDia(
  idEmpleado: number,
  dia: string,
  idHorario: number,
) {
  return prisma.turno.upsert({
    where: { uq_empleado_dia: { id_empleado: idEmpleado, dia } },
    update: { id_horario: idHorario },
    create: { id_empleado: idEmpleado, dia, id_horario: idHorario },
    include: { horario: true },
  });
}

export function deleteEmpleadoDia(idEmpleado: number, dia: string) {
  return prisma.turno.deleteMany({
    where: { id_empleado: idEmpleado, dia },
  });
}

export function deleteAllByEmpleado(idEmpleado: number) {
  return prisma.turno.deleteMany({ where: { id_empleado: idEmpleado } });
}

export function getHorarioParaEmpleadoYDia(idEmpleado: number, dia: string) {
  return prisma.turno.findUnique({
    where: { uq_empleado_dia: { id_empleado: idEmpleado, dia } },
    include: { horario: true },
  });
}
