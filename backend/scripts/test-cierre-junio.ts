/**
 * Lote de pruebas del cierre mensual — junio 2026.
 *
 * Genera datos para Ana Martínez (1004) cubriendo todos los casos del resumen
 * y verifica que getResumenPeriodo devuelva los valores esperados.
 *
 * Correr:    npx tsx scripts/test-cierre-junio.ts
 * Limpiar:   npx tsx scripts/test-cierre-junio.ts --clean
 *
 * Escenarios (horario 09:00–18:00, tolerancias 5 min, umbral HE 15 min, turno LUN–SAB):
 *   01/06 LUN  día normal (E 09:00, S 18:00)            → trabajado
 *   02/06 MAR  tardanza 60 min, aprobada SIN adjunto    → injustificada, NO trabajado
 *   03/06 MIE  tardanza 90 min, aprobada CON adjunto    → justificada, trabajado
 *   04/06 JUE  sin fichadas, ausencia SIN adjunto       → injustificada, NO trabajado
 *   05/06 VIE  sin fichadas, ausencia CON adjunto       → justificada, trabajado
 *   06/06 SAB  E 09:00, S 19:00                         → HE 100% 60 min, trabajado
 *   08/06 LUN  E 09:00, S 19:30                         → HE 50% 90 min, trabajado
 *   09/06 MAR  E 09:00, S 16:00                         → salida anticipada, NO trabajado
 *   11/06 JUE  pausa 12:00→13:30, aprobada SIN adjunto  → 90 min descontados, trabajado
 *   12/06 VIE  pausa 11:00→11:45, aprobada CON adjunto  → 45 min justificados, trabajado
 *   15–21/06   vacaciones aprobadas (7 días)            → 7 días vacaciones, +6 trabajados (LUN–SAB)
 */
import { EstadoNovedad, OrigenNovedad } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';
import { calcularNovedades } from '../src/services/reglasService.js';
import { getResumenPeriodo } from '../src/services/cierreService.js';

const LEGAJO = 1004;
const HORARIO_DESC = 'Test cierre junio 09:00 a 18:00';
const DIAS_TURNO = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

// Hora local Argentina (UTC-3) → UTC
function ts(dia: string, horaLocal: string): Date {
  const [h, m] = horaLocal.split(':').map(Number);
  return new Date(`2026-06-${dia}T${String(h! + 3).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`);
}

async function limpiar() {
  await prisma.novedad.deleteMany({
    where: { id_empleado: LEGAJO, fecha: { gte: new Date('2026-06-01'), lte: new Date('2026-06-30') } },
  });
  await prisma.fichada.deleteMany({
    where: { id_empleado: LEGAJO, timestamp: { gte: new Date('2026-06-01'), lte: new Date('2026-07-01') } },
  });
  await prisma.turno.deleteMany({ where: { id_empleado: LEGAJO } });
  await prisma.horario.deleteMany({ where: { descripcion: HORARIO_DESC } });
  console.log('Datos de prueba de junio para 1004 eliminados.\n');
}

async function sembrar() {
  // Horario y turnos
  const horario = await prisma.horario.create({
    data: {
      descripcion: HORARIO_DESC,
      horario_entrada: '09:00',
      horario_retiro: '18:00',
      tolerancia_entrada: 5,
      tolerancia_retiro: 5,
      minutos_minimos_descanso: 60,
      umbral_horas_extras: 15,
    },
  });
  for (const dia of DIAS_TURNO) {
    await prisma.turno.create({ data: { id_horario: horario.id, id_empleado: LEGAJO, dia } });
  }

  // Fichadas (hora local)
  const fichadas: [string, string, 'E' | 'S'][] = [
    ['01', '09:00', 'E'], ['01', '18:00', 'S'],   // normal
    ['02', '10:00', 'E'], ['02', '18:00', 'S'],   // tardanza 60
    ['03', '10:30', 'E'], ['03', '18:00', 'S'],   // tardanza 90
    // 04 y 05: sin fichadas (ausencias)
    ['06', '09:00', 'E'], ['06', '19:00', 'S'],   // HE 100% sábado
    ['08', '09:00', 'E'], ['08', '19:30', 'S'],   // HE 50%
    ['09', '09:00', 'E'], ['09', '16:00', 'S'],   // salida anticipada
    ['11', '09:00', 'E'], ['11', '12:00', 'S'], ['11', '13:30', 'E'], ['11', '18:00', 'S'], // pausa 90
    ['12', '09:00', 'E'], ['12', '11:00', 'S'], ['12', '11:45', 'E'], ['12', '18:00', 'S'], // pausa 45
  ];
  for (const [dia, hora, tipo] of fichadas) {
    await prisma.fichada.create({
      data: {
        id_empleado: LEGAJO,
        timestamp: ts(dia, hora),
        entrada_salida: tipo,
        origen: 'MANUAL',
        activo: true,
      },
    });
  }

  // Vacaciones aprobadas 15–21/06
  const tipoVac = await prisma.tipoNovedad.findFirst({ where: { descripcion: { contains: 'Vacaciones' } } });
  await prisma.novedad.create({
    data: {
      id_empleado: LEGAJO,
      fecha: new Date('2026-06-15T00:00:00Z'),
      tipo_novedad: tipoVac!.id_tipo_novedad,
      origen: OrigenNovedad.MANUAL,
      estado: EstadoNovedad.APROBADA,
      observacion: 'Vacaciones del 2026-06-15 al 2026-06-21 (7 días)',
    },
  });

  // Motor: recalcular sólo los días del escenario
  for (const dia of ['01', '02', '03', '04', '05', '06', '08', '09', '11', '12']) {
    const d = new Date(`2026-06-${dia}T00:00:00Z`);
    await calcularNovedades(LEGAJO, d, d);
  }

  // Aprobar las novedades automáticas según el escenario.
  // clave: "fecha|fragmento de tipo" → adjunto (sí/no/null = aprobar sin marcar)
  const aprobaciones: Record<string, 'sí' | 'no' | null> = {
    '2026-06-02|tardanza':         'no',
    '2026-06-03|tardanza':         'sí',
    '2026-06-04|ausencia':         'no',
    '2026-06-05|ausencia':         'sí',
    '2026-06-06|extra al 100%':    null,
    '2026-06-08|extra al 50%':     null,
    '2026-06-09|salida anticipada': null,
    '2026-06-11|salida parcial':   'no',
    '2026-06-12|salida parcial':   'sí',
  };
  const pendientes = await prisma.novedad.findMany({
    where: { id_empleado: LEGAJO, estado: EstadoNovedad.PENDIENTE },
    include: { tipo: true },
  });
  for (const n of pendientes) {
    const fecha = n.fecha.toISOString().slice(0, 10);
    const entrada = Object.entries(aprobaciones).find(([k]) => {
      const [f, frag] = k.split('|');
      return f === fecha && n.tipo.descripcion.toLowerCase().includes(frag!);
    });
    if (!entrada) continue;
    const adjunto = entrada[1];
    await prisma.novedad.update({
      where: { id_novedad: n.id_novedad },
      data: {
        estado: EstadoNovedad.APROBADA,
        observacion: adjunto ? `${n.observacion ?? ''} [Adjunto: ${adjunto}]`.trim() : n.observacion,
      },
    });
  }
  console.log('Datos sembrados.\n');
}

async function verificar() {
  const resumen = await getResumenPeriodo('2026-06');
  const e = resumen.empleados.find((x) => x.legajo === LEGAJO);
  if (!e) throw new Error('Empleado 1004 no está en el resumen');

  const esperado = {
    dias_trabajados: 13,            // 01,03,05,06,08,11,12 + 6 de vacaciones (15–20)
    dias_vacaciones: 7,             // 15 al 21
    tardanzas_total: 2,
    tardanzas_justificadas: 1,      // 03/06
    tardanzas_injustificadas: 1,    // 02/06
    ausencias_justificadas: 1,      // 05/06
    ausencias_injustificadas: 1,    // 04/06
    horas_extra_50: 90,             // 08/06
    horas_extra_100: 60,            // 06/06
    salidas_anticipadas: 1,         // 09/06
    minutos_descontados: 90,        // 11/06
    minutos_pausas_justificadas: 45, // 12/06
  };

  const obtenido = {
    dias_trabajados: e.dias_trabajados,
    dias_vacaciones: e.dias_vacaciones,
    tardanzas_total: e.tardanzas.length,
    tardanzas_justificadas: e.tardanzas.filter((t) => t.justificada).length,
    tardanzas_injustificadas: e.tardanzas.filter((t) => !t.justificada).length,
    ausencias_justificadas: e.ausencias_justificadas,
    ausencias_injustificadas: e.ausencias_injustificadas,
    horas_extra_50: e.horas_extra_50,
    horas_extra_100: e.horas_extra_100,
    salidas_anticipadas: e.salidas_anticipadas,
    minutos_descontados: e.minutos_descontados,
    minutos_pausas_justificadas: e.minutos_pausas_justificadas,
  };

  let fallos = 0;
  console.log('Resumen junio 2026 — Ana Martínez (1004)');
  console.log('─'.repeat(58));
  for (const k of Object.keys(esperado) as (keyof typeof esperado)[]) {
    const ok = esperado[k] === obtenido[k];
    if (!ok) fallos++;
    console.log(
      `${ok ? '✅' : '❌'} ${k.padEnd(30)} esperado: ${String(esperado[k]).padStart(4)}  obtenido: ${String(obtenido[k]).padStart(4)}`
    );
  }
  console.log('─'.repeat(58));
  console.log(fallos === 0 ? '✅ TODOS LOS CHEQUEOS PASARON' : `❌ ${fallos} chequeo(s) fallaron`);
  console.log('\nLos datos quedan en la DB: revisalos en la pantalla Cierre Mensual (junio 2026).');
  console.log('Para limpiar: npx tsx scripts/test-cierre-junio.ts --clean');
  if (fallos > 0) process.exitCode = 1;
}

async function main() {
  if (process.argv.includes('--clean')) {
    await limpiar();
    return;
  }
  await limpiar();
  await sembrar();
  await verificar();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
