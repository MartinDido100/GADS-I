import { EstadoCierre, EstadoNovedad } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import * as cierreRepo from '../repositories/cierreRepository.js';
import * as empleadoRepo from '../repositories/empleadoRepository.js';
import * as turnoRepo from '../repositories/turnoRepository.js';
import { HttpError } from '../middleware/errorHandler.js';

function parseHHmm(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutosDelDia(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// ── Tipos de salida ────────────────────────────────────────────────────────

export interface TardanzaDetalle {
  fecha: string;   // YYYY-MM-DD
  minutos: number;
  justificada: boolean;
}

export interface ResumenEmpleado {
  legajo: number;
  nombre: string;
  categoria_laboral: string;
  dias_trabajados: number;
  tardanzas: TardanzaDetalle[];
  ausencias_injustificadas: number;
  ausencias_justificadas: number;
  horas_extra_50: number;   // minutos
  horas_extra_100: number;  // minutos
  salidas_anticipadas: number;
  novedades_aprobadas: number;
}

export interface ResumenPeriodo {
  periodo: string;   // YYYY-MM-DD
  estado: 'B' | 'C';
  fecha_cierre: string | null;
  empleados: ResumenEmpleado[];
  totales: {
    dias_trabajados: number;
    ausencias: number;
    tardanzas: number;
    horas_extra_50: number;
    horas_extra_100: number;
  };
}

const DIA_MAP: Record<number, string> = {
  0: 'DOM', 1: 'LUN', 2: 'MAR', 3: 'MIE', 4: 'JUE', 5: 'VIE', 6: 'SAB',
};

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

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Convierte "YYYY-MM" → Date primer día del mes en UTC
function periodoToDate(periodo: string): Date {
  return new Date(`${periodo}-01T00:00:00Z`);
}

function lastDayOfMonth(periodoDate: Date): Date {
  const d = new Date(periodoDate);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// ── Cálculo de resumen ─────────────────────────────────────────────────────

async function calcularResumenEmpleado(
  legajo: number,
  nombre: string,
  categoria_laboral: string,
  desde: Date,
  hasta: Date,
): Promise<ResumenEmpleado> {
  // Fichadas activas del período (excluye almuerzo — no afectan E/S laboral)
  const fichadas = await prisma.fichada.findMany({
    where: {
      id_empleado: legajo,
      activo: true,
      origen: { not: 'ALMUERZO' },
      timestamp: { gte: desde, lte: hasta },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Novedades aprobadas del período (para ausencias justificadas y HE)
  const novedades = await prisma.novedad.findMany({
    where: { id_empleado: legajo, fecha: { gte: desde, lte: hasta } },
    include: { tipo: true },
  });

  // Agrupar fichadas por día UTC
  const fichadasPorDia = new Map<string, typeof fichadas>();
  for (const f of fichadas) {
    const key = isoDate(f.timestamp);
    if (!fichadasPorDia.has(key)) fichadasPorDia.set(key, []);
    fichadasPorDia.get(key)!.push(f);
  }

  const dias = diasEnRango(desde, hasta);
  let diasTrabajados = 0;
  const tardanzasDetalle: TardanzaDetalle[] = [];
  const ausenciasInjust = new Set<string>();
  const ausenciasJust = new Set<string>();
  const tardanzasAprobadas = new Set<string>(); // fechas con tardanza aprobada por el admin
  let heMin50 = 0;
  let heMin100 = 0;
  let salidasAnticipadas = 0;
  let novedadesAprobadas = 0;

  for (const n of novedades) {
    if (n.estado !== EstadoNovedad.APROBADA) continue;
    const fecha = isoDate(n.fecha);
    const desc = n.tipo.descripcion.toLowerCase();
    novedadesAprobadas++;

    if (desc.includes('tardanza')) {
      const tieneAdjunto = (n.observacion ?? '').includes('[Adjunto: sí]');
      if (tieneAdjunto) tardanzasAprobadas.add(fecha);
    }

    if (desc === 'ausencia') {
      const tieneAdjunto = (n.observacion ?? '').includes('[Adjunto: sí]');
      if (tieneAdjunto) {
        ausenciasJust.add(fecha);
        ausenciasInjust.delete(fecha);
      } else {
        ausenciasInjust.add(fecha);
      }
    }
    if (desc.includes('ausencia') &&
        (desc.includes('licencia') || desc.includes('vacaciones') || desc.includes('permiso'))) {
      ausenciasJust.add(fecha);
      ausenciasInjust.delete(fecha);
    }
    if (desc.includes('extra al 50%')) {
      const match = (n.observacion ?? '').match(/(\d+) min/);
      heMin50 += match ? Number(match[1]) : 0;
    }
    if (desc.includes('extra al 100%')) {
      const match = (n.observacion ?? '').match(/(\d+) min/);
      heMin100 += match ? Number(match[1]) : 0;
    }
    if (desc.includes('salida anticipada')) salidasAnticipadas++;
  }

  // Iterar día a día usando turnos y horarios reales
  for (const dia of dias) {
    const isoKey = isoDate(dia);
    const diaSemana = DIA_MAP[dia.getUTCDay()]!;

    const turno = await turnoRepo.getHorarioParaEmpleadoYDia(legajo, diaSemana);
    if (!turno?.horario) continue; // día no laboral para este empleado

    const horario = turno.horario;
    const minEntradaEsperada = parseHHmm(horario.horario_entrada);
    const minRetiroEsperado  = parseHHmm(horario.horario_retiro);
    const tolEntrada         = horario.tolerancia_entrada;
    const tolRetiro          = horario.tolerancia_retiro;

    const fichadasDia = fichadasPorDia.get(isoKey) ?? [];
    const entradas = fichadasDia.filter((f) => f.entrada_salida === 'E');
    const salidas  = fichadasDia.filter((f) => f.entrada_salida === 'S');

    const primerEntrada = entradas[0];
    const ultimaSalida  = salidas.at(-1);

    // Día trabajado: tiene entrada Y salida dentro del horario (salida >= retiro - tolerancia)
    if (primerEntrada && ultimaSalida) {
      const minSalidaReal = minutosDelDia(ultimaSalida.timestamp);
      if (minSalidaReal >= minRetiroEsperado - tolRetiro) {
        diasTrabajados++;
      }
    }

    // Tardanza: calculada desde fichadas; justificada si el admin aprobó la novedad
    if (primerEntrada) {
      const minEntradaReal = minutosDelDia(primerEntrada.timestamp);
      if (minEntradaReal > minEntradaEsperada + tolEntrada) {
        const minutos = minEntradaReal - minEntradaEsperada;
        tardanzasDetalle.push({ fecha: isoKey, minutos, justificada: tardanzasAprobadas.has(isoKey) });
      }
    }
  }

  return {
    legajo,
    nombre,
    categoria_laboral,
    dias_trabajados: diasTrabajados,
    tardanzas: tardanzasDetalle,
    ausencias_injustificadas: ausenciasInjust.size,
    ausencias_justificadas: ausenciasJust.size,
    horas_extra_50: heMin50,
    horas_extra_100: heMin100,
    salidas_anticipadas: salidasAnticipadas,
    novedades_aprobadas: novedadesAprobadas,
  };
}

// ── API pública del servicio ────────────────────────────────────────────────

export async function getResumenPeriodo(periodo: string): Promise<ResumenPeriodo> {
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new HttpError(400, 'INVALID_PERIODO', 'El período debe tener formato YYYY-MM');
  }

  const periodoDate = periodoToDate(periodo);
  const hasta = lastDayOfMonth(periodoDate);

  // Asegurar que existe el registro global del período
  const cierre = await cierreRepo.ensureGlobal(periodoDate);

  const empleadosActivos = await empleadoRepo.findAll({ activo: true });

  const resumenes = await Promise.all(
    empleadosActivos.map((e) =>
      calcularResumenEmpleado(e.legajo, e.nombre, e.categoria_laboral, periodoDate, hasta)
    )
  );

  const totales = resumenes.reduce(
    (acc, r) => ({
      dias_trabajados: acc.dias_trabajados + r.dias_trabajados,
      ausencias: acc.ausencias + r.ausencias_injustificadas + r.ausencias_justificadas,
      tardanzas: acc.tardanzas + r.tardanzas.length,
      horas_extra_50: acc.horas_extra_50 + r.horas_extra_50,
      horas_extra_100: acc.horas_extra_100 + r.horas_extra_100,
    }),
    { dias_trabajados: 0, ausencias: 0, tardanzas: 0, horas_extra_50: 0, horas_extra_100: 0 }
  );

  return {
    periodo: `${periodo}-01`,
    estado: cierre.estado_borrador_cerrado as 'B' | 'C',
    fecha_cierre: cierre.fecha_cierre ? isoDate(cierre.fecha_cierre) : null,
    empleados: resumenes,
    totales,
  };
}

export async function cerrarPeriodo(periodo: string): Promise<ResumenPeriodo> {
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new HttpError(400, 'INVALID_PERIODO', 'El período debe tener formato YYYY-MM');
  }

  const periodoDate = periodoToDate(periodo);
  const existing = await cierreRepo.findGlobalByPeriodo(periodoDate);

  if (existing?.estado_borrador_cerrado === EstadoCierre.C) {
    throw new HttpError(400, 'YA_CERRADO', 'Este período ya fue cerrado');
  }

  await cierreRepo.upsertGlobal(periodoDate, {
    estado: EstadoCierre.C,
    fecha_cierre: new Date(),
  });

  return getResumenPeriodo(periodo);
}

export async function reabrirPeriodo(periodo: string): Promise<ResumenPeriodo> {
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    throw new HttpError(400, 'INVALID_PERIODO', 'El período debe tener formato YYYY-MM');
  }

  const periodoDate = periodoToDate(periodo);
  const existing = await cierreRepo.findGlobalByPeriodo(periodoDate);
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Período no encontrado');

  await cierreRepo.upsertGlobal(periodoDate, {
    estado: EstadoCierre.B,
    fecha_cierre: null,
  });

  return getResumenPeriodo(periodo);
}

export async function exportarCSV(periodo: string): Promise<string> {
  const periodoDate = periodoToDate(periodo);
  const cierre = await cierreRepo.findGlobalByPeriodo(periodoDate);
  if (!cierre || cierre.estado_borrador_cerrado !== EstadoCierre.C) {
    throw new HttpError(400, 'PERIODO_NO_CERRADO', 'El período debe estar cerrado antes de exportar');
  }

  const resumen = await getResumenPeriodo(periodo);

  const header = [
    'Legajo', 'Nombre', 'Categoría', 'Días trabajados',
    'Tardanzas (cant)', 'Tardanzas (min total)',
    'Ausencias injustificadas', 'Ausencias justificadas',
    'HS extra 50% (min)', 'HS extra 100% (min)',
    'Salidas anticipadas', 'Novedades aprobadas',
  ].join(',');

  const rows = resumen.empleados.map((e) => [
    e.legajo,
    `"${e.nombre}"`,
    e.categoria_laboral,
    e.dias_trabajados,
    e.tardanzas.length,
    e.tardanzas.reduce((s, t) => s + t.minutos, 0),
    e.ausencias_injustificadas,
    e.ausencias_justificadas,
    e.horas_extra_50,
    e.horas_extra_100,
    e.salidas_anticipadas,
    e.novedades_aprobadas,
  ].join(','));

  return [header, ...rows].join('\n');
}

export async function listPeriodos() {
  const rows = await cierreRepo.listPeriodos();
  return rows.map((r) => ({
    periodo: isoDate(r.periodo).slice(0, 7), // YYYY-MM
    estado: r.estado_borrador_cerrado as 'B' | 'C',
    fecha_cierre: r.fecha_cierre ? isoDate(r.fecha_cierre) : null,
  }));
}
