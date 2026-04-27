import * as repo from '../repositories/horarioRepository.js';
import { HttpError } from '../middleware/errorHandler.js';

export interface HorarioInput {
  descripcion: string;
  horario_entrada: string; // "HH:mm"
  horario_retiro: string;  // "HH:mm"
  horas_a_trabajar: number | null;
  tolerancia_entrada: number;
  tolerancia_retiro: number;
  minutos_minimos_descanso: number;
  umbral_horas_extras: number;
}

export type HorarioUpdateInput = Partial<HorarioInput> & { activo?: boolean };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function validarHorarios(entrada: string, retiro: string) {
  if (!HHMM.test(entrada) || !HHMM.test(retiro)) {
    throw new HttpError(400, 'INVALID_INPUT', 'Los horarios deben tener formato HH:mm');
  }
  if (entrada === retiro) {
    throw new HttpError(400, 'INVALID_INPUT', 'El horario de entrada y retiro no pueden ser iguales');
  }
}

export function listHorarios(filter?: { activo?: boolean }) {
  return repo.findAll(filter);
}

export async function getHorario(id: number) {
  const h = await repo.findById(id);
  if (!h) throw new HttpError(404, 'NOT_FOUND', 'Horario no encontrado');
  return h;
}

export async function createHorario(input: HorarioInput) {
  validarHorarios(input.horario_entrada, input.horario_retiro);
  return repo.create({
    descripcion: input.descripcion,
    horario_entrada: input.horario_entrada,
    horario_retiro: input.horario_retiro,
    horas_a_trabajar: input.horas_a_trabajar,
    tolerancia_entrada: input.tolerancia_entrada,
    tolerancia_retiro: input.tolerancia_retiro,
    minutos_minimos_descanso: input.minutos_minimos_descanso,
    umbral_horas_extras: input.umbral_horas_extras,
  });
}

export async function updateHorario(id: number, input: HorarioUpdateInput) {
  const existente = await repo.findById(id);
  if (!existente) throw new HttpError(404, 'NOT_FOUND', 'Horario no encontrado');

  const entrada = input.horario_entrada ?? existente.horario_entrada;
  const retiro = input.horario_retiro ?? existente.horario_retiro;
  validarHorarios(entrada, retiro);

  return repo.update(id, {
    ...(input.descripcion !== undefined && { descripcion: input.descripcion }),
    ...(input.horario_entrada !== undefined && { horario_entrada: input.horario_entrada }),
    ...(input.horario_retiro !== undefined && { horario_retiro: input.horario_retiro }),
    ...(input.horas_a_trabajar !== undefined && { horas_a_trabajar: input.horas_a_trabajar }),
    ...(input.tolerancia_entrada !== undefined && { tolerancia_entrada: input.tolerancia_entrada }),
    ...(input.tolerancia_retiro !== undefined && { tolerancia_retiro: input.tolerancia_retiro }),
    ...(input.minutos_minimos_descanso !== undefined && { minutos_minimos_descanso: input.minutos_minimos_descanso }),
    ...(input.umbral_horas_extras !== undefined && { umbral_horas_extras: input.umbral_horas_extras }),
    ...(input.activo !== undefined && { activo: input.activo }),
  });
}

export async function desactivarHorario(id: number) {
  const existente = await repo.findById(id);
  if (!existente) throw new HttpError(404, 'NOT_FOUND', 'Horario no encontrado');
  // No bloqueamos si tiene turnos asignados — sólo lo dejamos inactivo.
  // Los turnos existentes siguen siendo válidos para fichadas pasadas.
  return repo.setActivo(id, false);
}

export async function reactivarHorario(id: number) {
  const existente = await repo.findById(id);
  if (!existente) throw new HttpError(404, 'NOT_FOUND', 'Horario no encontrado');
  return repo.setActivo(id, true);
}
