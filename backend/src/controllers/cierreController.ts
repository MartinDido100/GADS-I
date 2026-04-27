import { Request, Response, NextFunction } from 'express';
import * as service from '../services/cierreService.js';
import { HttpError } from '../middleware/errorHandler.js';

function getPeriodo(req: Request): string {
  const p = req.params['periodo'];
  if (!p || !/^\d{4}-\d{2}$/.test(p)) {
    throw new HttpError(400, 'INVALID_PERIODO', 'El período debe tener formato YYYY-MM');
  }
  return p;
}

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.listPeriodos());
  } catch (e) { next(e); }
}

export async function resumen(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.getResumenPeriodo(getPeriodo(req)));
  } catch (e) { next(e); }
}

export async function cerrar(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.cerrarPeriodo(getPeriodo(req)));
  } catch (e) { next(e); }
}

export async function reabrir(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.reabrirPeriodo(getPeriodo(req)));
  } catch (e) { next(e); }
}

export async function exportCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const periodo = getPeriodo(req);
    const csv = await service.exportarCSV(periodo);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cierre-${periodo}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
}
