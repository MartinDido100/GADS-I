import { Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as repo from '../repositories/empleadoRepository.js';
import { HttpError } from '../middleware/errorHandler.js';

export interface EmpleadoInput {
  legajo: number;
  nombre: string;
  dni: number;
  cuil: string;
  fecha_ingreso: string; // "YYYY-MM-DD"
  categoria_laboral: string;
  rol: Rol;
  activo?: boolean;
  password?: string;
}

export type EmpleadoUpdateInput = Partial<Omit<EmpleadoInput, 'legajo'>>;

export function listEmpleados(filter?: { activo?: boolean }) {
  return repo.findAll(filter);
}

export async function getEmpleado(legajo: number) {
  const empleado = await repo.findByLegajo(legajo);
  if (!empleado) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  return empleado;
}

export async function createEmpleado(input: EmpleadoInput) {
  if (await repo.existsByLegajo(input.legajo)) {
    throw new HttpError(409, 'LEGAJO_EXISTS', `Ya existe un empleado con legajo ${input.legajo}`);
  }
  if (await repo.existsByDni(input.dni)) {
    throw new HttpError(409, 'DNI_EXISTS', `Ya existe un empleado con DNI ${input.dni}`);
  }
  if (await repo.existsByCuil(input.cuil)) {
    throw new HttpError(409, 'CUIL_EXISTS', `Ya existe un empleado con CUIL ${input.cuil}`);
  }
  const password_hash = input.password ? await bcrypt.hash(input.password, 10) : undefined;
  return repo.create({
    legajo: input.legajo,
    nombre: input.nombre,
    dni: input.dni,
    cuil: input.cuil,
    fecha_ingreso: new Date(input.fecha_ingreso),
    categoria_laboral: input.categoria_laboral,
    rol: input.rol,
    activo: input.activo ?? true,
    ...(password_hash && { password_hash }),
  });
}

export async function updateEmpleado(legajo: number, input: EmpleadoUpdateInput) {
  const existente = await repo.findByLegajo(legajo);
  if (!existente) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');

  if (input.dni !== undefined && input.dni !== existente.dni) {
    if (await repo.existsByDni(input.dni, legajo)) {
      throw new HttpError(409, 'DNI_EXISTS', `Ya existe un empleado con DNI ${input.dni}`);
    }
  }
  if (input.cuil !== undefined && input.cuil !== existente.cuil) {
    if (await repo.existsByCuil(input.cuil, legajo)) {
      throw new HttpError(409, 'CUIL_EXISTS', `Ya existe un empleado con CUIL ${input.cuil}`);
    }
  }

  return repo.update(legajo, {
    ...(input.nombre !== undefined && { nombre: input.nombre }),
    ...(input.dni !== undefined && { dni: input.dni }),
    ...(input.cuil !== undefined && { cuil: input.cuil }),
    ...(input.fecha_ingreso !== undefined && { fecha_ingreso: new Date(input.fecha_ingreso) }),
    ...(input.categoria_laboral !== undefined && { categoria_laboral: input.categoria_laboral }),
    ...(input.rol !== undefined && { rol: input.rol }),
    ...(input.activo !== undefined && { activo: input.activo }),
  });
}

export async function bajaLogica(legajo: number) {
  const existente = await repo.findByLegajo(legajo);
  if (!existente) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  return repo.setActivo(legajo, false);
}

export async function reactivar(legajo: number) {
  const existente = await repo.findByLegajo(legajo);
  if (!existente) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  return repo.setActivo(legajo, true);
}

export async function setPassword(legajo: number, password: string) {
  const existente = await repo.findByLegajo(legajo);
  if (!existente) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  const hash = await bcrypt.hash(password, 10);
  await repo.updatePasswordHash(legajo, hash);
}
