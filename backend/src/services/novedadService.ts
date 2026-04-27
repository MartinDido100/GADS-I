import { EstadoNovedad, OrigenNovedad } from '@prisma/client';
import * as repo from '../repositories/novedadRepository.js';
import * as empleadoRepo from '../repositories/empleadoRepository.js';
import { HttpError } from '../middleware/errorHandler.js';
import { calcularNovedades } from './reglasService.js';

export interface ListFilter {
  legajo?: number;
  desde?: string;
  hasta?: string;
  origen?: OrigenNovedad;
  estado?: EstadoNovedad;
}

export function listNovedades(filter: ListFilter = {}) {
  return repo.findAll({
    legajo: filter.legajo,
    desde: filter.desde ? new Date(filter.desde) : undefined,
    hasta: filter.hasta ? new Date(filter.hasta) : undefined,
    origen: filter.origen,
    estado: filter.estado,
  });
}

export async function getNovedad(id: number) {
  const n = await repo.findById(id);
  if (!n) throw new HttpError(404, 'NOT_FOUND', 'Novedad no encontrada');
  return n;
}

export interface NovedadManualInput {
  id_empleado: number;
  fecha: string; // YYYY-MM-DD
  tipo_novedad: number;
  observacion?: string;
}

export async function crearNovedadManual(input: NovedadManualInput) {
  const emp = await empleadoRepo.findByLegajo(input.id_empleado);
  if (!emp) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  if (!emp.activo) throw new HttpError(400, 'EMPLEADO_INACTIVO', 'El empleado no está activo');

  return repo.create({
    id_empleado: input.id_empleado,
    fecha: new Date(input.fecha),
    tipo_novedad: input.tipo_novedad,
    origen: OrigenNovedad.MANUAL,
    estado: EstadoNovedad.PENDIENTE,
    observacion: input.observacion,
  });
}

export async function aprobarNovedad(id: number, observacion?: string) {
  const n = await repo.findById(id);
  if (!n) throw new HttpError(404, 'NOT_FOUND', 'Novedad no encontrada');
  if (n.estado !== EstadoNovedad.PENDIENTE) {
    throw new HttpError(400, 'ESTADO_INVALIDO', 'Solo se pueden aprobar novedades pendientes');
  }
  return repo.updateEstado(id, EstadoNovedad.APROBADA, observacion);
}

export async function rechazarNovedad(id: number, observacion?: string) {
  const n = await repo.findById(id);
  if (!n) throw new HttpError(404, 'NOT_FOUND', 'Novedad no encontrada');
  if (n.estado !== EstadoNovedad.PENDIENTE) {
    throw new HttpError(400, 'ESTADO_INVALIDO', 'Solo se pueden rechazar novedades pendientes');
  }
  return repo.updateEstado(id, EstadoNovedad.RECHAZADA, observacion);
}

export async function eliminarNovedad(id: number) {
  const n = await repo.findById(id);
  if (!n) throw new HttpError(404, 'NOT_FOUND', 'Novedad no encontrada');
  if (n.estado !== EstadoNovedad.PENDIENTE) {
    throw new HttpError(400, 'ESTADO_INVALIDO', 'Solo se pueden eliminar novedades pendientes');
  }
  return repo.deleteNovedad(id);
}

export function listTiposNovedad() {
  return repo.listTiposNovedad();
}

export async function recalcularNovedades(legajo: number, desde: string, hasta: string) {
  const emp = await empleadoRepo.findByLegajo(legajo);
  if (!emp) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');

  const desdeDate = new Date(desde);
  const hastaDate = new Date(hasta);
  if (isNaN(desdeDate.getTime()) || isNaN(hastaDate.getTime())) {
    throw new HttpError(400, 'INVALID_DATE', 'Fechas inválidas');
  }
  if (desdeDate > hastaDate) {
    throw new HttpError(400, 'INVALID_RANGE', 'desde debe ser anterior o igual a hasta');
  }

  return calcularNovedades(legajo, desdeDate, hastaDate);
}
