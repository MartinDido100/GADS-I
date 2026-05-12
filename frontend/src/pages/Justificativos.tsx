import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Title, Text, Card, Group, Stack, Button, Box, Badge, Loader, Center, Alert,
  Table, SegmentedControl, TextInput, Modal, Select, Textarea, ActionIcon,
  Tooltip, SimpleGrid, ThemeIcon, Checkbox,
} from '@mantine/core';
import {
  Plus, AlertCircle, Search, CheckCircle, XCircle, Clock, RefreshCw, Trash2, Paperclip,
} from 'lucide-react';
import {
  listNovedades, listTiposNovedad, createNovedad, aprobarNovedad,
  rechazarNovedad, eliminarNovedad, recalcularNovedades,
  type Novedad, type TipoNovedad, type EstadoNovedad,
} from '../lib/novedadesApi';
import { listEmpleados } from '../lib/empleadosApi';
import { ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import type { Empleado } from '../types';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function firstOfMonth() {
  const d = new Date();
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

// Tipos que requieren archivo adjunto (simulado con checkbox)
const TIPOS_CON_ADJUNTO = [
  'tardanza injustificada',
  'ausencia injustificada',
  'licencia por enfermedad',
  'licencia por examen',
  'permiso especial',
];

function requiereAdjunto(descripcion: string) {
  return TIPOS_CON_ADJUNTO.some((t) => descripcion.toLowerCase().includes(t));
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tipoSeleccionado = tipos.find((t) => String(t.id_tipo_novedad) === tipoId);
  const mostrarAdjunto = tipoSeleccionado ? requiereAdjunto(tipoSeleccionado.descripcion) : false;

  useEffect(() => {
    if (!opened) return;
    setLegajo(isAdmin ? null : String(miLegajo));
    setFecha(todayIso());
    setTipoId(null);
    setObs('');
    setTieneAdjunto(false);
    setError(null);
  }, [opened, isAdmin, miLegajo]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!legajo || !tipoId) { setError('Completá todos los campos'); return; }
    setError(null);
    setSubmitting(true);
    try {
      const obsBase = obs.trim();
      const adjuntoSuffix = mostrarAdjunto ? (tieneAdjunto ? ' [Adjunto: sí]' : ' [Adjunto: no]') : '';
      await createNovedad({
        id_empleado: Number(legajo),
        fecha,
        tipo_novedad: Number(tipoId),
        observacion: (obsBase + adjuntoSuffix).trim() || undefined,
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
            data={tipos.map((t) => ({ value: String(t.id_tipo_novedad), label: t.descripcion }))}
            value={tipoId}
            onChange={setTipoId}
            searchable
            required
          />
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
            <TextInput label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.currentTarget.value)} required />
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

// ── Pantalla principal ───────────────────────────────────────────────────────

export function Justificativos() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [tipos, setTipos] = useState<TipoNovedad[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoNovedad | 'TODOS'>('TODOS');
  const [search, setSearch] = useState('');
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [recalcDetalle, setRecalcDetalle] = useState<string[] | null>(null);
  const [accionLoading, setAccionLoading] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const filter = estadoFiltro !== 'TODOS' ? { estado: estadoFiltro } : {};
      const [novs, tiposList] = await Promise.all([
        listNovedades(filter),
        tipos.length ? Promise.resolve(tipos) : listTiposNovedad(),
      ]);
      setNovedades(novs);
      if (!tipos.length) setTipos(tiposList);
      if (isAdmin && !empleados.length) {
        setEmpleados(await listEmpleados({ activo: true }));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [estadoFiltro]);

  const filtered = useMemo(() => {
    if (!search) return novedades;
    const s = search.toLowerCase();
    return novedades.filter((n) =>
      n.empleado.nombre.toLowerCase().includes(s) ||
      String(n.empleado.legajo).includes(s) ||
      n.tipo.descripcion.toLowerCase().includes(s)
    );
  }, [novedades, search]);

  const stats = useMemo(() => ({
    pendientes: novedades.filter((n) => n.estado === 'PENDIENTE').length,
    aprobadas:  novedades.filter((n) => n.estado === 'APROBADA').length,
    rechazadas: novedades.filter((n) => n.estado === 'RECHAZADA').length,
  }), [novedades]);

  async function handleAprobar(id: number) {
    setAccionLoading(id);
    try { await aprobarNovedad(id); void load(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Error'); }
    finally { setAccionLoading(null); }
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

      {recalcDetalle && (
        <Alert icon={<CheckCircle size={16} />} color="green" variant="light"
          withCloseButton onClose={() => setRecalcDetalle(null)}
          title="Recálculo completado">
          {recalcDetalle.length === 0
            ? 'No se detectaron novedades en el período.'
            : recalcDetalle.map((d, i) => <Text key={i} size="xs">{d}</Text>)}
        </Alert>
      )}

      <SimpleGrid cols={3}>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="yellow" variant="light"><Clock size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.pendientes}</Text>
              <Text size="sm" c="dimmed">Pendientes</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="green" variant="light"><CheckCircle size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.aprobadas}</Text>
              <Text size="sm" c="dimmed">Aprobadas</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="red" variant="light"><XCircle size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.rechazadas}</Text>
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
                  ? ['Empleado', 'Fecha', 'Tipo', 'Origen', 'Estado', 'Observación', 'Adjunto', '']
                  : ['Fecha', 'Tipo', 'Origen', 'Estado', 'Observación', 'Adjunto', '']
                ).map((h) => (
                  <Table.Th key={h}
                    style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {h}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((n) => (
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
                    <Text size="xs" c="dimmed" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(n.observacion ?? '').replace(/ \[Adjunto: (sí|no)\]/, '') || '—'}
                    </Text>
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
                              loading={accionLoading === n.id_novedad}
                              onClick={() => handleAprobar(n.id_novedad)}
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

              {filtered.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 8 : 7}>
                    <Text ta="center" size="sm" c="dimmed" py="xl">
                      No hay novedades en este período.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
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
          onDone={(detalle) => { setRecalcDetalle(detalle); void load(); }}
          empleados={empleados}
        />
      )}
    </Stack>
  );
}
