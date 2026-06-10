import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Title, Text, Card, Group, Stack, Button, Box, Badge, Loader, Center, Alert,
  Table, Modal, Select, TextInput, ActionIcon, Tooltip, SimpleGrid, ThemeIcon,
} from '@mantine/core';
import {
  Plus, AlertCircle, CheckCircle, XCircle, Clock, Trash2, Plane, CalendarDays,
} from 'lucide-react';
import {
  listNovedades, listTiposNovedad, createNovedad, aprobarNovedad,
  rechazarNovedad, eliminarNovedad,
  type Novedad, type TipoNovedad, type EstadoNovedad,
} from '../lib/novedadesApi';
import { ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

const DIAS_ANUALES = 14;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatFecha(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

function addDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// La solicitud guarda el rango en la observación con formato parseable:
// "Vacaciones del 2026-07-01 al 2026-07-07 (7 días)"
function parseVacacion(n: Novedad): { desde: string; hasta: string; dias: number } {
  const obs = n.observacion ?? '';
  const rango = obs.match(/del (\d{4}-\d{2}-\d{2}) al (\d{4}-\d{2}-\d{2})/);
  const dias = obs.match(/\((\d+) días?\)/);
  const desde = rango?.[1] ?? n.fecha.slice(0, 10);
  return {
    desde,
    hasta: rango?.[2] ?? desde,
    dias: dias ? Number(dias[1]) : 7,
  };
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

// ── Modal de solicitud ───────────────────────────────────────────────────────

interface SolicitarModalProps {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
  tipoVacaciones: TipoNovedad | null;
  miLegajo: number;
  disponibles: number;
}

function SolicitarModal({ opened, onClose, onSaved, tipoVacaciones, miLegajo, disponibles }: SolicitarModalProps) {
  const [inicio, setInicio] = useState(todayIso());
  const [dias, setDias] = useState<string | null>('7');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setInicio(todayIso());
    setDias('7');
    setError(null);
  }, [opened]);

  // Períodos de 7 días, limitados por los días disponibles
  const opcionesDias = [7, 14].filter((d) => d <= disponibles).map((d) => ({
    value: String(d), label: `${d} días`,
  }));

  const fin = dias ? addDias(inicio, Number(dias) - 1) : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tipoVacaciones || !dias || !fin) { setError('Completá todos los campos'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await createNovedad({
        id_empleado: miLegajo,
        fecha: inicio,
        tipo_novedad: tipoVacaciones.id_tipo_novedad,
        observacion: `Vacaciones del ${inicio} al ${fin} (${dias} días)`,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al solicitar');
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
      title={<Text fw={700} size="md">Solicitar vacaciones</Text>}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Las vacaciones se piden en períodos de 7 días. Tenés <b>{disponibles}</b> días disponibles este año.
          </Text>
          <TextInput
            label="Fecha de inicio"
            type="date"
            value={inicio}
            min={todayIso()}
            onChange={(e) => setInicio(e.currentTarget.value)}
            required
          />
          <Select
            label="Duración"
            data={opcionesDias}
            value={dias}
            onChange={setDias}
            required
          />
          {fin && (
            <Alert color="blue" variant="light" icon={<CalendarDays size={16} />}>
              Del <b>{formatFecha(inicio)}</b> al <b>{formatFecha(fin)}</b>
            </Alert>
          )}
          {opcionesDias.length === 0 && (
            <Alert color="orange" variant="light" icon={<AlertCircle size={16} />}>
              No te quedan días suficientes para solicitar un período de 7 días.
            </Alert>
          )}
          {error && <Alert icon={<AlertCircle size={16} />} color="red" variant="light">{error}</Alert>}
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={submitting} color="red" disabled={opcionesDias.length === 0}>
              Solicitar
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

// ── Pantalla principal ───────────────────────────────────────────────────────

export function Vacaciones() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [tipoVacaciones, setTipoVacaciones] = useState<TipoNovedad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [accionLoading, setAccionLoading] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [novs, tipos] = await Promise.all([listNovedades(), listTiposNovedad()]);
      const tipoVac = tipos.find((t) => t.descripcion.toLowerCase().includes('vacaciones')) ?? null;
      setTipoVacaciones(tipoVac);
      setNovedades(novs.filter((n) => n.tipo.descripcion.toLowerCase().includes('vacaciones')));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  // Stats propias (también para el admin, que es empleado)
  const anioActual = new Date().getFullYear();
  const misVacaciones = useMemo(
    () => novedades.filter((n) =>
      n.id_empleado === user?.legajo &&
      parseVacacion(n).desde.startsWith(String(anioActual))
    ),
    [novedades, user, anioActual]
  );

  const stats = useMemo(() => {
    const usados = misVacaciones
      .filter((n) => n.estado === 'APROBADA')
      .reduce((s, n) => s + parseVacacion(n).dias, 0);
    const pendientes = misVacaciones
      .filter((n) => n.estado === 'PENDIENTE')
      .reduce((s, n) => s + parseVacacion(n).dias, 0);
    return {
      usados,
      pendientes,
      disponibles: Math.max(0, DIAS_ANUALES - usados - pendientes),
    };
  }, [misVacaciones]);

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
            Vacaciones
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            {isAdmin
              ? 'Solicitudes de vacaciones de los empleados'
              : 'Solicitá tus vacaciones y revisá tu historial'}
          </Text>
        </Box>
        <Button color="red" leftSection={<Plus size={16} />} onClick={() => setModalOpen(true)}>
          Solicitar vacaciones
        </Button>
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
            <ThemeIcon size={48} radius="md" color="teal" variant="light"><Plane size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.disponibles}</Text>
              <Text size="sm" c="dimmed">Días disponibles {anioActual}</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="green" variant="light"><CheckCircle size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.usados}</Text>
              <Text size="sm" c="dimmed">Días aprobados</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="yellow" variant="light"><Clock size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.pendientes}</Text>
              <Text size="sm" c="dimmed">Días pendientes</Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      <Card withBorder shadow="xs" radius="md" padding={0}>
        <Group p="md" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <Text size="sm" fw={700} c="dark">
            {isAdmin ? 'Solicitudes' : 'Historial'}
          </Text>
        </Group>

        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead style={{ background: '#f8fafc' }}>
              <Table.Tr>
                {(isAdmin
                  ? ['Empleado', 'Desde', 'Hasta', 'Días', 'Estado', '']
                  : ['Desde', 'Hasta', 'Días', 'Estado', '']
                ).map((h) => (
                  <Table.Th key={h}
                    style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {h}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {novedades.map((n) => {
                const vac = parseVacacion(n);
                return (
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
                      <Text size="sm" ff="monospace">{formatFecha(vac.desde)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" ff="monospace">{formatFecha(vac.hasta)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="teal" size="sm">{vac.dias} días</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={ESTADO_COLOR[n.estado]} size="sm">
                        {ESTADO_LABEL[n.estado]}
                      </Badge>
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
                );
              })}

              {novedades.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 6 : 5}>
                    <Text ta="center" size="sm" c="dimmed" py="xl">
                      No hay solicitudes de vacaciones.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <SolicitarModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
        tipoVacaciones={tipoVacaciones}
        miLegajo={user?.legajo ?? 0}
        disponibles={stats.disponibles}
      />
    </Stack>
  );
}
