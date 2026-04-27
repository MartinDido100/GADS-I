import { api } from './api';

export type EntradaSalida = 'E' | 'S';
export type OrigenFichada = 'BIOMETRICO' | 'MANUAL' | 'QR' | 'API';

export interface Fichada {
  identidad: number;
  id_empleado: number;
  timestamp: string; // ISO
  entrada_salida: EntradaSalida;
  origen: OrigenFichada;
  legajo_usuario_carga: number | null;
  activo: boolean;
  id_correccion: number | null;
  empleado: { legajo: number; nombre: string };
  usuario_carga: { legajo: number; nombre: string } | null;
}

export interface FichadaCreateInput {
  id_empleado: number;
  timestamp: string;
  entrada_salida: EntradaSalida;
  origen: OrigenFichada;
}

export interface FichadaListFilter {
  legajo?: number;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
}

export function listFichadas(filter: FichadaListFilter = {}) {
  const qs = new URLSearchParams();
  if (filter.legajo !== undefined) qs.set('legajo', String(filter.legajo));
  if (filter.desde) qs.set('desde', filter.desde);
  if (filter.hasta) qs.set('hasta', filter.hasta);
  const suffix = qs.toString() ? `?${qs}` : '';
  return api<Fichada[]>(`/fichadas${suffix}`);
}

export function createFichada(input: FichadaCreateInput) {
  return api<Fichada>('/fichadas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function corregirFichada(id: number, input: { timestamp: string; entrada_salida: EntradaSalida }) {
  return api<Fichada>(`/fichadas/${id}/corregir`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
