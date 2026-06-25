import { EstadoNovedad, OrigenNovedad, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const novedadInclude = {
  tipo: true,
  empleado: { select: { legajo: true, nombre: true } },
} as const;

export interface NovedadFilter {
  legajo?: number;
  desde?: Date;
  hasta?: Date;
  origen?: OrigenNovedad;
  estado?: EstadoNovedad;
  idTipoNovedad?: number;
  search?: string;
  excluirDescripcion?: string; // excluye tipos cuya descripción contenga este texto
}

// Construye el WHERE de Prisma compartido entre listado y conteo.
function buildWhere(filter: NovedadFilter): Prisma.NovedadWhereInput {
  const search = filter.search?.trim();
  return {
    ...(filter.legajo !== undefined && { id_empleado: filter.legajo }),
    ...(filter.idTipoNovedad !== undefined && { tipo_novedad: filter.idTipoNovedad }),
    ...(filter.origen && { origen: filter.origen }),
    ...(filter.estado && { estado: filter.estado }),
    ...(filter.excluirDescripcion && {
      NOT: { tipo: { descripcion: { contains: filter.excluirDescripcion, mode: 'insensitive' } } },
    }),
    ...(filter.desde || filter.hasta
      ? {
          fecha: {
            ...(filter.desde && { gte: filter.desde }),
            ...(filter.hasta && { lte: filter.hasta }),
          },
        }
      : {}),
    // Búsqueda por nombre/legajo de empleado o descripción del tipo.
    ...(search
      ? {
          OR: [
            { empleado: { nombre: { contains: search, mode: 'insensitive' } } },
            { tipo: { descripcion: { contains: search, mode: 'insensitive' } } },
            ...(/^\d+$/.test(search) ? [{ id_empleado: Number(search) }] : []),
          ],
        }
      : {}),
  };
}

export type SortableField = 'fecha' | 'empleado' | 'tipo' | 'origen' | 'estado';
export type SortDir = 'asc' | 'desc';

// Traduce el campo de orden de la API al orderBy de Prisma.
function buildOrderBy(sortBy: SortableField, dir: SortDir): Prisma.NovedadOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'empleado': return [{ empleado: { nombre: dir } }, { id_novedad: 'desc' }];
    case 'tipo':     return [{ tipo: { descripcion: dir } }, { id_novedad: 'desc' }];
    case 'origen':   return [{ origen: dir }, { id_novedad: 'desc' }];
    case 'estado':   return [{ estado: dir }, { id_novedad: 'desc' }];
    case 'fecha':
    default:         return [{ fecha: dir }, { id_novedad: 'desc' }];
  }
}

export function findAll(filter: NovedadFilter = {}) {
  return prisma.novedad.findMany({
    where: buildWhere(filter),
    include: novedadInclude,
    orderBy: [{ fecha: 'desc' }, { id_novedad: 'desc' }],
  });
}

export interface PaginatedParams extends NovedadFilter {
  page: number;
  pageSize: number;
  sortBy: SortableField;
  sortDir: SortDir;
}

export async function findPaginated(params: PaginatedParams) {
  const where = buildWhere(params);
  // Conteos por estado ignorando el filtro de estado (para las stats de cabecera),
  // pero respetando search/legajo/fechas. Si hay filtro de estado puntual,
  // igualmente mostramos el total de cada estado del conjunto buscado.
  const whereSinEstado = { ...where, estado: undefined };
  const [total, items, porEstado] = await prisma.$transaction([
    prisma.novedad.count({ where }),
    prisma.novedad.findMany({
      where,
      include: novedadInclude,
      orderBy: buildOrderBy(params.sortBy, params.sortDir),
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.novedad.groupBy({
      by: ['estado'],
      where: whereSinEstado,
      _count: { _all: true },
      orderBy: { estado: 'asc' },
    }),
  ]);
  const stats = { PENDIENTE: 0, APROBADA: 0, RECHAZADA: 0 } as Record<EstadoNovedad, number>;
  for (const g of porEstado) {
    const count = typeof g._count === 'object' ? (g._count._all ?? 0) : 0;
    stats[g.estado] = count;
  }
  return { total, items, stats };
}

export function findById(id: number) {
  return prisma.novedad.findUnique({ where: { id_novedad: id }, include: novedadInclude });
}

export interface NovedadCreateData {
  id_empleado: number;
  fecha: Date;
  tipo_novedad: number;
  origen: OrigenNovedad;
  estado?: EstadoNovedad;
  observacion?: string;
}

export function create(data: NovedadCreateData) {
  return prisma.novedad.create({
    data: {
      id_empleado: data.id_empleado,
      fecha: data.fecha,
      tipo_novedad: data.tipo_novedad,
      origen: data.origen,
      estado: data.estado ?? EstadoNovedad.PENDIENTE,
      observacion: data.observacion,
    },
    include: novedadInclude,
  });
}

export function updateEstado(id: number, estado: EstadoNovedad, observacion?: string) {
  return prisma.novedad.update({
    where: { id_novedad: id },
    data: { estado, ...(observacion !== undefined && { observacion }) },
    include: novedadInclude,
  });
}

export function deleteNovedad(id: number) {
  return prisma.novedad.delete({ where: { id_novedad: id } });
}

export function findAutosByEmpleadoYPeriodo(legajo: number, desde: Date, hasta: Date) {
  return prisma.novedad.findMany({
    where: {
      id_empleado: legajo,
      origen: OrigenNovedad.AUTOMATICA,
      fecha: { gte: desde, lte: hasta },
    },
    include: novedadInclude,
  });
}

export function deleteAutosByEmpleadoYPeriodo(legajo: number, desde: Date, hasta: Date) {
  return prisma.novedad.deleteMany({
    where: {
      id_empleado: legajo,
      origen: OrigenNovedad.AUTOMATICA,
      estado: EstadoNovedad.PENDIENTE,
      fecha: { gte: desde, lte: hasta },
    },
  });
}

// Demo/didáctico: borra TODAS las novedades automáticas del período, de todos
// los empleados (cualquier estado). Usado por el "reseteo de cero" de la demo.
export function deleteAutosByPeriodo(desde: Date, hasta: Date) {
  return prisma.novedad.deleteMany({
    where: {
      origen: OrigenNovedad.AUTOMATICA,
      fecha: { gte: desde, lte: hasta },
    },
  });
}

export function listTiposNovedad() {
  return prisma.tipoNovedad.findMany({ orderBy: { id_tipo_novedad: 'asc' } });
}

export function findTipoByDescripcion(descripcion: string) {
  return prisma.tipoNovedad.findUnique({ where: { descripcion } });
}
