import { api } from './api';

export interface TardanzaDetalle {
  fecha: string;
  minutos: number;
}

export interface ResumenEmpleado {
  legajo: number;
  nombre: string;
  categoria_laboral: string;
  dias_trabajados: number;
  tardanzas: TardanzaDetalle[];
  ausencias_injustificadas: number;
  ausencias_justificadas: number;
  horas_extra_50: number;
  horas_extra_100: number;
  salidas_anticipadas: number;
  novedades_aprobadas: number;
}

export interface ResumenPeriodo {
  periodo: string;          // YYYY-MM-DD
  estado: 'B' | 'C';
  fecha_cierre: string | null;
  empleados: ResumenEmpleado[];
  totales: {
    dias_trabajados: number;
    ausencias: number;
    tardanzas: number;
    horas_extra_50: number;
    horas_extra_100: number;
  };
}

export interface PeriodoItem {
  periodo: string;   // YYYY-MM
  estado: 'B' | 'C';
  fecha_cierre: string | null;
}

export function listPeriodos() {
  return api<PeriodoItem[]>('/cierres');
}

export function getResumen(periodo: string) {
  return api<ResumenPeriodo>(`/cierres/${periodo}`);
}

export function cerrarPeriodo(periodo: string) {
  return api<ResumenPeriodo>(`/cierres/${periodo}/cerrar`, { method: 'POST' });
}

export function reabrirPeriodo(periodo: string) {
  return api<ResumenPeriodo>(`/cierres/${periodo}/reabrir`, { method: 'POST' });
}

export function getExportUrl(periodo: string): string {
  const base = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';
  return `${base}/cierres/${periodo}/export`;
}
