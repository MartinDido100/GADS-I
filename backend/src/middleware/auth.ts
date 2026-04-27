import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Rol } from '@prisma/client';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';
import { HttpError } from './errorHandler.js';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'NO_TOKEN', 'Falta el token de autenticación'));
  }
  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new HttpError(401, 'INVALID_TOKEN', 'Token inválido o expirado'));
  }
};

export function requireRole(...roles: Rol[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError(401, 'NO_AUTH', 'No autenticado'));
    }
    if (!roles.includes(req.user.rol)) {
      return next(new HttpError(403, 'FORBIDDEN', 'No tenés permisos para esta acción'));
    }
    next();
  };
}
