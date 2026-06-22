/**
 * Reloj del cliente, sincronizado con el reloj de demo del servidor.
 *
 * El offset se setea cuando el RelojDemo consulta o cambia el reloj del backend.
 * Las pantallas usan `clientNow()` / `nowIso()` en vez de `new Date()` para que
 * "hoy" siga al tiempo virtual durante la demo. Sin demo activa, offset = 0 y
 * todo se comporta como la hora real.
 */

let offsetMs = 0;

/** Sincroniza el offset del cliente a partir del "ahora" virtual del servidor. */
export function syncClock(serverNowIso: string): void {
  offsetMs = new Date(serverNowIso).getTime() - Date.now();
}

/** Ahora (real + offset de demo). */
export function clientNow(): Date {
  return new Date(Date.now() + offsetMs);
}

/** YYYY-MM-DD del "ahora" virtual en hora local del navegador. */
export function nowIso(): string {
  const d = clientNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
