import { api } from './api';
import type { Empleado, Rol } from '../types';

export interface EmpleadoCreateInput {
  legajo: number;
  nombre: string;
  dni: number;
  cuil: string;
  fecha_ingreso: string; // "YYYY-MM-DD"
  categoria_laboral: string;
  rol: Rol;
  password?: string;
}

export type EmpleadoUpdateInput = Partial<Omit<EmpleadoCreateInput, 'legajo'>>;

export function listEmpleados(filter?: { activo?: boolean }) {
  const qs = filter?.activo !== undefined ? `?activo=${filter.activo}` : '';
  return api<Empleado[]>(`/empleados${qs}`);
}

export function getEmpleado(legajo: number) {
  return api<Empleado>(`/empleados/${legajo}`);
}

export function createEmpleado(input: EmpleadoCreateInput) {
  return api<Empleado>('/empleados', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateEmpleado(legajo: number, input: EmpleadoUpdateInput) {
  return api<Empleado>(`/empleados/${legajo}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function bajaEmpleado(legajo: number) {
  return api<Empleado>(`/empleados/${legajo}/baja`, { method: 'POST' });
}

export function reactivarEmpleado(legajo: number) {
  return api<Empleado>(`/empleados/${legajo}/reactivar`, { method: 'POST' });
}

export function setPasswordEmpleado(legajo: number, password: string) {
  return api<{ ok: boolean }>(`/empleados/${legajo}/set-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}
