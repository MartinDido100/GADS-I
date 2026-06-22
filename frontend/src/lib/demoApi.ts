import { api } from './api';

export interface ClockState {
  now: string;            // ISO del "ahora" virtual
  offsetMs: number;       // diferencia con la hora real
  isSimulated: boolean;
  recalculados: string[]; // días locales recalculados por cruce de medianoche
}

export function getClock() {
  return api<ClockState>('/demo/clock');
}

export function advanceClock(input: { dias?: number; horas?: number; minutos?: number }) {
  return api<ClockState>('/demo/clock/advance', { method: 'POST', body: JSON.stringify(input) });
}

export function setClock(fecha: string) {
  return api<ClockState>('/demo/clock/set', { method: 'POST', body: JSON.stringify({ fecha }) });
}

export function resetClock() {
  return api<ClockState>('/demo/clock/reset', { method: 'POST' });
}
