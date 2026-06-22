/**
 * Reloj del sistema con offset en memoria.
 *
 * Todo el backend obtiene "ahora" vía `now()` en vez de `new Date()`, de modo
 * que la demo pueda adelantar el tiempo virtualmente sin que el reloj real del
 * SO se mueva. El offset vive solo en memoria del proceso: al reiniciar el
 * servidor vuelve a 0 (la hora real).
 */

let offsetMs = 0;

/** Hora actual del sistema (real + offset de demo). Usar siempre en lugar de new Date(). */
export function now(): Date {
  return new Date(Date.now() + offsetMs);
}

/** Fija el reloj virtual a un instante absoluto. */
export function setClockTo(target: Date): void {
  offsetMs = target.getTime() - Date.now();
}

/** Adelanta (o atrasa, si es negativo) el reloj virtual. */
export function advanceMs(ms: number): void {
  offsetMs += ms;
}

/** Vuelve a la hora real (offset 0). */
export function resetClock(): void {
  offsetMs = 0;
}

export interface ClockState {
  now: string;        // ISO del "ahora" virtual
  offsetMs: number;   // diferencia con la hora real
  isSimulated: boolean;
}

export function getClockState(): ClockState {
  return {
    now: now().toISOString(),
    offsetMs,
    isSimulated: offsetMs !== 0,
  };
}
