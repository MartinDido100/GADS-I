import { EstadoNovedad, OrigenNovedad } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { TZ_OFFSET_MIN, minutosLocales, isoDateLocal, horaLocal } from '../lib/tz.js';
import * as novedadRepo from '../repositories/novedadRepository.js';
import * as turnoRepo from '../repositories/turnoRepository.js';

// Mapa canónico: descripción del seed → clave interna usada en el motor.
const TIPO_KEY = {
  TARDANZA:         'Tardanza',
  AUSENCIA:         'Ausencia',
  HE_50:            'Horas extra al 50%',
  HE_100:           'Horas extra al 100%',
  SALIDA_ANTICI:    'Salida anticipada',
  CAMBIO_HORARIO:   'Cambio de horario',
  SALIDA_PARCIAL:   'Salida parcial',
} as const;

// Cache de IDs de tipo para no ir a la DB en cada llamada.
let tipoCache: Record<string, number> | null = null;

async function getTipoIds(): Promise<Record<string, number>> {
  if (tipoCache) return tipoCache;
  const tipos = await prisma.tipoNovedad.findMany();
  const map: Record<string, number> = {};
  for (const t of tipos) map[t.descripcion] = t.id_tipo_novedad;
  tipoCache = map;
  return map;
}

// ---------------------------------------------------------------
// Helpers de fecha/hora
// ---------------------------------------------------------------

function diasEnRango(desde: Date, hasta: Date): Date[] {
  const dias: Date[] = [];
  const cur = new Date(desde);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(hasta);
  end.setUTCHours(0, 0, 0, 0);
  while (cur <= end) {
    dias.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dias;
}

const DIA_MAP: Record<number, string> = {
  0: 'DOM', 1: 'LUN', 2: 'MAR', 3: 'MIE', 4: 'JUE', 5: 'VIE', 6: 'SAB',
};


/** Parsea "HH:mm" a minutos desde medianoche. */
function parseHHmm(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Diferencia en minutos entre dos timestamps (fin - inicio). */
function diffMinutos(inicio: Date, fin: Date): number {
  return (fin.getTime() - inicio.getTime()) / 60_000;
}

// ---------------------------------------------------------------
// Motor principal
// ---------------------------------------------------------------

export interface ResultadoCalculo {
  novedadesCreadas: number;
  novedadesEliminadas: number;
  diasProcesados: number;
  detalle: string[];
}

/**
 * Recalcula las novedades AUTOMATICAS de un empleado en el rango [desde, hasta].
 *
 * El proceso es idempotente: borra las automáticas PENDIENTES del período y
 * las regenera desde cero. Las novedades manuales o ya aprobadas/rechazadas
 * no se tocan.
 */
export async function calcularNovedades(
  legajo: number,
  desde: Date,
  hasta: Date,
): Promise<ResultadoCalculo> {
  const tipos = await getTipoIds();
  const detalle: string[] = [];

  // 1. Borrar automáticas PENDIENTES del período (idempotencia).
  const { count: eliminadas } = await novedadRepo.deleteAutosByEmpleadoYPeriodo(legajo, desde, hasta);

  // 2. Obtener todas las fichadas activas del empleado en el rango.
  //    Se extiende el límite superior por el offset horario: una fichada a las
  //    22:00 locales del último día cae en el día siguiente en UTC.
  const fichadas = await prisma.fichada.findMany({
    where: {
      id_empleado: legajo,
      activo: true,
      origen: { not: 'ALMUERZO' }, // el almuerzo no es entrada/salida laboral
      timestamp: { gte: desde, lte: new Date(hasta.getTime() + 86_400_000 - 1 - TZ_OFFSET_MIN * 60_000) },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Agrupar fichadas por fecha ISO (YYYY-MM-DD en hora local).
  const fichadasPorDia = new Map<string, typeof fichadas>();
  for (const f of fichadas) {
    const key = isoDateLocal(f.timestamp);
    if (!fichadasPorDia.has(key)) fichadasPorDia.set(key, []);
    fichadasPorDia.get(key)!.push(f);
  }

  // Días cubiertos por vacaciones aprobadas: no generan ausencia.
  // El rango viene en la observación: "Vacaciones del YYYY-MM-DD al YYYY-MM-DD (N días)"
  const vacacionesAprobadas = await prisma.novedad.findMany({
    where: {
      id_empleado: legajo,
      estado: EstadoNovedad.APROBADA,
      tipo: { descripcion: { contains: 'Vacaciones', mode: 'insensitive' } },
    },
  });
  const diasDeVacaciones = new Set<string>();
  for (const v of vacacionesAprobadas) {
    const m = (v.observacion ?? '').match(/del (\d{4}-\d{2}-\d{2}) al (\d{4}-\d{2}-\d{2})/);
    const inicio = m ? new Date(`${m[1]}T00:00:00Z`) : new Date(v.fecha);
    const fin    = m ? new Date(`${m[2]}T00:00:00Z`) : new Date(v.fecha);
    for (const d = new Date(inicio); d <= fin; d.setUTCDate(d.getUTCDate() + 1)) {
      diasDeVacaciones.add(d.toISOString().slice(0, 10));
    }
  }

  const dias = diasEnRango(desde, hasta);
  const novedadesACrear: novedadRepo.NovedadCreateData[] = [];

  for (const dia of dias) {
    const isoKey = dia.toISOString().slice(0, 10);
    const diaSemana = DIA_MAP[dia.getUTCDay()]!;
    const esFinDeSemana = dia.getUTCDay() === 0 || dia.getUTCDay() === 6;

    // Obtener turno/horario asignado para este empleado en este día.
    const turno = await turnoRepo.getHorarioParaEmpleadoYDia(legajo, diaSemana);
    const horario = turno?.horario;

    const fichadasDia = fichadasPorDia.get(isoKey) ?? [];
    const entradas = fichadasDia.filter((f) => f.entrada_salida === 'E');
    const salidas  = fichadasDia.filter((f) => f.entrada_salida === 'S');

    // ── Doble fichada (mismo tipo en < 5 min) ──────────────────────────
    // Detectamos pero no generamos novedad específica — la registramos
    // sólo como observación en la tardanza/ausencia si aplica. Las dobles
    // fichadas de tipo E o S se reportan como tardanza si corresponde;
    // aquí sólo alertamos via detalle para la UI.
    for (const grupo of [entradas, salidas]) {
      for (let i = 1; i < grupo.length; i++) {
        const prev = grupo[i - 1]!;
        const curr = grupo[i]!;
        if (diffMinutos(prev.timestamp, curr.timestamp) < 5) {
          detalle.push(`${isoKey}: doble fichada ${curr.entrada_salida} (< 5 min)`);
        }
      }
    }

    if (!horario) {
      // Sin horario asignado → no hay día laboral, no se generan novedades.
      continue;
    }

    if (diasDeVacaciones.has(isoKey)) {
      // Día cubierto por vacaciones aprobadas → no se evalúa nada.
      detalle.push(`${isoKey}: vacaciones aprobadas — sin evaluación`);
      continue;
    }

    const minutosEntrada = parseHHmm(horario.horario_entrada);
    const minutosRetiro  = parseHHmm(horario.horario_retiro);
    const tolEntrada     = horario.tolerancia_entrada;
    const tolRetiro      = horario.tolerancia_retiro;
    const umbralHE       = horario.umbral_horas_extras;

    const primerEntrada = entradas[0];

    // ── Ausencia ────────────────────────────────────────────────────────
    if (!primerEntrada) {
      novedadesACrear.push({
        id_empleado: legajo,
        fecha: dia,
        tipo_novedad: tipos[TIPO_KEY.AUSENCIA]!,
        origen: OrigenNovedad.AUTOMATICA,
        observacion: `Sin fichada de entrada el ${isoKey} (día laboral: ${diaSemana})`,
      });
      detalle.push(`${isoKey}: AUSENCIA`);
      continue;
    }

    const minEntradaReal = minutosLocales(primerEntrada.timestamp);
    const ultimaSalida = salidas.at(-1);
    const minSalidaReal = ultimaSalida ? minutosLocales(ultimaSalida.timestamp) : null;

    // ── Cambio de horario: fichada completamente fuera de la ventana ─────
    // Caso A: entrada después del retiro esperado (turno corrido por la derecha)
    // Caso B: salida antes del inicio del horario de entrada (turno corrido por la izquierda)
    const fueraDeVentana =
      minEntradaReal >= minutosRetiro ||
      (minSalidaReal !== null && minSalidaReal <= minutosEntrada);

    if (fueraDeVentana) {
      const entradaStr = horaLocal(primerEntrada.timestamp);
      const salidaStr  = ultimaSalida ? horaLocal(ultimaSalida.timestamp) : '—';
      novedadesACrear.push({
        id_empleado: legajo,
        fecha: dia,
        tipo_novedad: tipos[TIPO_KEY.CAMBIO_HORARIO]!,
        origen: OrigenNovedad.AUTOMATICA,
        observacion: `Fichada fuera de ventana: ${entradaStr}–${salidaStr} (horario asignado: ${horario.horario_entrada}–${horario.horario_retiro})`,
      });
      detalle.push(`${isoKey}: CAMBIO DE HORARIO (${entradaStr}–${salidaStr})`);
      continue; // no evaluar tardanza/salida anticipada/HE para este día
    }

    // ── Tardanza ─────────────────────────────────────────────────────────
    // Entrada anticipada (antes del horario) no genera novedad
    if (minEntradaReal > minutosEntrada + tolEntrada) {
      const tardanzaMin = minEntradaReal - minutosEntrada;
      novedadesACrear.push({
        id_empleado: legajo,
        fecha: dia,
        tipo_novedad: tipos[TIPO_KEY.TARDANZA]!,
        origen: OrigenNovedad.AUTOMATICA,
        observacion: `Entrada a las ${horaLocal(primerEntrada.timestamp)} — ${tardanzaMin} min de tardanza`,
      });
      detalle.push(`${isoKey}: TARDANZA ${tardanzaMin} min`);
    }

    // ── Salida parcial: pausa S→E en medio de la jornada ─────────────────
    // El empleado salió y volvió a entrar el mismo día (ej: turno médico).
    // Genera novedad pendiente; si el admin la aprueba sin adjunto, el cierre
    // descuenta esos minutos del día. (La doble fichada es otro caso: mismo
    // tipo repetido en < 5 min — acá el patrón es S seguida de E.)
    for (let i = 0; i < fichadasDia.length - 1; i++) {
      const actual = fichadasDia[i]!;
      const siguiente = fichadasDia[i + 1]!;
      if (actual.entrada_salida !== 'S' || siguiente.entrada_salida !== 'E') continue;
      const pausaMin = Math.round(diffMinutos(actual.timestamp, siguiente.timestamp));
      if (pausaMin < 1) continue;
      novedadesACrear.push({
        id_empleado: legajo,
        fecha: dia,
        tipo_novedad: tipos[TIPO_KEY.SALIDA_PARCIAL]!,
        origen: OrigenNovedad.AUTOMATICA,
        observacion: `Salida parcial de ${horaLocal(actual.timestamp)} a ${horaLocal(siguiente.timestamp)} — ${pausaMin} min`,
      });
      detalle.push(`${isoKey}: SALIDA PARCIAL ${pausaMin} min`);
    }

    // ── Salida anticipada + horas extra ─────────────────────────────────
    // Sólo se evalúan con la jornada cerrada (la última fichada del día es
    // una salida). Si el empleado está adentro (última fichada E), juzgar la
    // última salida sería prematuro: una pausa generaría una salida
    // anticipada falsa que quedaría obsoleta al fichar la salida real.
    const jornadaAbierta = fichadasDia.at(-1)?.entrada_salida === 'E';
    if (ultimaSalida && minSalidaReal !== null && !jornadaAbierta) {
      // Salida anticipada
      if (minSalidaReal < minutosRetiro - tolRetiro) {
        const anticipo = minutosRetiro - minSalidaReal;
        novedadesACrear.push({
          id_empleado: legajo,
          fecha: dia,
          tipo_novedad: tipos[TIPO_KEY.SALIDA_ANTICI]!,
          origen: OrigenNovedad.AUTOMATICA,
          observacion: `Salida a las ${horaLocal(ultimaSalida.timestamp)} — ${anticipo} min anticipado`,
        });
        detalle.push(`${isoKey}: SALIDA ANTICIPADA ${anticipo} min`);
      }

      // Horas extra: salida posterior a horario_retiro + umbral_horas_extras.
      // 100% sábados y domingos, 50% días hábiles.
      if (umbralHE > 0 && minSalidaReal > minutosRetiro + umbralHE) {
        const minutosExtra = minSalidaReal - minutosRetiro;
        const tipoHE = esFinDeSemana ? TIPO_KEY.HE_100 : TIPO_KEY.HE_50;
        novedadesACrear.push({
          id_empleado: legajo,
          fecha: dia,
          tipo_novedad: tipos[tipoHE]!,
          origen: OrigenNovedad.AUTOMATICA,
          observacion: `${minutosExtra} min extra (${esFinDeSemana ? '100%' : '50%'})`,
        });
        detalle.push(`${isoKey}: HE ${esFinDeSemana ? '100%' : '50%'} ${minutosExtra} min`);
      }
    }
  }

  // 3. Persistir todas las novedades generadas en batch.
  for (const n of novedadesACrear) {
    await novedadRepo.create(n);
  }

  return {
    novedadesCreadas: novedadesACrear.length,
    novedadesEliminadas: eliminadas,
    diasProcesados: dias.length,
    detalle,
  };
}
