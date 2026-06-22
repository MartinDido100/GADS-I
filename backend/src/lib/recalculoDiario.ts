import { TZ_OFFSET_MIN, isoDateLocal } from './tz.js';
import { now } from './clock.js';
import * as empleadoRepo from '../repositories/empleadoRepository.js';
import { calcularNovedades } from '../services/reglasService.js';

/**
 * Recalcula las novedades de todos los empleados activos para cada día (local)
 * del rango [desdeIso, hastaIso] inclusive. Sin argumentos usa el día actual
 * del reloj (virtual o real). Captura ausencias de quienes no ficharon.
 */
export async function recalcularTodos(desdeIso?: string, hastaIso?: string): Promise<void> {
  const empleados = await empleadoRepo.findAll({ activo: true });

  const inicio = new Date(`${desdeIso ?? isoDateLocal(now())}T00:00:00Z`);
  const fin = new Date(`${hastaIso ?? desdeIso ?? isoDateLocal(now())}T00:00:00Z`);

  for (const cur = new Date(inicio); cur <= fin; cur.setUTCDate(cur.getUTCDate() + 1)) {
    const dia = new Date(cur);
    for (const e of empleados) {
      try {
        await calcularNovedades(e.legajo, dia, dia);
      } catch (err) {
        console.error(`Recálculo diario falló para legajo ${e.legajo} (${dia.toISOString().slice(0, 10)}):`, err);
      }
    }
  }
  const rango = hastaIso && hastaIso !== desdeIso
    ? `${inicio.toISOString().slice(0, 10)}..${fin.toISOString().slice(0, 10)}`
    : inicio.toISOString().slice(0, 10);
  console.log(`Recálculo diario completado: ${rango} (${empleados.length} empleados)`);
}

// Milisegundos hasta las 23:59:00 hora local más próximas (reloj real del SO).
function msHastaFinDeDia(): number {
  const ahora = Date.now();
  const local = new Date(ahora + TZ_OFFSET_MIN * 60_000);
  local.setUTCHours(23, 59, 0, 0);
  let targetUtc = local.getTime() - TZ_OFFSET_MIN * 60_000;
  if (targetUtc <= ahora) targetUtc += 86_400_000;
  return targetUtc - ahora;
}

export function iniciarRecalculoDiario(): void {
  const programar = () => {
    const ms = msHastaFinDeDia();
    console.log(`Recálculo diario programado en ${Math.round(ms / 60_000)} min`);
    setTimeout(() => {
      void recalcularTodos().finally(programar);
    }, ms);
  };
  programar();
}
