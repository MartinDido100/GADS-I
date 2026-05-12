import { EstadoNovedad, OrigenNovedad } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import * as novedadRepo from '../repositories/novedadRepository.js';
import * as turnoRepo from '../repositories/turnoRepository.js';

// Mapa canónico: descripción del seed → clave interna usada en el motor.
const TIPO_KEY = {
  TARDANZA:       'Tardanza',
  AUSENCIA:       'Ausencia',
  HE_50:          'Horas extra al 50%',
  HE_100:         'Horas extra al 100%',
  SALIDA_ANTICI:  'Salida anticipada',
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

/** Minutos desde medianoche UTC para un timestamp dado. */
function minutosDelDia(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

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
  const fichadas = await prisma.fichada.findMany({
    where: {
      id_empleado: legajo,
      activo: true,
      timestamp: { gte: desde, lte: new Date(hasta.getTime() + 86_400_000 - 1) },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Agrupar fichadas por fecha ISO (YYYY-MM-DD en UTC).
  const fichadasPorDia = new Map<string, typeof fichadas>();
  for (const f of fichadas) {
    const key = f.timestamp.toISOString().slice(0, 10);
    if (!fichadasPorDia.has(key)) fichadasPorDia.set(key, []);
    fichadasPorDia.get(key)!.push(f);
  }

  const dias = diasEnRango(desde, hasta);
  const novedadesACrear: novedadRepo.NovedadCreateData[] = [];

  for (const dia of dias) {
    const isoKey = dia.toISOString().slice(0, 10);
    const diaSemana = DIA_MAP[dia.getUTCDay()]!;
    const esDomingo = dia.getUTCDay() === 0;

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

    // ── Tardanza ─────────────────────────────────────────────────────────
    const minEntradaReal = minutosDelDia(primerEntrada.timestamp);
    if (minEntradaReal > minutosEntrada + tolEntrada) {
      const tardanzaMin = minEntradaReal - minutosEntrada;
      novedadesACrear.push({
        id_empleado: legajo,
        fecha: dia,
        tipo_novedad: tipos[TIPO_KEY.TARDANZA]!,
        origen: OrigenNovedad.AUTOMATICA,
        observacion: `Entrada a las ${primerEntrada.timestamp.toISOString().slice(11, 16)}Z — ${tardanzaMin} min de tardanza`,
      });
      detalle.push(`${isoKey}: TARDANZA ${tardanzaMin} min`);
    }

    // ── Salida anticipada + horas extra ─────────────────────────────────
    const ultimaSalida = salidas.at(-1);
    if (ultimaSalida) {
      const minSalidaReal = minutosDelDia(ultimaSalida.timestamp);

      // Salida anticipada
      if (minSalidaReal < minutosRetiro - tolRetiro) {
        const anticipo = minutosRetiro - minSalidaReal;
        novedadesACrear.push({
          id_empleado: legajo,
          fecha: dia,
          tipo_novedad: tipos[TIPO_KEY.SALIDA_ANTICI]!,
          origen: OrigenNovedad.AUTOMATICA,
          observacion: `Salida a las ${ultimaSalida.timestamp.toISOString().slice(11, 16)}Z — ${anticipo} min anticipado`,
        });
        detalle.push(`${isoKey}: SALIDA ANTICIPADA ${anticipo} min`);
      }

      // Horas extra: salida posterior a horario_retiro + umbral_horas_extras
      if (umbralHE > 0 && minSalidaReal > minutosRetiro + umbralHE) {
        const minutosExtra = minSalidaReal - minutosRetiro;
        const tipoHE = esDomingo ? TIPO_KEY.HE_100 : TIPO_KEY.HE_50;
        novedadesACrear.push({
          id_empleado: legajo,
          fecha: dia,
          tipo_novedad: tipos[tipoHE]!,
          origen: OrigenNovedad.AUTOMATICA,
          observacion: `${minutosExtra} min extra (${esDomingo ? '100%' : '50%'})`,
        });
        detalle.push(`${isoKey}: HE ${esDomingo ? '100%' : '50%'} ${minutosExtra} min`);
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
