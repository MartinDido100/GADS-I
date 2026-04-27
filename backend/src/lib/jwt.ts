import jwt from 'jsonwebtoken';
import { env } from './env.js';
import type { Rol } from '@prisma/client';

export interface JwtPayload {
  legajo: number;
  rol: Rol;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
