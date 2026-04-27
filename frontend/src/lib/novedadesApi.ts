import { api } from './api';

export type EstadoNovedad = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
export type OrigenNovedad = 'AUTOMATICA' | 'MANUAL';

export interface TipoNovedad {
  id_tipo_novedad: number;
  descripcion: string;
}

export interface Novedad {
  id_novedad: number;
  id_empleado: number;
  fecha: string; // ISO date
  tipo_novedad: number;
  origen: OrigenNovedad;
  estado: EstadoNovedad;
  observacion: string | null;
  tipo: TipoNovedad;
  empleado: { legajo: number; nombre: string };
}

export interface NovedadCreateInput {
  id_empleado: number;
  fecha: string;
  tipo_novedad: number;
  observacion?: string;
}

export interface RecalcularInput {
  desde: string;
  hasta: string;
}

export interface RecalcularResult {
  novedadesCreadas: number;
  novedadesEliminadas: number;
  diasProcesados: number;
  detalle: string[];
}

export interface NovedadListFilter {
  legajo?: number;
  desde?: string;
  hasta?: string;
  origen?: OrigenNovedad;
  estado?: EstadoNovedad;
}

export function listNovedades(filter: NovedadListFilter = {}) {
  const qs = new URLSearchParams();
  if (filter.legajo !== undefined) qs.set('legajo', String(filter.legajo));
  if (filter.desde) qs.set('desde', filter.desde);
  if (filter.hasta) qs.set('hasta', filter.hasta);
  if (filter.origen) qs.set('origen', filter.origen);
  if (filter.estado) qs.set('estado', filter.estado);
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<Novedad[]>(`/novedades${suffix}`);
}

export function listTiposNovedad() {
  return api<TipoNovedad[]>('/novedades/tipos');
}

export function createNovedad(input: NovedadCreateInput) {
  return api<Novedad>('/novedades', { method: 'POST', body: JSON.stringify(input) });
}

export function aprobarNovedad(id: number, observacion?: string) {
  return api<Novedad>(`/novedades/${id}/aprobar`, {
    method: 'POST',
    body: JSON.stringify({ observacion }),
  });
}

export function rechazarNovedad(id: number, observacion?: string) {
  return api<Novedad>(`/novedades/${id}/rechazar`, {
    method: 'POST',
    body: JSON.stringify({ observacion }),
  });
}

export function eliminarNovedad(id: number) {
  return api<void>(`/novedades/${id}`, { method: 'DELETE' });
}

export function recalcularNovedades(legajo: number, input: RecalcularInput) {
  return api<RecalcularResult>(`/empleados/${legajo}/recalcular-novedades`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
