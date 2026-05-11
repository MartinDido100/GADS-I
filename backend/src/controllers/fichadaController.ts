import type { RequestHandler } from 'express';
import { z } from 'zod';
import { EntradaSalida, OrigenFichada } from '@prisma/client';
import * as fichadaService from '../services/fichadaService.js';
import { HttpError } from '../middleware/errorHandler.js';

const createSchema = z.object({
  id_empleado: z.coerce.number().int().positive(),
  timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)),
  entrada_salida: z.nativeEnum(EntradaSalida),
  origen: z.nativeEnum(OrigenFichada),
});

const correccionSchema = z.object({
  timestamp: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)),
  entrada_salida: z.nativeEnum(EntradaSalida),
});

const listQuerySchema = z.object({
  legajo: z.coerce.number().int().positive().optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
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
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_QUERY', 'Parámetros inválidos'));
  }
  try {
    // Empleado: solo puede ver sus propias fichadas.
    const filter = { ...parsed.data };
    if (req.user!.rol === 'EMPLEADO') {
      filter.legajo = req.user!.legajo;
    }
    const fichadas = await fichadaService.listFichadas(filter);
    res.json(fichadas);
  } catch (err) {
    next(err);
  }
};

export const get: RequestHandler = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const f = await fichadaService.getFichada(id);
    if (req.user!.rol === 'EMPLEADO' && f.id_empleado !== req.user!.legajo) {
      return next(new HttpError(403, 'FORBIDDEN', 'No podés ver fichadas de otros empleados'));
    }
    res.json(f);
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
    // El admin registra a nombre de un empleado; queda trazabilidad.
    const fichada = await fichadaService.registrarFichada({
      ...parsed.data,
      legajo_usuario_carga: req.user!.legajo,
    });
    res.status(201).json(fichada);
  } catch (err) {
    next(err);
  }
};

export const biometrico: RequestHandler = async (req, res, next) => {
  const parsed = z.object({ legajo: z.coerce.number().int().positive() }).safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', 'legajo requerido'));
  }
  try {
    const fichada = await fichadaService.registrarBiometrico(parsed.data.legajo);
    res.status(201).json(fichada);
  } catch (err) {
    next(err);
  }
};

export const corregir: RequestHandler = async (req, res, next) => {
  const parsed = correccionSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Input inválido'));
  }
  try {
    const identidad = parseId(req.params.id);
    const original = await fichadaService.getFichada(identidad);
    const correccion = await fichadaService.corregirFichada(
      identidad,
      {
        id_empleado: original.id_empleado,
        timestamp: parsed.data.timestamp,
        entrada_salida: parsed.data.entrada_salida,
        origen: OrigenFichada.MANUAL,
      },
      req.user!.legajo,
    );
    res.status(201).json(correccion);
  } catch (err) {
    next(err);
  }
};
