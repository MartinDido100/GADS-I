import { EntradaSalida, OrigenFichada } from '@prisma/client';
import * as repo from '../repositories/fichadaRepository.js';
import * as empleadoRepo from '../repositories/empleadoRepository.js';
import { HttpError } from '../middleware/errorHandler.js';
import { isoDateLocal, TZ_OFFSET_MIN } from '../lib/tz.js';
import { now } from '../lib/clock.js';
import { calcularNovedades } from './reglasService.js';

// Recalcula las novedades automáticas del día (local) de la fichada.
// Nunca falla hacia afuera: un error de recálculo no debe romper el fichaje.
async function recalcularDiaDeFichada(legajo: number, timestamp: Date) {
  try {
    const dia = new Date(`${isoDateLocal(timestamp)}T00:00:00Z`);
    await calcularNovedades(legajo, dia, dia);
  } catch (err) {
    console.error(`Recálculo automático falló (legajo ${legajo}):`, err);
  }
}

export interface FichadaInput {
  id_empleado: number;
  timestamp: string; // ISO
  entrada_salida: EntradaSalida;
  origen: OrigenFichada;
  legajo_usuario_carga?: number;
  motivo_correccion?: string; // si corrige otra fichada
  id_correccion?: number;     // identidad de la fichada que corrige
}

export interface ListFilter {
  legajo?: number;
  desde?: string;
  hasta?: string;
}

function parseFilterDate(dateStr: string, endOfDay = false): Date {
  // Si ya viene con hora (ISO completo), usarlo directo; si es solo YYYY-MM-DD, asumir UTC
  if (dateStr.length > 10) return new Date(dateStr);
  const day = dateStr.slice(0, 10);
  return new Date(`${day}T${endOfDay ? '23:59:59' : '00:00:00'}Z`);
}

export function listFichadas(filter: ListFilter = {}) {
  return repo.findAll({
    legajo: filter.legajo,
    desde: filter.desde ? parseFilterDate(filter.desde) : undefined,
    hasta: filter.hasta ? parseFilterDate(filter.hasta, true) : undefined,
  });
}

export async function getFichada(identidad: number) {
  const f = await repo.findById(identidad);
  if (!f) throw new HttpError(404, 'NOT_FOUND', 'Fichada no encontrada');
  return f;
}

export async function registrarFichada(input: FichadaInput) {
  const empleado = await empleadoRepo.findByLegajo(input.id_empleado);
  if (!empleado) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  if (!empleado.activo) {
    throw new HttpError(400, 'EMPLEADO_INACTIVO', 'No se pueden registrar fichadas de un empleado inactivo');
  }

  if (input.legajo_usuario_carga !== undefined) {
    const u = await empleadoRepo.findByLegajo(input.legajo_usuario_carga);
    if (!u) throw new HttpError(404, 'NOT_FOUND', 'Usuario que carga no encontrado');
  }

  if (input.id_correccion !== undefined) {
    const original = await repo.findById(input.id_correccion);
    if (!original) {
      throw new HttpError(404, 'NOT_FOUND', 'La fichada original a corregir no existe');
    }
    if (original.id_empleado !== input.id_empleado) {
      throw new HttpError(400, 'INVALID_CORRECCION', 'La fichada a corregir no pertenece a este empleado');
    }
  }

  const fichada = await repo.create({
    empleado: { connect: { legajo: input.id_empleado } },
    timestamp: new Date(input.timestamp),
    entrada_salida: input.entrada_salida,
    origen: input.origen,
    activo: true,
    ...(input.legajo_usuario_carga !== undefined && {
      usuario_carga: { connect: { legajo: input.legajo_usuario_carga } },
    }),
    ...(input.id_correccion !== undefined && {
      corrige: { connect: { identidad: input.id_correccion } },
    }),
  });

  // Toda fichada laboral recalcula las novedades del día: la salida evalúa
  // la jornada y la entrada limpia novedades que una pausa dejó obsoletas.
  // Las correcciones disparan el recálculo desde corregirFichada (después
  // de desactivar la original).
  if (input.origen !== OrigenFichada.ALMUERZO && input.id_correccion === undefined) {
    await recalcularDiaDeFichada(input.id_empleado, fichada.timestamp);
  }

  return fichada;
}

// Permite al propio empleado declarar salida/regreso de almuerzo.
// A diferencia del biométrico, el tipo E/S se pasa explícitamente.
export async function registrarAlmuerzo(legajo: number, tipo: EntradaSalida) {
  const empleado = await empleadoRepo.findByLegajo(legajo);
  if (!empleado) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  if (!empleado.activo) throw new HttpError(400, 'EMPLEADO_INACTIVO', 'Empleado inactivo');

  return repo.create({
    empleado: { connect: { legajo } },
    timestamp: now(),
    entrada_salida: tipo,
    origen: OrigenFichada.ALMUERZO,
    activo: true,
  });
}

// Simula una lectura biométrica: determina automáticamente E o S según la
// última fichada activa del día para ese empleado.
export async function registrarBiometrico(legajo: number) {
  const empleado = await empleadoRepo.findByLegajo(legajo);
  if (!empleado) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');
  if (!empleado.activo) {
    throw new HttpError(400, 'EMPLEADO_INACTIVO', 'Empleado inactivo');
  }

  const ahora = now();
  const ultima = await repo.findUltimaFichadaDelDia(legajo, ahora);
  const tipo: EntradaSalida = (!ultima || ultima.entrada_salida === 'S') ? 'E' : 'S';

  const fichada = await repo.create({
    empleado: { connect: { legajo } },
    timestamp: ahora,
    entrada_salida: tipo,
    origen: OrigenFichada.BIOMETRICO,
    activo: true,
  });

  await recalcularDiaDeFichada(legajo, ahora);

  return fichada;
}

export async function corregirFichada(
  identidad: number,
  nueva: Omit<FichadaInput, 'id_correccion'>,
  legajoUsuarioCarga: number,
) {
  const original = await repo.findById(identidad);
  if (!original) throw new HttpError(404, 'NOT_FOUND', 'Fichada original no encontrada');

  // 1. Crear la fichada correctiva apuntando a la original.
  const correccion = await registrarFichada({
    ...nueva,
    legajo_usuario_carga: legajoUsuarioCarga,
    origen: OrigenFichada.MANUAL,
    id_correccion: identidad,
  });

  // 2. Marcar la original como inactiva (la correctiva la reemplaza para
  //    cómputos futuros del motor de reglas).
  await repo.marcarInactiva(identidad);

  // 3. Recalcular el día de la fichada nueva y el de la original (pueden diferir).
  await recalcularDiaDeFichada(nueva.id_empleado, new Date(nueva.timestamp));
  if (isoDateLocal(original.timestamp) !== isoDateLocal(new Date(nueva.timestamp))) {
    await recalcularDiaDeFichada(original.id_empleado, original.timestamp);
  }

  return correccion;
}

/**
 * Vacía (soft-delete) todas las fichadas de un empleado en un día local y
 * recalcula sus novedades. Herramienta DIDÁCTICA para la demo: permite repetir
 * flujos sobre el mismo día y empleado sin romper la inmutabilidad de la fichada
 * (las filas quedan, solo se marcan activo:false). Devuelve cuántas se vaciaron.
 *
 * @param diaIso fecha local YYYY-MM-DD; si se omite, usa el día del reloj actual.
 */
export async function vaciarDia(legajo: number, diaIso?: string) {
  const empleado = await empleadoRepo.findByLegajo(legajo);
  if (!empleado) throw new HttpError(404, 'NOT_FOUND', 'Empleado no encontrado');

  const dia = diaIso ?? isoDateLocal(now());

  // Rango UTC que cubre el día local [00:00, 23:59:59.999] del negocio.
  // Una fichada a las 00:00 locales cae a las -TZ_OFFSET en UTC.
  const inicioUtc = new Date(new Date(`${dia}T00:00:00.000Z`).getTime() - TZ_OFFSET_MIN * 60_000);
  const finUtc = new Date(new Date(`${dia}T23:59:59.999Z`).getTime() - TZ_OFFSET_MIN * 60_000);

  const { count } = await repo.desactivarPorEmpleadoYRango(legajo, inicioUtc, finUtc);

  // Sin fichadas activas, el motor regenera (o limpia) las novedades del día.
  const diaUtc = new Date(`${dia}T00:00:00Z`);
  await calcularNovedades(legajo, diaUtc, diaUtc);

  return { legajo, dia, fichadasVaciadas: count };
}
