import { EntradaSalida, OrigenFichada } from '@prisma/client';
import * as repo from '../repositories/fichadaRepository.js';
import * as empleadoRepo from '../repositories/empleadoRepository.js';
import { HttpError } from '../middleware/errorHandler.js';

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

export function listFichadas(filter: ListFilter = {}) {
  return repo.findAll({
    legajo: filter.legajo,
    desde: filter.desde ? new Date(filter.desde) : undefined,
    hasta: filter.hasta ? new Date(filter.hasta) : undefined,
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

  return repo.create({
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

  return correccion;
}
