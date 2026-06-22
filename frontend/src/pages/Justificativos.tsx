import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Title, Text, Card, Group, Stack, Button, Box, Badge, Loader, Center, Alert,
  Table, SegmentedControl, TextInput, Modal, Select, Textarea, ActionIcon,
  Tooltip, SimpleGrid, ThemeIcon, Checkbox, NumberInput, Pagination, UnstyledButton,
} from '@mantine/core';
import {
  Plus, AlertCircle, Search, CheckCircle, XCircle, Clock, RefreshCw, Trash2, Paperclip,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import {
  listNovedadesPaginado, listTiposNovedad, createNovedad, aprobarNovedad,
  rechazarNovedad, eliminarNovedad, recalcularNovedades,
  type Novedad, type TipoNovedad, type EstadoNovedad,
  type SortableField, type SortDir,
} from '../lib/novedadesApi';
import { listEmpleados } from '../lib/empleadosApi';
import { ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { clientNow, nowIso } from '../lib/clock';
import type { Empleado } from '../types';

function todayIso() {
  return nowIso();
}

function firstOfMonth() {
  const d = clientNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

const ESTADO_COLOR: Record<EstadoNovedad, string> = {
  PENDIENTE: 'yellow',
  APROBADA:  'green',
  RECHAZADA: 'red',
};

const ESTADO_LABEL: Record<EstadoNovedad, string> = {
  PENDIENTE: 'Pendiente',
  APROBADA:  'Aprobada',
  RECHAZADA: 'Rechazada',
};

// Tipos visibles al crear una novedad manual (alineados con el motor automático)
const TIPOS_PERMITIDOS = [
  'tardanza',
  'ausencia',
  'horas extra al 50%',
  'horas extra al 100%',
  'cambio de horario',
  'salida anticipada',
  'salida parcial',
  'permiso especial',
  'suspensión',
];

// Tipos que muestran el checkbox de adjunto
const TIPOS_CON_ADJUNTO = [
  'tardanza',
  'ausencia',
  'cambio de horario',
  'salida parcial',
];

function requiereAdjunto(descripcion: string) {
  return TIPOS_CON_ADJUNTO.some((t) => descripcion.toLowerCase().includes(t));
}

function tipoPermitido(descripcion: string) {
  return TIPOS_PERMITIDOS.some((t) => descripcion.toLowerCase().includes(t));
}

// ── Modal para crear justificativo (empleado) o novedad manual (admin) ──────

interface NuevaNovedadModalProps {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  tipos: TipoNovedad[];
  empleados: Empleado[];
  miLegajo: number;
  isAdmin: boolean;
}

function NuevaNovedadModal({ opened, onClose, onSaved, tipos, empleados, miLegajo, isAdmin }: NuevaNovedadModalProps) {
  const [legajo, setLegajo] = useState<string | null>(isAdmin ? null : String(miLegajo));
  const [fecha, setFecha] = useState(todayIso());
  const [tipoId, setTipoId] = useState<string | null>(null);
  const [obs, setObs] = useState('');
  const [tieneAdjunto, setTieneAdjunto] = useState(false);
  const [horasHE, setHorasHE] = useState<number | string>(0);
  const [minutosHE, setMinutosHE] = useState<number | string>(0);
  const [minutosPausa, setMinutosPausa] = useState<number | string>(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tipoSeleccionado = tipos.find((t) => String(t.id_tipo_novedad) === tipoId);
  const mostrarAdjunto = tipoSeleccionado ? requiereAdjunto(tipoSeleccionado.descripcion) : false;
  const esHorasExtra = tipoSeleccionado?.descripcion.toLowerCase().includes('extra') ?? false;
  const esSalidaParcial = tipoSeleccionado?.descripcion.toLowerCase().includes('salida parcial') ?? false;

  useEffect(() => {
    if (!opened) return;
    setLegajo(isAdmin ? null : String(miLegajo));
    setFecha(todayIso());
    setTipoId(null);
    setObs('');
    setTieneAdjunto(false);
    setHorasHE(0);
    setMinutosHE(0);
    setMinutosPausa(0);
    setError(null);
  }, [opened, isAdmin, miLegajo]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!legajo || !tipoId) { setError('Completá todos los campos'); return; }

    // HE manual: la cantidad va en la observación como "<N> min extra"
    // (el cierre mensual parsea ese formato para sumar los minutos)
    const totalMinHE = esHorasExtra ? Number(horasHE || 0) * 60 + Number(minutosHE || 0) : 0;
    if (esHorasExtra && totalMinHE <= 0) {
      setError('Indicá cuántas horas extra se hicieron');
      return;
    }

    // Salida parcial manual: los minutos van en la observación como "<N> min"
    // (el cierre los parsea para el descuento)
    if (esSalidaParcial && Number(minutosPausa || 0) <= 0) {
      setError('Indicá cuántos minutos duró la salida parcial');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const obsBase = obs.trim();
      const pct = tipoSeleccionado?.descripcion.match(/(50|100)%/)?.[0] ?? '';
      const heSuffix = esHorasExtra ? `${obsBase ? ' — ' : ''}${totalMinHE} min extra${pct ? ` (${pct})` : ''}` : '';
      const pausaSuffix = esSalidaParcial ? `${obsBase ? ' — ' : ''}${Number(minutosPausa)} min` : '';
      const adjuntoSuffix = mostrarAdjunto ? (tieneAdjunto ? ' [Adjunto: sí]' : ' [Adjunto: no]') : '';
      await createNovedad({
        id_empleado: Number(legajo),
        fecha,
        tipo_novedad: Number(tipoId),
        observacion: (obsBase + heSuffix + pausaSuffix + adjuntoSuffix).trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="md"
      centered
      title={<Text fw={700} size="md">{isAdmin ? 'Nueva novedad manual' : 'Cargar justificativo'}</Text>}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {isAdmin && (
            <Select
              label="Empleado"
              placeholder="Seleccioná un empleado..."
              data={empleados.map((e) => ({ value: String(e.legajo), label: `#${e.legajo} — ${e.nombre}` }))}
              value={legajo}
              onChange={setLegajo}
              searchable
              required
            />
          )}
          <TextInput label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.currentTarget.value)} required />
          <Select
            label="Tipo de novedad"
            placeholder="Seleccioná un tipo..."
            data={tipos.filter((t) => tipoPermitido(t.descripcion)).map((t) => ({ value: String(t.id_tipo_novedad), label: t.descripcion }))}
            value={tipoId}
            onChange={setTipoId}
            searchable
            required
          />
          {esHorasExtra && (
            <Group grow>
              <NumberInput
                label="Horas extra"
                min={0}
                max={12}
                value={horasHE}
                onChange={setHorasHE}
                required
              />
              <NumberInput
                label="Minutos"
                min={0}
                max={59}
                value={minutosHE}
                onChange={setMinutosHE}
              />
            </Group>
          )}
          {esSalidaParcial && (
            <NumberInput
              label="Duración de la pausa (minutos)"
              description="Tiempo que el empleado estuvo fuera"
              min={1}
              max={480}
              value={minutosPausa}
              onChange={setMinutosPausa}
              required
            />
          )}
          <Textarea
            label="Observación"
            placeholder={isAdmin ? 'Detalle opcional...' : 'Motivo del justificativo...'}
            value={obs}
            onChange={(e) => setObs(e.currentTarget.value)}
            minRows={2}
          />
          {mostrarAdjunto && (
            <Checkbox
              label={
                <Group gap={6}>
                  <Paperclip size={14} />
                  <span>Archivo adjunto presentado</span>
                </Group>
              }
              checked={tieneAdjunto}
              onChange={(e) => setTieneAdjunto(e.currentTarget.checked)}
              description="Marcá si adjuntás documentación respaldatoria (licencia, certificado, etc.)"
            />
          )}
          {error && <Alert icon={<AlertCircle size={16} />} color="red" variant="light">{error}</Alert>}
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={submitting} color="red">{isAdmin ? 'Crear' : 'Enviar'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ── Modal de recálculo (solo admin) ─────────────────────────────────────────

interface RecalcularModalProps {
  opened: boolean;
  onClose: () => void;
  onDone: (detalle: string[]) => void;
  empleados: Empleado[];
}

function RecalcularModal({ opened, onClose, onDone, empleados }: RecalcularModalProps) {
  const [legajo, setLegajo] = useState<string | null>(null);
  const [desde, setDesde] = useState(firstOfMonth());
  const [hasta, setHasta] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setLegajo(null);
    setDesde(firstOfMonth());
    setHasta(todayIso());
    setError(null);
  }, [opened]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!legajo) { setError('Seleccioná un empleado'); return; }
    setError(null);
    setLoading(true);
    try {
      const result = await recalcularNovedades(Number(legajo), { desde, hasta });
      onDone(result.detalle);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al recalcular');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="md"
      centered
      title={<Text fw={700} size="md">Recalcular novedades automáticas</Text>}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Borra las novedades automáticas pendientes del período y las regenera desde las fichadas.
          </Text>
          <Select
            label="Empleado"
            placeholder="Seleccioná un empleado..."
            data={empleados.map((e) => ({ value: String(e.legajo), label: `#${e.legajo} — ${e.nombre}` }))}
            value={legajo}
            onChange={setLegajo}
            searchable
            required
          />
          <Group grow>
            <TextInput label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.currentTarget.value)} required />
            <TextInput label="Hasta" type="date" value={hasta} max={todayIso()} onChange={(e) => setHasta(e.currentTarget.value)} required />
          </Group>
          {error && <Alert icon={<AlertCircle size={16} />} color="red" variant="light">{error}</Alert>}
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={loading} color="red" leftSection={<RefreshCw size={14} />}>
              Recalcular
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ── Modal de aprobación ──────────────────────────────────────────────────────

interface AprobarModalProps {
  novedad: Novedad | null;
  onClose: () => void;
  onAprobada: () => void;
}

function AprobarModal({ novedad, onClose, onAprobada }: AprobarModalProps) {
  const [tieneAdjunto, setTieneAdjunto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (novedad) { setTieneAdjunto(false); setError(null); }
  }, [novedad]);

  async function handleConfirmar() {
    if (!novedad) return;
    setLoading(true);
    setError(null);
    try {
      const obsBase = (novedad.observacion ?? '').replace(/ \[Adjunto: (sí|no)\]/, '').trim();
      const sufijo = ` [Adjunto: ${tieneAdjunto ? 'sí' : 'no'}]`;
      await aprobarNovedad(novedad.id_novedad, (obsBase + sufijo).trim());
      onAprobada();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al aprobar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      opened={novedad !== null}
      onClose={onClose}
      title={<Text fw={700} size="md">Aprobar novedad</Text>}
      size="sm"
      centered
    >
      <Stack gap="md">
        {novedad && (
          <Box p="sm" style={{ background: '#f8fafc', borderRadius: 8 }}>
            <Text size="sm" fw={600} c="dark">{novedad.tipo.descripcion}</Text>
            <Text size="xs" c="dimmed" mt={2}>
              {novedad.empleado.nombre} — {formatFecha(novedad.fecha)}
            </Text>
            {novedad.observacion && (
              <Text size="xs" c="dimmed" mt={4}>
                {(novedad.observacion).replace(/ \[Adjunto: (sí|no)\]/, '')}
              </Text>
            )}
          </Box>
        )}
        <Checkbox
          label="Se adjuntó documentación respaldatoria"
          description="Certificado, comprobante u otro archivo presentado por el empleado"
          checked={tieneAdjunto}
          onChange={(e) => setTieneAdjunto(e.currentTarget.checked)}
        />
        {error && <Alert icon={<AlertCircle size={14} />} color="red" variant="light">{error}</Alert>}
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
          <Button color="green" loading={loading} leftSection={<CheckCircle size={14} />} onClick={() => void handleConfirmar()}>
            Aprobar
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ── Cabecera de columna ordenable ────────────────────────────────────────────

function SortHeader({ label, active, dir, onClick }: {
  label: string; active: boolean; dir: SortDir; onClick: () => void;
}) {
  return (
    <UnstyledButton onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Text inherit span style={{ color: active ? '#475569' : '#94a3b8' }}>{label}</Text>
      {active
        ? (dir === 'asc' ? <ChevronUp size={12} color="#475569" /> : <ChevronDown size={12} color="#475569" />)
        : <ChevronsUpDown size={12} color="#cbd5e1" />}
    </UnstyledButton>
  );
}

// ── Pantalla principal ───────────────────────────────────────────────────────

export function Justificativos() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  const PAGE_SIZE = 15;

  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [tipos, setTipos] = useState<TipoNovedad[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoNovedad | 'TODOS'>('TODOS');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Record<EstadoNovedad, number>>({ PENDIENTE: 0, APROBADA: 0, RECHAZADA: 0 });
  const [sortBy, setSortBy] = useState<SortableField>('fecha');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [accionLoading, setAccionLoading] = useState<number | null>(null);
  const [aprobarNov, setAprobarNov] = useState<Novedad | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const page = await listNovedadesPaginado({
        ...(estadoFiltro !== 'TODOS' ? { estado: estadoFiltro } : {}),
        ...(searchDebounced ? { search: searchDebounced } : {}),
        excluir: 'vacaciones', // las vacaciones tienen su propia pantalla
        page: pageRef.current,
        pageSize: PAGE_SIZE,
        sortBy,
        sortDir,
      });
      setNovedades(page.items);
      setTotal(page.total);
      setTotalPages(page.totalPages);
      setStats(page.stats);
      if (!tipos.length) setTipos(await listTiposNovedad());
      if (isAdmin && !empleados.length) {
        setEmpleados(await listEmpleados({ activo: true }));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  // pageRef evita que `load` dependa de `page` directamente (lo lee en el momento).
  const pageRef = useRef(page);
  pageRef.current = page;

  // Debounce del search: actualiza searchDebounced 350ms después de tipear.
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Cambiar filtro/búsqueda/orden vuelve a la página 1.
  useEffect(() => { setPage(1); }, [estadoFiltro, searchDebounced, sortBy, sortDir]);

  // Recargar al cambiar cualquier parámetro de la consulta.
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ },
    [estadoFiltro, searchDebounced, sortBy, sortDir, page]);

  // Recargar cuando el reloj de demo cruza días: aparecen ausencias nuevas.
  useEffect(() => {
    const onClock = () => void load();
    window.addEventListener('demo-clock-changed', onClock);
    return () => window.removeEventListener('demo-clock-changed', onClock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro, searchDebounced, sortBy, sortDir, page]);

  // Click en una columna ordenable: alterna asc/desc o cambia de campo.
  function toggleSort(field: SortableField) {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  }

  function handleAbrirAprobar(nov: Novedad) {
    setAprobarNov(nov);
  }

  async function handleRechazar(id: number) {
    setAccionLoading(id);
    try { await rechazarNovedad(id); void load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Error'); }
    finally { setAccionLoading(null); }
  }

  async function handleEliminar(id: number) {
    setAccionLoading(id);
    try { await eliminarNovedad(id); void load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Error'); }
    finally { setAccionLoading(null); }
  }

  return (
    <Stack p={32} gap="lg">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} fw={900} c="dark" style={{ letterSpacing: '-0.02em' }}>
            Justificativos
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            {isAdmin
              ? 'Novedades automáticas y justificativos de empleados'
              : 'Enviá justificativos y revisá su estado'}
          </Text>
        </Box>
        <Group gap="xs">
          {isAdmin && (
            <Button variant="light" color="gray" leftSection={<RefreshCw size={16} />} onClick={() => setRecalcOpen(true)}>
              Recalcular
            </Button>
          )}
          <Button color="red" leftSection={<Plus size={16} />} onClick={() => setNuevaOpen(true)}>
            {isAdmin ? 'Nueva novedad' : 'Cargar justificativo'}
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red" variant="light"
          withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <SimpleGrid cols={3}>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="yellow" variant="light"><Clock size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.PENDIENTE}</Text>
              <Text size="sm" c="dimmed">Pendientes</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="green" variant="light"><CheckCircle size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.APROBADA}</Text>
              <Text size="sm" c="dimmed">Aprobadas</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="red" variant="light"><XCircle size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.RECHAZADA}</Text>
              <Text size="sm" c="dimmed">Rechazadas</Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      <Card withBorder shadow="xs" radius="md" padding={0}>
        <Group p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="nowrap">
          {isAdmin && (
            <TextInput
              placeholder="Buscar por nombre, legajo o tipo..."
              leftSection={<Search size={14} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, maxWidth: 320 }}
            />
          )}
          <Group gap="xs" ml="auto">
            <SegmentedControl
              value={estadoFiltro}
              onChange={(v) => setEstadoFiltro(v as EstadoNovedad | 'TODOS')}
              data={[
                { label: 'Todos', value: 'TODOS' },
                { label: 'Pendientes', value: 'PENDIENTE' },
                { label: 'Aprobados', value: 'APROBADA' },
                { label: 'Rechazados', value: 'RECHAZADA' },
              ]}
              size="sm"
            />
          </Group>
        </Group>

        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead style={{ background: '#f8fafc' }}>
              <Table.Tr>
                {(isAdmin
                  ? [
                      { label: 'Empleado', field: 'empleado' as const },
                      { label: 'Fecha', field: 'fecha' as const },
                      { label: 'Tipo', field: 'tipo' as const },
                      { label: 'Origen', field: 'origen' as const },
                      { label: 'Estado', field: 'estado' as const },
                      { label: 'Observación', field: null },
                      { label: 'Adjunto', field: null },
                      { label: '', field: null },
                    ]
                  : [
                      { label: 'Fecha', field: 'fecha' as const },
                      { label: 'Tipo', field: 'tipo' as const },
                      { label: 'Origen', field: 'origen' as const },
                      { label: 'Estado', field: 'estado' as const },
                      { label: 'Observación', field: null },
                      { label: 'Adjunto', field: null },
                      { label: '', field: null },
                    ]
                ).map((col, i) => (
                  <Table.Th key={col.label || `c${i}`}
                    style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {col.field ? (
                      <SortHeader
                        label={col.label}
                        active={sortBy === col.field}
                        dir={sortDir}
                        onClick={() => toggleSort(col.field)}
                      />
                    ) : col.label}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {novedades.map((n) => (
                <Table.Tr key={n.id_novedad}>
                  {isAdmin && (
                    <Table.Td>
                      <Stack gap={0}>
                        <Text size="sm" fw={600} c="dark">{n.empleado.nombre}</Text>
                        <Text size="xs" c="dimmed">#{n.empleado.legajo}</Text>
                      </Stack>
                    </Table.Td>
                  )}
                  <Table.Td>
                    <Text size="sm" ff="monospace">{formatFecha(n.fecha)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{n.tipo.descripcion}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={n.origen === 'AUTOMATICA' ? 'blue' : 'orange'} size="sm">
                      {n.origen === 'AUTOMATICA' ? 'Automática' : 'Manual'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="light" color={ESTADO_COLOR[n.estado]} size="sm">
                      {ESTADO_LABEL[n.estado]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {(() => {
                      const obs = (n.observacion ?? '').replace(/ \[Adjunto: (sí|no)\]/, '');
                      if (!obs) return <Text size="xs" c="dimmed">—</Text>;
                      return (
                        <Tooltip label={obs} withArrow multiline maw={360} events={{ hover: true, focus: true, touch: true }}>
                          <Text size="xs" c="dimmed" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {obs}
                          </Text>
                        </Tooltip>
                      );
                    })()}
                  </Table.Td>
                  <Table.Td>
                    {requiereAdjunto(n.tipo.descripcion) ? (
                      n.observacion?.includes('[Adjunto: sí]') ? (
                        <Badge variant="light" color="green" size="sm" leftSection={<Paperclip size={10} />}>Sí</Badge>
                      ) : n.observacion?.includes('[Adjunto: no]') ? (
                        <Badge variant="light" color="gray" size="sm">No</Badge>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      {isAdmin && n.estado === 'PENDIENTE' && (
                        <>
                          <Tooltip label="Aprobar" withArrow>
                            <ActionIcon
                              variant="subtle" color="green" size="sm"
                              onClick={() => handleAbrirAprobar(n)}
                            >
                              <CheckCircle size={14} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Rechazar" withArrow>
                            <ActionIcon
                              variant="subtle" color="red" size="sm"
                              loading={accionLoading === n.id_novedad}
                              onClick={() => handleRechazar(n.id_novedad)}
                            >
                              <XCircle size={14} />
                            </ActionIcon>
                          </Tooltip>
                        </>
                      )}
                      {/* Admin elimina cualquier estado; empleado solo sus pendientes */}
                      {(isAdmin || n.estado === 'PENDIENTE') && (
                        <Tooltip label="Eliminar" withArrow>
                          <ActionIcon
                            variant="subtle" color="gray" size="sm"
                            loading={accionLoading === n.id_novedad}
                            onClick={() => handleEliminar(n.id_novedad)}
                          >
                            <Trash2 size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}

              {novedades.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 8 : 7}>
                    <Text ta="center" size="sm" c="dimmed" py="xl">
                      {searchDebounced ? 'No hay resultados para la búsqueda.' : 'No hay novedades en este período.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}

        {/* Paginación + contador */}
        {!loading && total > 0 && (
          <Group justify="space-between" px="md" py="sm" style={{ borderTop: '1px solid #f1f5f9' }}>
            <Text size="xs" c="dimmed">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </Text>
            {totalPages > 1 && (
              <Pagination
                value={page}
                onChange={setPage}
                total={totalPages}
                size="sm"
                color="red"
                withEdges
              />
            )}
          </Group>
        )}
      </Card>

      <NuevaNovedadModal
        opened={nuevaOpen}
        onClose={() => setNuevaOpen(false)}
        onSaved={() => void load()}
        tipos={tipos}
        empleados={empleados}
        miLegajo={user?.legajo ?? 0}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <RecalcularModal
          opened={recalcOpen}
          onClose={() => setRecalcOpen(false)}
          onDone={() => void load()}
          empleados={empleados}
        />
      )}

      {isAdmin && (
        <AprobarModal
          novedad={aprobarNov}
          onClose={() => setAprobarNov(null)}
          onAprobada={() => void load()}
        />
      )}
    </Stack>
  );
}
