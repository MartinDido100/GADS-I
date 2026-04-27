import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function login(legajo: number, password: string) {
  const empleado = await prisma.empleado.findUnique({ where: { legajo } });
  if (!empleado) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Legajo o contraseña incorrectos');
  }
  if (!empleado.activo) {
    throw new HttpError(403, 'INACTIVE_USER', 'El empleado está inactivo');
  }
  if (!empleado.password_hash) {
    throw new HttpError(403, 'NO_PASSWORD', 'El usuario aún no tiene contraseña configurada');
  }

  const ok = await bcrypt.compare(password, empleado.password_hash);
  if (!ok) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Legajo o contraseña incorrectos');
  }

  const token = signToken({ legajo: empleado.legajo, rol: empleado.rol });
  return {
    token,
    empleado: {
      legajo: empleado.legajo,
      nombre: empleado.nombre,
      rol: empleado.rol,
    },
  };
}

export async function getMe(legajo: number) {
  const empleado = await prisma.empleado.findUnique({
    where: { legajo },
    select: {
      legajo: true,
      nombre: true,
      dni: true,
      cuil: true,
      fecha_ingreso: true,
      categoria_laboral: true,
      activo: true,
      rol: true,
    },
  });
  if (!empleado) {
    throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  }
  return empleado;
}

export async function changePassword(legajo: number, actual: string, nueva: string) {
  const empleado = await prisma.empleado.findUnique({ where: { legajo } });
  if (!empleado || !empleado.password_hash) {
    throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  }
  const ok = await bcrypt.compare(actual, empleado.password_hash);
  if (!ok) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'La contraseña actual es incorrecta');
  }
  const password_hash = await bcrypt.hash(nueva, 10);
  await prisma.empleado.update({ where: { legajo }, data: { password_hash } });
}
