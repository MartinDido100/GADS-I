import { TZ_OFFSET_MIN, isoDateLocal } from './tz.js';
import * as empleadoRepo from '../repositories/empleadoRepository.js';
import { calcularNovedades } from '../services/reglasService.js';

// Recalcula las novedades del día (local) para todos los empleados activos.
// Captura las ausencias de quienes no ficharon en todo el día.
export async function recalcularTodos(): Promise<void> {
  const hoyIso = isoDateLocal(new Date());
  const dia = new Date(`${hoyIso}T00:00:00Z`);
  const empleados = await empleadoRepo.findAll({ activo: true });

  for (const e of empleados) {
    try {
      await calcularNovedades(e.legajo, dia, dia);
    } catch (err) {
      console.error(`Recálculo diario falló para legajo ${e.legajo}:`, err);
    }
  }
  console.log(`Recálculo diario completado: ${hoyIso} (${empleados.length} empleados)`);
}

// Milisegundos hasta las 23:59:00 hora local más próximas.
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
