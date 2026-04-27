import { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronRight, Download, Lock, Unlock } from 'lucide-react';
import {
  Title, Text, SimpleGrid, Card, Stack, Box, Badge,
  Alert, Table, Group, Button, Select, Loader, Center,
} from '@mantine/core';
import {
  listPeriodos, getResumen, cerrarPeriodo, reabrirPeriodo, getExportUrl,
  type ResumenPeriodo, type ResumenEmpleado, type PeriodoItem,
} from '../lib/cierreApi';
import { ApiError } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

function currentPeriodo(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(periodo: string) {
  const [year, month] = periodo.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function getInitials(nombre: string) {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#6366f1', '#ef4444'];
function avatarColor(legajo: number) {
  return AVATAR_COLORS[((legajo % AVATAR_COLORS.length) + AVATAR_COLORS.length) % AVATAR_COLORS.length]!;
}

function StatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <Card withBorder shadow="xs" radius="md" padding="lg">
      <Text size="xs" fw={600} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }} mb={8}>
        {label}
      </Text>
      <Group gap={6} align="flex-end">
        <Text size="30px" fw={900} c={color} lh={1}>{value}</Text>
        <Text size="sm" c="dimmed" mb={2}>{unit}</Text>
      </Group>
    </Card>
  );
}

function DetailPanel({ r }: { r: ResumenEmpleado }) {
  const hasTardanzas = r.tardanzas.length > 0;
  const hasAusencias = r.ausencias_injustificadas > 0 || r.ausencias_justificadas > 0;
  if (!hasTardanzas && !hasAusencias) return null;
  return (
    <Box py={10} px={4} style={{ borderTop: '1px dashed #e2e8f0' }}>
      {hasTardanzas && (
        <Group gap="xs" mb={hasAusencias ? 8 : 0} align="flex-start">
          <Text size="xs" fw={700} c="orange.7" style={{ minWidth: 90, paddingTop: 2 }}>Llegadas tarde</Text>
          <Group gap={6} wrap="wrap">
            {r.tardanzas.map((t) => {
              const d = new Date(t.fecha + 'T00:00:00Z');
              const label = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
              return (
                <Box key={t.fecha} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Text size="xs" fw={700} c="orange.8">{label}</Text>
                  <Box style={{ width: 1, height: 10, background: '#fed7aa' }} />
                  <Text size="xs" c="orange.6">{t.minutos} min</Text>
                </Box>
              );
            })}
          </Group>
        </Group>
      )}
      {hasAusencias && (
        <Group gap="xs" align="flex-start">
          <Text size="xs" fw={700} c="red.7" style={{ minWidth: 90, paddingTop: 2 }}>Ausencias</Text>
          <Group gap={6} wrap="wrap">
            {r.ausencias_injustificadas > 0 && (
              <Badge variant="light" color="red" size="sm">{r.ausencias_injustificadas} injustificadas</Badge>
            )}
            {r.ausencias_justificadas > 0 && (
              <Badge variant="light" color="green" size="sm">{r.ausencias_justificadas} justificadas</Badge>
            )}
          </Group>
        </Group>
      )}
    </Box>
  );
}

export function CierreMensual() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';

  const [periodos, setPeriodos] = useState<PeriodoItem[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState(currentPeriodo());
  const [resumen, setResumen] = useState<ResumenPeriodo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLegajo, setExpandedLegajo] = useState<number | null>(null);

  async function loadResumen(periodo: string) {
    setLoading(true);
    setError(null);
    setExpandedLegajo(null);
    try {
      const [r, ps] = await Promise.all([
        getResumen(periodo),
        periodos.length ? Promise.resolve(periodos) : listPeriodos(),
      ]);
      setResumen(r);
      if (!periodos.length) setPeriodos(ps);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar el cierre');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadResumen(selectedPeriodo); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selectedPeriodo]);

  async function handleCerrar() {
    if (!resumen) return;
    setActionLoading(true);
    try {
      const updated = await cerrarPeriodo(selectedPeriodo);
      setResumen(updated);
      setPeriodos([]); // fuerza recarga de lista
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cerrar');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReabrir() {
    if (!resumen) return;
    setActionLoading(true);
    try {
      const updated = await reabrirPeriodo(selectedPeriodo);
      setResumen(updated);
      setPeriodos([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al reabrir');
    } finally {
      setActionLoading(false);
    }
  }

  function handleExport() {
    const token = localStorage.getItem('digitalcheck_token');
    // Descarga autenticada: construimos un link temporal con el token en query param
    // (alternativa simple sin fetch+blob en el cliente)
    const url = getExportUrl(selectedPeriodo);
    // Usamos fetch para llevar el header Authorization y disparar la descarga
    void fetch(url, { headers: { Authorization: `Bearer ${token ?? ''}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `cierre-${selectedPeriodo}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => setError('Error al exportar el CSV'));
  }

  const totales = resumen?.totales;

  // Períodos disponibles para el Select — incluimos siempre el actual
  const periodoOptions = (() => {
    const set = new Set(periodos.map((p) => p.periodo));
    set.add(currentPeriodo());
    return [...set]
      .sort((a, b) => b.localeCompare(a))
      .map((p) => ({ value: p, label: getMonthLabel(p) }));
  })();

  return (
    <Stack p={32} gap="lg">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} fw={900} c="dark" style={{ letterSpacing: '-0.02em' }}>Cierre Mensual</Title>
          {resumen && (
            <Group gap="sm" mt={6}>
              <Text size="sm" c="dimmed" style={{ textTransform: 'capitalize' }}>
                {getMonthLabel(selectedPeriodo)}
              </Text>
              <Badge color={resumen.estado === 'C' ? 'green' : 'yellow'} variant="light" size="sm">
                {resumen.estado === 'C' ? 'Cerrado' : 'En borrador'}
              </Badge>
            </Group>
          )}
        </Box>
        <Group gap="xs">
          <Select
            value={selectedPeriodo}
            onChange={(v) => v && setSelectedPeriodo(v)}
            data={periodoOptions}
            style={{ width: 200 }}
            size="sm"
          />
          <Button
            variant="light" color="gray" size="sm"
            leftSection={<Download size={14} />}
            onClick={handleExport}
            disabled={!resumen || resumen.estado !== 'C'}
            title={resumen?.estado !== 'C' ? 'Cerrá el período antes de exportar' : undefined}
          >
            Exportar CSV
          </Button>
          {isAdmin && resumen && (
            resumen.estado === 'B' ? (
              <Button size="sm" color="red" leftSection={<Lock size={14} />} loading={actionLoading} onClick={handleCerrar}>
                Cerrar período
              </Button>
            ) : (
              <Button size="sm" variant="light" color="gray" leftSection={<Unlock size={14} />} loading={actionLoading} onClick={handleReabrir}>
                Reabrir
              </Button>
            )
          )}
        </Group>
      </Group>

      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red" variant="light" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {resumen && (
        resumen.estado === 'C' ? (
          <Alert icon={<CheckCircle size={16} />} color="green" radius="md" title="Cierre cerrado">
            Cerrado el {formatDate(resumen.fecha_cierre!)}
          </Alert>
        ) : (
          <Alert icon={<Clock size={16} />} color="yellow" radius="md" title="Cierre en borrador">
            Pendiente de confirmación — revisá las novedades antes de cerrar
          </Alert>
        )
      )}

      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : resumen && totales ? (
        <>
          <SimpleGrid cols={4}>
            <StatCard label="Días trabajados" value={totales.dias_trabajados}  unit="total" color="blue"   />
            <StatCard label="Tardanzas"        value={totales.tardanzas}        unit="emp."  color="orange" />
            <StatCard label="Ausencias"        value={totales.ausencias}        unit="días"  color="red"    />
            <StatCard label="HS extra 50%"     value={Math.round(totales.horas_extra_50 / 60 * 10) / 10} unit="hs." color="violet" />
          </SimpleGrid>

          <Card withBorder shadow="xs" radius="md" padding={0}>
            <Box px="md" py="sm" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <Text size="sm" fw={700} c="dark">Resumen por empleado</Text>
              <Text size="xs" c="dimmed" mt={2}>
                {getMonthLabel(selectedPeriodo)} — {resumen.empleados.length} empleados activos
              </Text>
            </Box>

            <Table striped highlightOnHover withColumnBorders={false} verticalSpacing="sm">
              <Table.Thead style={{ background: '#f8fafc' }}>
                <Table.Tr>
                  {['Empleado', 'Días trab.', 'Llegadas tarde', 'Ausencias', 'HS extra 50%', 'HS extra 100%'].map((h) => (
                    <Table.Th key={h} style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {resumen.empleados.map((emp) => {
                  const isExpanded = expandedLegajo === emp.legajo;
                  const hasDetail = emp.tardanzas.length > 0 || emp.ausencias_injustificadas > 0 || emp.ausencias_justificadas > 0;
                  return (
                    <Table.Tr
                      key={emp.legajo}
                      onClick={() => hasDetail && setExpandedLegajo(isExpanded ? null : emp.legajo)}
                      style={{ cursor: hasDetail ? 'pointer' : 'default' }}
                    >
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Box style={{ width: 16, flexShrink: 0, color: '#94a3b8' }}>
                            {hasDetail ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                          </Box>
                          <Box style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(emp.legajo), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {getInitials(emp.nombre)}
                          </Box>
                          <Stack gap={0}>
                            <Text size="sm" fw={600} c="dark">{emp.nombre}</Text>
                            <Text size="xs" c="dimmed">#{emp.legajo}</Text>
                          </Stack>
                        </Group>
                        {isExpanded && <DetailPanel r={emp} />}
                      </Table.Td>
                      <Table.Td style={{ verticalAlign: 'top', paddingTop: 14 }}>
                        <Text size="sm" fw={700} c="dark">{emp.dias_trabajados}</Text>
                      </Table.Td>
                      <Table.Td style={{ verticalAlign: 'top', paddingTop: 12 }}>
                        {emp.tardanzas.length > 0
                          ? <Badge variant="light" color="orange" size="sm">{emp.tardanzas.length}</Badge>
                          : <Text size="sm" c="gray.4">—</Text>}
                      </Table.Td>
                      <Table.Td style={{ verticalAlign: 'top', paddingTop: 12 }}>
                        {emp.ausencias_injustificadas + emp.ausencias_justificadas > 0 ? (
                          <Group gap={4}>
                            {emp.ausencias_injustificadas > 0 && <Badge variant="light" color="red" size="sm">{emp.ausencias_injustificadas}</Badge>}
                            {emp.ausencias_justificadas > 0 && <Badge variant="light" color="green" size="sm">{emp.ausencias_justificadas} just.</Badge>}
                          </Group>
                        ) : <Text size="sm" c="gray.4">—</Text>}
                      </Table.Td>
                      <Table.Td style={{ verticalAlign: 'top', paddingTop: 12 }}>
                        {emp.horas_extra_50 > 0
                          ? <Badge variant="light" color="violet">{Math.round(emp.horas_extra_50 / 60 * 10) / 10}h</Badge>
                          : <Text size="sm" c="gray.4">—</Text>}
                      </Table.Td>
                      <Table.Td style={{ verticalAlign: 'top', paddingTop: 12 }}>
                        {emp.horas_extra_100 > 0
                          ? <Badge variant="light" color="grape">{Math.round(emp.horas_extra_100 / 60 * 10) / 10}h</Badge>
                          : <Text size="sm" c="gray.4">—</Text>}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>

            {resumen.estado === 'B' && isAdmin && (
              <Group px="md" py="sm" gap="xs" style={{ borderTop: '1px solid #f1f5f9', background: '#fffbeb' }}>
                <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
                <Text size="xs" c="yellow.9">El cierre está en borrador — revisá los datos antes de confirmar.</Text>
              </Group>
            )}
          </Card>
        </>
      ) : null}
    </Stack>
  );
}
