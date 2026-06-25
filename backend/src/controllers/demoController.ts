import type { RequestHandler } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/errorHandler.js';
import * as demoService from '../services/demoService.js';
import { TZ_OFFSET_MIN } from '../lib/tz.js';

// Convierte la fecha del input a un instante absoluto (UTC).
//
// El frontend manda hora LOCAL del negocio (UTC-3) sin zona, como produce un
// <input type="datetime-local">: "YYYY-MM-DDTHH:mm". Si la pasáramos directo a
// `new Date()`, el server (que corre en UTC) la leería como UTC y la demo
// quedaría corrida TZ_OFFSET horas. Por eso, si la fecha NO trae zona, la
// interpretamos como hora local y restamos el offset para obtener el UTC real
// (09:25 ARG → 12:25 UTC). Una fecha con `Z` o `±HH:mm` se respeta tal cual.
function parseFechaLocal(fecha: string): Date {
  const s = fecha.trim();
  const tieneZona = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  if (tieneZona) return new Date(s);

  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return new Date(NaN);
  const [, fechaIso, hh = '00', mm = '00'] = m;
  // Construimos el instante como si la hora local fuera UTC, y luego corregimos
  // por el offset del negocio para obtener el UTC verdadero.
  const comoUtc = Date.parse(`${fechaIso}T${hh}:${mm}:00Z`);
  return new Date(comoUtc - TZ_OFFSET_MIN * 60_000);
}

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
  const target = parseFechaLocal(parsed.data.fecha);
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
