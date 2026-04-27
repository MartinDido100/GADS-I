import * as turnoRepo from '../repositories/turnoRepository.js';
import * as horarioRepo from '../repositories/horarioRepository.js';
import * as empleadoRepo from '../repositories/empleadoRepository.js';
import { HttpError } from '../middleware/errorHandler.js';

export const DIAS_VALIDOS = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'] as const;
export type DiaSemana = (typeof DIAS_VALIDOS)[number];

export function isDiaValido(dia: string): dia is DiaSemana {
  return (DIAS_VALIDOS as readonly string[]).includes(dia);
}

export interface AsignacionInput {
  dia: DiaSemana;
  id_horario: number;
}

export function listTurnosDeEmpleado(legajo: number) {
  return turnoRepo.findByEmpleado(legajo);
}

export async function asignarTurno(legajo: number, dia: DiaSemana, idHorario: number) {
  const empleado = await empleadoRepo.findByLegajo(legajo);
  if (!empleado) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');

  const horario = await horarioRepo.findById(idHorario);
  if (!horario) throw new HttpError(404, 'NOT_FOUND', 'Horario no encontrado');
  if (!horario.activo) {
    throw new HttpError(400, 'HORARIO_INACTIVO', 'No se puede asignar un horario inactivo');
  }
  return turnoRepo.upsertEmpleadoDia(legajo, dia, idHorario);
}

export async function desasignarTurno(legajo: number, dia: DiaSemana) {
  const empleado = await empleadoRepo.findByLegajo(legajo);
  if (!empleado) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  await turnoRepo.deleteEmpleadoDia(legajo, dia);
}

export async function reemplazarSemana(legajo: number, asignaciones: AsignacionInput[]) {
  const empleado = await empleadoRepo.findByLegajo(legajo);
  if (!empleado) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');

  const dias = new Set<string>();
  for (const a of asignaciones) {
    if (dias.has(a.dia)) {
      throw new HttpError(400, 'DUPLICATE_DAY', `Día ${a.dia} duplicado en la asignación`);
    }
    dias.add(a.dia);
    const horario = await horarioRepo.findById(a.id_horario);
    if (!horario) {
      throw new HttpError(404, 'NOT_FOUND', `Horario ${a.id_horario} no encontrado`);
    }
    if (!horario.activo) {
      throw new HttpError(400, 'HORARIO_INACTIVO', `Horario "${horario.descripcion}" está inactivo`);
    }
  }

  await turnoRepo.deleteAllByEmpleado(legajo);
  for (const a of asignaciones) {
    await turnoRepo.upsertEmpleadoDia(legajo, a.dia, a.id_horario);
  }
  return turnoRepo.findByEmpleado(legajo);
}
