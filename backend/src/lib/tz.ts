import { now } from './clock.js';

// Zona horaria local del negocio (Argentina UTC-3, sin DST).
// Los timestamps se guardan en UTC; los horarios (HH:mm) están en hora local.
// Configurable por env para no hardcodear el offset.
export const TZ_OFFSET_MIN = Number(process.env.TZ_OFFSET_MINUTES ?? '-180');

function toLocal(d: Date): Date {
  return new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
}

/** Minutos desde medianoche en hora local. */
export function minutosLocales(d: Date): number {
  const l = toLocal(d);
  return l.getUTCHours() * 60 + l.getUTCMinutes();
}

/** Fecha ISO YYYY-MM-DD según hora local. */
export function isoDateLocal(d: Date): string {
  return toLocal(d).toISOString().slice(0, 10);
}

/** Hora HH:mm según hora local (para observaciones legibles). */
export function horaLocal(d: Date): string {
  return toLocal(d).toISOString().slice(11, 16);
}

/** Fecha ISO YYYY-MM-DD de "ahora" (reloj virtual) en hora local. */
export function hoyLocalIso(): string {
  return isoDateLocal(now());
}
