/**
 * Servicio del reloj de demo.
 *
 * Permite al admin adelantar el tiempo virtual del sistema (sin mover el reloj
 * real del SO). Al cruzar una o más medianoches locales, recalcula las
 * novedades automáticas de los días completados para todos los empleados —
 * replicando lo que haría el scheduler de las 23:59 si el tiempo pasara de
 * verdad. Así, en la demo, las ausencias del día aparecen al avanzar al día
 * siguiente.
 */
import { now, setClockTo, advanceMs, resetClock, getClockState, type ClockState } from '../lib/clock.js';
import { isoDateLocal } from '../lib/tz.js';
import { recalcularTodos } from '../lib/recalculoDiario.js';

// Tope de días a recalcular automáticamente al avanzar el reloj. Un salto
// mayor (ej. cambiar de mes de un saque) no es un caso de demo real y
// recalcular cientos de días sería lento; en ese caso recalculamos sólo los
// últimos MAX_DIAS_RECALC días anteriores al nuevo "ahora".
const MAX_DIAS_RECALC = 31;

// Días locales (YYYY-MM-DD) que quedan "completados" al pasar de `antes` a
// `despues`: desde el día local de `antes` (inclusive) hasta el día anterior
// al de `despues`. El día de `despues` está en curso, no se recalcula todavía.
function diasCompletados(antes: Date, despues: Date): string[] {
  const dias: string[] = [];
  const cur = new Date(`${isoDateLocal(antes)}T12:00:00Z`); // mediodía UTC: lejos de bordes de día local
  const finIso = isoDateLocal(despues);
  while (isoDateLocal(cur) < finIso) {
    dias.push(isoDateLocal(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dias.slice(-MAX_DIAS_RECALC);
}

async function recalcularDiasCompletados(antes: Date, despues: Date): Promise<string[]> {
  if (despues.getTime() <= antes.getTime()) return []; // sólo al avanzar
  const dias = diasCompletados(antes, despues);
  if (dias.length === 0) return [];
  await recalcularTodos(dias[0], dias[dias.length - 1]);
  return dias;
}

export interface DemoClockResult extends ClockState {
  recalculados: string[]; // días locales recalculados por cruce de medianoche
}

/** Adelanta el reloj virtual N milisegundos y recalcula días completados. */
export async function avanzarReloj(ms: number): Promise<DemoClockResult> {
  const antes = now();
  advanceMs(ms);
  const despues = now();
  const recalculados = await recalcularDiasCompletados(antes, despues);
  return { ...getClockState(), recalculados };
}

/** Fija el reloj virtual a un instante absoluto y recalcula días completados. */
export async function fijarReloj(target: Date): Promise<DemoClockResult> {
  const antes = now();
  setClockTo(target);
  const despues = now();
  const recalculados = await recalcularDiasCompletados(antes, despues);
  return { ...getClockState(), recalculados };
}

/** Vuelve a la hora real. No recalcula nada. */
export function resetReloj(): DemoClockResult {
  resetClock();
  return { ...getClockState(), recalculados: [] };
}

export function estadoReloj(): DemoClockResult {
  return { ...getClockState(), recalculados: [] };
}
