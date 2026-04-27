import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as authService from '../services/authService.js';
import { HttpError } from '../middleware/errorHandler.js';

const loginSchema = z.object({
  legajo: z.coerce.number().int().positive(),
  password: z.string().min(1),
});

export const login: RequestHandler = async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', 'Legajo y contraseña son obligatorios'));
  }
  try {
    const result = await authService.login(parsed.data.legajo, parsed.data.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const me: RequestHandler = async (req, res, next) => {
  try {
    const empleado = await authService.getMe(req.user!.legajo);
    res.json(empleado);
  } catch (err) {
    next(err);
  }
};

const changePasswordSchema = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

export const changePassword: RequestHandler = async (req, res, next) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new HttpError(400, 'INVALID_INPUT', parsed.error.issues[0]?.message ?? 'Input inválido'));
  }
  try {
    await authService.changePassword(req.user!.legajo, parsed.data.actual, parsed.data.nueva);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
