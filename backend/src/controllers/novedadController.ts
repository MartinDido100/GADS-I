import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EstadoNovedad, OrigenNovedad } from '@prisma/client';
import * as service from '../services/novedadService.js';
import { HttpError } from '../middleware/errorHandler.js';

const listSchema = z.object({
  legajo:   z.coerce.number().int().positive().optional(),
  desde:    z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  hasta:    z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional(),
  origen:   z.enum(['AUTOMATICA', 'MANUAL']).optional(),
  estado:   z.enum(['PENDIENTE', 'APROBADA', 'RECHAZADA']).optional(),
});

const crearSchema = z.object({
  id_empleado:  z.number().int().positive(),
  fecha:        z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  tipo_novedad: z.number().int().positive(),
  observacion:  z.string().optional(),
});

const estadoSchema = z.object({
  observacion: z.string().optional(),
});

const recalcularSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listSchema.safeParse(req.query);
    if (!query.success) throw new HttpError(400, 'INVALID_INPUT', query.error.issues[0]?.message ?? 'Input inválido');

    // EMPLEADO solo ve sus propias novedades.
    const filter = { ...query.data };
    if (req.user!.rol === 'EMPLEADO') filter.legajo = req.user!.legajo;

    res.json(await service.listNovedades(filter));
  } catch (e) { next(e); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params['id']);
    if (!Number.isInteger(id)) throw new HttpError(400, 'INVALID_ID', 'ID inválido');
    const n = await service.getNovedad(id);
    if (req.user!.rol === 'EMPLEADO' && n.id_empleado !== req.user!.legajo) {
      throw new HttpError(403, 'FORBIDDEN', 'No tenés acceso a esta novedad');
    }
    res.json(n);
  } catch (e) { next(e); }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = crearSchema.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'INVALID_INPUT', body.error.issues[0]?.message ?? 'Input inválido');

    // EMPLEADO solo puede crear novedad de sí mismo (justificativo).
    if (req.user!.rol === 'EMPLEADO' && body.data.id_empleado !== req.user!.legajo) {
      throw new HttpError(403, 'FORBIDDEN', 'Solo podés crear novedades para vos mismo');
    }
    res.status(201).json(await service.crearNovedadManual(body.data));
  } catch (e) { next(e); }
}

export async function aprobar(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params['id']);
    const body = estadoSchema.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'INVALID_INPUT', 'Input inválido');
    res.json(await service.aprobarNovedad(id, body.data.observacion));
  } catch (e) { next(e); }
}

export async function rechazar(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params['id']);
    const body = estadoSchema.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'INVALID_INPUT', 'Input inválido');
    res.json(await service.rechazarNovedad(id, body.data.observacion));
  } catch (e) { next(e); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params['id']);
    const n = await service.getNovedad(id);
    if (req.user!.rol === 'EMPLEADO' && n.id_empleado !== req.user!.legajo) {
      throw new HttpError(403, 'FORBIDDEN', 'No tenés acceso a esta novedad');
    }
    await service.eliminarNovedad(id);
    res.status(204).end();
  } catch (e) { next(e); }
}

export async function tiposNovedad(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listTiposNovedad());
  } catch (e) { next(e); }
}

export async function recalcular(req: Request, res: Response, next: NextFunction) {
  try {
    const legajo = Number(req.params['legajo']);
    if (!Number.isInteger(legajo)) throw new HttpError(400, 'INVALID_ID', 'Legajo inválido');
    const body = recalcularSchema.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'INVALID_INPUT', body.error.issues[0]?.message ?? 'Input inválido');
    res.json(await service.recalcularNovedades(legajo, body.data.desde, body.data.hasta));
  } catch (e) { next(e); }
}
