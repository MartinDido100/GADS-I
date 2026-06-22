import type { RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler.js';
import * as demoService from '../services/demoService.js';

export const estado: RequestHandler = (_req, res) => {
  res.json(demoService.estadoReloj());
};

const avanzarSchema = z.object({
  // Atajos legibles; al menos uno debe ser > 0. Se suman todos.
  dias: z.coerce.number().int().min(0).optional(),
  horas: z.coerce.number().int().min(0).optional(),
  minutos: z.coerce.number().int().min(0).optional(),
});

export const avanzar: RequestHandler = async (req, res, next) => {
  const parsed = avanzarSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', 'Indicá dias, horas o minutos'));
  }
  const { dias = 0, horas = 0, minutos = 0 } = parsed.data;
  const ms = ((dias * 24 + horas) * 60 + minutos) * 60_000;
  if (ms <= 0) {
    return next(new HttpError(400, 'INVALID_INPUT', 'El avance debe ser mayor a cero'));
  }
  try {
    res.json(await demoService.avanzarReloj(ms));
  } catch (err) {
    next(err);
  }
};

const fijarSchema = z.object({
  // Instante absoluto en hora local del negocio (YYYY-MM-DDTHH:mm) o ISO completo.
  fecha: z.string().min(10),
});

export const fijar: RequestHandler = async (req, res, next) => {
  const parsed = fijarSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', 'fecha requerida (YYYY-MM-DDTHH:mm)'));
  }
  const target = new Date(parsed.data.fecha);
  if (Number.isNaN(target.getTime())) {
    return next(new HttpError(400, 'INVALID_INPUT', 'Fecha inválida'));
  }
  try {
    res.json(await demoService.fijarReloj(target));
  } catch (err) {
    next(err);
  }
};

export const reset: RequestHandler = (_req, res) => {
  res.json(demoService.resetReloj());
};
