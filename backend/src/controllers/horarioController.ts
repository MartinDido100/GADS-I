import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as horarioService from '../services/horarioService.js';
import { HttpError } from '../middleware/errorHandler.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const createSchema = z.object({
  descripcion: z.string().min(2).max(80),
  horario_entrada: z.string().regex(HHMM, 'Formato HH:mm'),
  horario_retiro: z.string().regex(HHMM, 'Formato HH:mm'),
  horas_a_trabajar: z.number().int().nonnegative().nullable().default(null),
  tolerancia_entrada: z.number().int().nonnegative().default(0),
  tolerancia_retiro: z.number().int().nonnegative().default(0),
  minutos_minimos_descanso: z.number().int().nonnegative().default(0),
  umbral_horas_extras: z.number().int().nonnegative().default(0),
});

const updateSchema = z.object({
  descripcion: z.string().min(2).max(80).optional(),
  horario_entrada: z.string().regex(HHMM, 'Formato HH:mm').optional(),
  horario_retiro: z.string().regex(HHMM, 'Formato HH:mm').optional(),
  horas_a_trabajar: z.number().int().nonnegative().nullable().optional(),
  tolerancia_entrada: z.number().int().nonnegative().optional(),
  tolerancia_retiro: z.number().int().nonnegative().optional(),
  minutos_minimos_descanso: z.number().int().nonnegative().optional(),
  umbral_horas_extras: z.number().int().nonnegative().optional(),
  activo: z.boolean().optional(),
});

const listQuerySchema = z.object({
  activo: z.enum(['true', 'false']).optional(),
});

function parseId(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, 'INVALID_ID', 'ID inválido');
  }
  return n;
}

export const list: RequestHandler = async (req, res, next) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return next(new HttpError(400, 'INVALID_QUERY', 'Parámetros inválidos'));
  try {
    const horarios = await horarioService.listHorarios({
      activo: parsed.data.activo === undefined ? undefined : parsed.data.activo === 'true',
    });
    res.json(horarios);
  } catch (err) {
    next(err);
  }
};

export const get: RequestHandler = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    res.json(await horarioService.getHorario(id));
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
    const horario = await horarioService.createHorario(parsed.data);
    res.status(201).json(horario);
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
    const id = parseId(req.params.id);
    res.json(await horarioService.updateHorario(id, parsed.data));
  } catch (err) {
    next(err);
  }
};

export const desactivar: RequestHandler = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    res.json(await horarioService.desactivarHorario(id));
  } catch (err) {
    next(err);
  }
};

export const reactivar: RequestHandler = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    res.json(await horarioService.reactivarHorario(id));
  } catch (err) {
    next(err);
  }
};
