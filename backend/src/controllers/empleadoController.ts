import type { RequestHandler } from 'express';
import { z } from 'zod';
import { Rol } from '@prisma/client';
import * as empleadoService from '../services/empleadoService.js';
import { HttpError } from '../middleware/errorHandler.js';

const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe ser YYYY-MM-DD');

const createSchema = z.object({
  legajo: z.coerce.number().int().positive(),
  nombre: z.string().min(2).max(80),
  dni: z.coerce.number().int().positive(),
  cuil: z.string().min(11).max(13),
  fecha_ingreso: fechaIso,
  categoria_laboral: z.string().min(1).max(5),
  rol: z.nativeEnum(Rol),
  activo: z.boolean().optional(),
});

const updateSchema = z.object({
  nombre: z.string().min(2).max(80).optional(),
  dni: z.coerce.number().int().positive().optional(),
  cuil: z.string().min(11).max(13).optional(),
  fecha_ingreso: fechaIso.optional(),
  categoria_laboral: z.string().min(1).max(5).optional(),
  rol: z.nativeEnum(Rol).optional(),
  activo: z.boolean().optional(),
});

const listQuerySchema = z.object({
  activo: z.enum(['true', 'false']).optional(),
});

function parseLegajo(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, 'INVALID_LEGAJO', 'Legajo inválido');
  }
  return n;
}

export const list: RequestHandler = async (req, res, next) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_QUERY', 'Parámetros inválidos'));
  }
  try {
    const empleados = await empleadoService.listEmpleados({
      activo:
        parsed.data.activo === undefined
          ? undefined
          : parsed.data.activo === 'true',
    });
    res.json(empleados);
  } catch (err) {
    next(err);
  }
};

export const get: RequestHandler = async (req, res, next) => {
  try {
    const legajo = parseLegajo(req.params.legajo);
    const empleado = await empleadoService.getEmpleado(legajo);
    res.json(empleado);
  } catch (err) {
    next(err);
  }
};

export const create: RequestHandler = async (req, res, next) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Input inválido'));
  }
  try {
    const empleado = await empleadoService.createEmpleado(parsed.data);
    res.status(201).json(empleado);
  } catch (err) {
    next(err);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Input inválido'));
  }
  try {
    const legajo = parseLegajo(req.params.legajo);
    const empleado = await empleadoService.updateEmpleado(legajo, parsed.data);
    res.json(empleado);
  } catch (err) {
    next(err);
  }
};

export const baja: RequestHandler = async (req, res, next) => {
  try {
    const legajo = parseLegajo(req.params.legajo);
    const empleado = await empleadoService.bajaLogica(legajo);
    res.json(empleado);
  } catch (err) {
    next(err);
  }
};

export const reactivar: RequestHandler = async (req, res, next) => {
  try {
    const legajo = parseLegajo(req.params.legajo);
    const empleado = await empleadoService.reactivar(legajo);
    res.json(empleado);
  } catch (err) {
    next(err);
  }
};
