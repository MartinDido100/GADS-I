import { api } from './api';

export interface Horario {
  id: number;
  descripcion: string;
  horario_entrada: string;
  horario_retiro: string;
  horas_a_trabajar: number | null;
  tolerancia_entrada: number;
  tolerancia_retiro: number;
  minutos_minimos_descanso: number;
  umbral_horas_extras: number;
  activo: boolean;
}

export type DiaSemana = 'LUN' | 'MAR' | 'MIE' | 'JUE' | 'VIE' | 'SAB' | 'DOM';

export interface Turno {
  id: number;
  id_horario: number;
  id_empleado: number;
  dia: DiaSemana;
  horario?: Horario;
}

export interface HorarioInput {
  descripcion: string;
  horario_entrada: string;
  horario_retiro: string;
  horas_a_trabajar: number | null;
  tolerancia_entrada: number;
  tolerancia_retiro: number;
  minutos_minimos_descanso: number;
  umbral_horas_extras: number;
}

export type HorarioUpdateInput = Partial<HorarioInput> & { activo?: boolean };

export interface AsignacionInput {
  dia: DiaSemana;
  id_horario: number;
}

export function listHorarios(filter?: { activo?: boolean }) {
  const qs = filter?.activo !== undefined ? `?activo=${filter.activo}` : '';
  return api<Horario[]>(`/horarios${qs}`);
}

export function createHorario(input: HorarioInput) {
  return api<Horario>('/horarios', { method: 'POST', body: JSON.stringify(input) });
}

export function updateHorario(id: number, input: HorarioUpdateInput) {
  return api<Horario>(`/horarios/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function desactivarHorario(id: number) {
  return api<Horario>(`/horarios/${id}/desactivar`, { method: 'POST' });
}

export function reactivarHorario(id: number) {
  return api<Horario>(`/horarios/${id}/reactivar`, { method: 'POST' });
}

export function listTurnosDeEmpleado(legajo: number) {
  return api<Turno[]>(`/empleados/${legajo}/turnos`);
}

export function reemplazarSemana(legajo: number, asignaciones: AsignacionInput[]) {
  return api<Turno[]>(`/empleados/${legajo}/turnos`, {
    method: 'PUT',
    body: JSON.stringify({ asignaciones }),
  });
}
