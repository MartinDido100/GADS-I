import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as turnoService from '../services/turnoService.js';
import { DIAS_VALIDOS } from '../services/turnoService.js';
import { HttpError } from '../middleware/errorHandler.js';

const diaSchema = z.enum(DIAS_VALIDOS);

const asignacionSchema = z.object({
  dia: diaSchema,
  id_horario: z.coerce.number().int().positive(),
});

const reemplazarSchema = z.object({
  asignaciones: z.array(asignacionSchema),
});

function parseLegajo(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HttpError(400, 'INVALID_LEGAJO', 'Legajo inválido');
  }
  return n;
}

export const listDeEmpleado: RequestHandler = async (req, res, next) => {
  try {
    const legajo = parseLegajo(req.params.legajo);
    res.json(await turnoService.listTurnosDeEmpleado(legajo));
  } catch (err) {
    next(err);
  }
};

export const asignar: RequestHandler = async (req, res, next) => {
  const parsed = asignacionSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Input inválido'));
  }
  try {
    const legajo = parseLegajo(req.params.legajo);
    const turno = await turnoService.asignarTurno(legajo, parsed.data.dia, parsed.data.id_horario);
    res.status(201).json(turno);
  } catch (err) {
    next(err);
  }
};

export const reemplazarSemana: RequestHandler = async (req, res, next) => {
  const parsed = reemplazarSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Input inválido'));
  }
  try {
    const legajo = parseLegajo(req.params.legajo);
    const turnos = await turnoService.reemplazarSemana(legajo, parsed.data.asignaciones);
    res.json(turnos);
  } catch (err) {
    next(err);
  }
};

export const desasignar: RequestHandler = async (req, res, next) => {
  const parsed = diaSchema.safeParse(req.params.dia);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', 'Día inválido'));
  }
  try {
    const legajo = parseLegajo(req.params.legajo);
    await turnoService.desasignarTurno(legajo, parsed.data);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
