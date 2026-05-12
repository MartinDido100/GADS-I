import { useEffect, useMemo, useState } from 'react';
import {
  Title, Text, Card, Group, Stack, Button, Box, Badge, Loader, Center, Alert,
  Table, ThemeIcon, SimpleGrid, SegmentedControl, TextInput,
} from '@mantine/core';
import {
  Plus, AlertCircle, LogIn, LogOut, Bell, Search, Calendar, UtensilsCrossed,
} from 'lucide-react';
import { listFichadas, fichadaAlmuerzo, createFichada, type Fichada } from '../lib/fichadasApi';
import { listEmpleados } from '../lib/empleadosApi';
import { ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';
import { RegistrarFichadaModal } from '../components/RegistrarFichadaModal';
import type { Empleado } from '../types';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getInitials(nombre: string) {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#6366f1', '#ef4444'];
function avatarColor(legajo: number) {
  const idx = ((legajo % AVATAR_COLORS.length) + AVATAR_COLORS.length) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx]!;
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

const ORIGEN_LABEL: Record<string, string> = {
  BIOMETRICO: 'Biométrico',
  MANUAL: 'Manual',
  QR: 'QR',
  API: 'API',
};

const ORIGEN_COLOR: Record<string, string> = {
  BIOMETRICO: 'cyan',
  MANUAL: 'orange',
  QR: 'violet',
  API: 'gray',
};

// ── Panel de almuerzo ──────────────────────────────────────────────────────

interface AlmuerzoBtnProps {
  legajo: number;
  nombre: string;
  onFichado: () => void;
}

// isAdmin=true → usa createFichada (ADMIN, legajo explícito)
// isAdmin=false → usa fichadaAlmuerzo (cualquier auth, usa legajo del token)
function AlmuerzoPanel({ legajo, nombre, onFichado, isAdmin = false }: AlmuerzoBtnProps & { isAdmin?: boolean }) {
  // null = cargando, 'fuera' = está almorzando (última MANUAL del día fue S), 'dentro' = no salió o ya volvió
  const [estado, setEstado] = useState<'dentro' | 'fuera' | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Determina el estado actual consultando las fichadas MANUAL del día
  async function refreshEstado() {
    try {
      const hoy = todayIso();
      const fichadas = await listFichadas({ legajo, desde: hoy, hasta: hoy });
      // Busca la última fichada MANUAL activa del día (las de almuerzo son MANUAL)
      const manuales = fichadas
        .filter((f) => f.activo && f.origen === 'MANUAL')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const ultima = manuales[0];
      setEstado(!ultima || ultima.entrada_salida === 'E' ? 'dentro' : 'fuera');
    } catch {
      setEstado('dentro'); // fallback: mostrar "salir"
    }
  }

  useEffect(() => { void refreshEstado(); }, [legajo]); // eslint-disable-line react-hooks/exhaustive-deps

  async function registrar(tipo: 'S' | 'E', label: string) {
    setLoading(true);
    setMsg(null);
    try {
      if (isAdmin) {
        await createFichada({
          id_empleado: legajo,
          timestamp: new Date().toISOString(),
          entrada_salida: tipo,
          origen: 'MANUAL',
        });
      } else {
        await fichadaAlmuerzo(tipo);
      }
      setEstado(tipo === 'S' ? 'fuera' : 'dentro');
      setMsg({ text: `${label} registrada`, ok: true });
      onFichado();
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ text: err instanceof ApiError ? err.message : 'Error', ok: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card withBorder radius="md" padding="md" style={{ borderColor: '#fef3c7', background: '#fffbeb' }}>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm">
          <ThemeIcon size={36} radius="md" color="yellow" variant="light">
            <UtensilsCrossed size={18} />
          </ThemeIcon>
          <Stack gap={0}>
            <Text size="sm" fw={700} c="dark">Almuerzo</Text>
            <Text size="xs" c="dimmed">{nombre}</Text>
          </Stack>
        </Group>
        {estado === null ? (
          <Loader size="xs" color="yellow" />
        ) : estado === 'dentro' ? (
          <Button
            size="xs"
            color="yellow"
            variant="filled"
            loading={loading}
            onClick={() => void registrar('S', 'Salida almuerzo')}
          >
            Salir a almorzar
          </Button>
        ) : (
          <Button
            size="xs"
            color="teal"
            variant="filled"
            loading={loading}
            onClick={() => void registrar('E', 'Regreso almuerzo')}
          >
            Regresar de almuerzo
          </Button>
        )}
      </Group>
      {msg && (
        <Text size="xs" mt={6} c={msg.ok ? 'teal' : 'red'} fw={500}>
          {msg.text}
        </Text>
      )}
    </Card>
  );
}

// ── Admin: panel para todos los empleados activos ─────────────────────────

function AlmuerzoPanelAdmin({ onFichado }: { onFichado: () => void }) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    listEmpleados({ activo: true })
      .then((all) => setEmpleados(all.sort((a, b) => a.legajo - b.legajo)))
      .catch(() => {});
  }, []);

  return (
    <Stack gap="xs">
      <Group>
        <Button
          size="xs"
          variant="light"
          color="yellow"
          leftSection={<UtensilsCrossed size={14} />}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Ocultar registro de almuerzo' : 'Registrar almuerzo / regreso'}
        </Button>
      </Group>
      {expanded && (
        <SimpleGrid cols={2} spacing="sm">
          {empleados.map((e) => (
            <AlmuerzoPanel key={e.legajo} legajo={e.legajo} nombre={e.nombre} onFichado={onFichado} isAdmin />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

// ── Página principal ───────────────────────────────────────────────────────

export function CentroNotificaciones() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  const [fichadas, setFichadas] = useState<Fichada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rango, setRango] = useState<'hoy' | 'semana' | 'todos'>('hoy');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const filter: { desde?: string; hasta?: string } = {};
      if (rango === 'hoy') {
        filter.desde = todayIso();
        filter.hasta = todayIso();
      } else if (rango === 'semana') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        filter.desde = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
      setFichadas(await listFichadas(filter));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar fichadas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [rango]);

  const filtered = useMemo(() => {
    if (!search) return fichadas;
    const s = search.toLowerCase();
    return fichadas.filter((f) =>
      f.empleado.nombre.toLowerCase().includes(s) ||
      String(f.empleado.legajo).includes(s)
    );
  }, [fichadas, search]);

  const stats = useMemo(() => {
    const activas = fichadas.filter((f) => f.activo);
    return {
      total: activas.length,
      entradas: activas.filter((f) => f.entrada_salida === 'E').length,
      salidas: activas.filter((f) => f.entrada_salida === 'S').length,
    };
  }, [fichadas]);

  return (
    <Stack p={32} gap="lg">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} fw={900} c="dark" style={{ letterSpacing: '-0.02em' }}>
            Centro de Notificaciones
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            {isAdmin
              ? 'Fichadas y novedades del día por empleado'
              : 'Tus fichadas y novedades recientes'}
          </Text>
        </Box>
        {isAdmin && (
          <Button color="red" leftSection={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            Registrar fichada
          </Button>
        )}
      </Group>

      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red" radius="md" variant="light"
          withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <SimpleGrid cols={3}>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="blue" variant="light"><Bell size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.total}</Text>
              <Text size="sm" c="dimmed">Fichadas activas</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="green" variant="light"><LogIn size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.entradas}</Text>
              <Text size="sm" c="dimmed">Entradas</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="orange" variant="light"><LogOut size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{stats.salidas}</Text>
              <Text size="sm" c="dimmed">Salidas</Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Almuerzo: empleado ve el suyo, admin ve panel expandible para todos */}
      {isAdmin ? (
        <AlmuerzoPanelAdmin onFichado={() => void load()} />
      ) : (
        user && (
          <AlmuerzoPanel legajo={user.legajo} nombre={user.nombre} onFichado={() => void load()} />
        )
      )}

      <Card withBorder shadow="xs" radius="md" padding={0}>
        <Group p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="nowrap">
          {isAdmin && (
            <TextInput
              placeholder="Buscar por nombre o legajo..."
              leftSection={<Search size={14} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, maxWidth: 320 }}
            />
          )}
          <Group gap="xs" ml="auto">
            <Calendar size={14} color="#94a3b8" />
            <SegmentedControl
              value={rango}
              onChange={(v) => setRango(v as 'hoy' | 'semana' | 'todos')}
              data={[
                { label: 'Hoy', value: 'hoy' },
                { label: 'Última semana', value: 'semana' },
                { label: 'Todas', value: 'todos' },
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
                  ? ['Empleado', 'Tipo', 'Hora', 'Fecha', 'Origen', 'Estado']
                  : ['Tipo', 'Hora', 'Fecha', 'Origen', 'Estado']
                ).map((h) => (
                  <Table.Th
                    key={h}
                    style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
                    {h}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map((f) => (
                <Table.Tr key={f.identidad} style={{ opacity: f.activo ? 1 : 0.55 }}>
                  {isAdmin && (
                    <Table.Td>
                      <Group gap="sm" wrap="nowrap">
                        <Box
                          style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: avatarColor(f.empleado.legajo),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}
                        >
                          {getInitials(f.empleado.nombre)}
                        </Box>
                        <Stack gap={0}>
                          <Text size="sm" fw={600} c="dark">{f.empleado.nombre}</Text>
                          <Text size="xs" c="dimmed">#{f.empleado.legajo}</Text>
                        </Stack>
                      </Group>
                    </Table.Td>
                  )}

                  <Table.Td>
                    {f.entrada_salida === 'E' ? (
                      <Badge variant="light" color="green" leftSection={<LogIn size={10} />}>
                        Entrada
                      </Badge>
                    ) : (
                      <Badge variant="light" color="orange" leftSection={<LogOut size={10} />}>
                        Salida
                      </Badge>
                    )}
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm" ff="monospace" fw={600}>{formatHora(f.timestamp)}</Text>
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm" c="dimmed">{formatFecha(f.timestamp)}</Text>
                  </Table.Td>

                  <Table.Td>
                    <Badge variant="light" color={ORIGEN_COLOR[f.origen] ?? 'gray'} size="sm">
                      {ORIGEN_LABEL[f.origen] ?? f.origen}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    {f.id_correccion !== null ? (
                      <Badge variant="light" color="violet" size="sm">Corrección</Badge>
                    ) : f.activo ? (
                      <Badge variant="light" color="gray" size="sm">Original</Badge>
                    ) : (
                      <Badge variant="light" color="red" size="sm">Reemplazada</Badge>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}

              {filtered.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={isAdmin ? 6 : 5}>
                    <Text ta="center" size="sm" c="dimmed" py="xl">
                      No hay fichadas en este período.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <RegistrarFichadaModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => { void load(); }}
      />
    </Stack>
  );
}
