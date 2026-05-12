import { useEffect, useState } from 'react';
import {
  Title, Text, SimpleGrid, Card, Group, Stack, TextInput, Button,
  SegmentedControl, Table, Badge, Box, ThemeIcon, Loader, Center,
  Menu, ActionIcon, Alert, Modal, PasswordInput,
} from '@mantine/core';
import {
  Search, UserCheck, UserX, Users, Plus, MoreVertical,
  Edit, UserMinus, UserPlus, AlertCircle, Calendar, KeyRound,
} from 'lucide-react';
import type { Empleado, Rol } from '../types';
import {
  listEmpleados, bajaEmpleado, reactivarEmpleado, setPasswordEmpleado,
} from '../lib/empleadosApi';
import { ApiError } from '../lib/api';
import { EmpleadoFormModal } from '../components/EmpleadoFormModal';
import { AsignarTurnosModal } from '../components/AsignarTurnosModal';

function getInitials(nombre: string) {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

const AVATAR_COLORS = [
  '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
  '#10b981', '#6366f1', '#ef4444',
];
function avatarColor(legajo: number) {
  const idx = ((legajo % AVATAR_COLORS.length) + AVATAR_COLORS.length) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx]!;
}

const ROL_BADGE: Record<Rol, { color: string; label: string }> = {
  EMPLEADO:      { color: 'gray',   label: 'Empleado' },
  ADMINISTRADOR: { color: 'red',    label: 'Administrador' },
  CONTADOR:      { color: 'violet', label: 'Contador' },
};

function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card withBorder shadow="xs" radius="md" padding="lg">
      <Group gap="md">
        <ThemeIcon size={48} radius="md" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <Stack gap={2}>
          <Text size="28px" fw={900} lh={1} c="dark">
            {value}
          </Text>
          <Text size="sm" c="dimmed">{label}</Text>
        </Stack>
      </Group>
    </Card>
  );
}

export function EmpleadosConfig() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Empleado | null>(null);
  const [turnosOpen, setTurnosOpen] = useState(false);
  const [turnosFor, setTurnosFor] = useState<Empleado | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdFor, setPwdFor] = useState<Empleado | null>(null);
  const [pwdValue, setPwdValue] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listEmpleados();
      setEmpleados(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(emp: Empleado) {
    setEditing(emp);
    setModalOpen(true);
  }

  function handleSaved(saved: Empleado) {
    setEmpleados((prev) => {
      const i = prev.findIndex((e) => e.legajo === saved.legajo);
      if (i === -1) return [...prev, saved].sort((a, b) => a.legajo - b.legajo);
      const copy = [...prev];
      copy[i] = saved;
      return copy;
    });
  }

  async function handleBaja(emp: Empleado) {
    try {
      const updated = await bajaEmpleado(emp.legajo);
      handleSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al dar de baja');
    }
  }

  function openSetPassword(emp: Empleado) {
    setPwdFor(emp);
    setPwdValue('');
    setPwdConfirm('');
    setPwdError(null);
    setPwdOpen(true);
  }

  async function handleSetPassword() {
    if (!pwdFor) return;
    if (pwdValue.length < 6) { setPwdError('Mínimo 6 caracteres'); return; }
    if (pwdValue !== pwdConfirm) { setPwdError('Las contraseñas no coinciden'); return; }
    setPwdError(null);
    setPwdLoading(true);
    try {
      await setPasswordEmpleado(pwdFor.legajo, pwdValue);
      setPwdOpen(false);
    } catch (err) {
      setPwdError(err instanceof ApiError ? err.message : 'Error al guardar');
    } finally {
      setPwdLoading(false);
    }
  }

  async function handleReactivar(emp: Empleado) {
    try {
      const updated = await reactivarEmpleado(emp.legajo);
      handleSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al reactivar');
    }
  }

  const filtered = empleados.filter((e) => {
    const matchesSearch =
      e.nombre.toLowerCase().includes(search.toLowerCase()) ||
      String(e.legajo).includes(search);
    const matchesFilter =
      filter === 'todos' ||
      (filter === 'activos' && e.activo) ||
      (filter === 'inactivos' && !e.activo);
    return matchesSearch && matchesFilter;
  });

  const totalActivos = empleados.filter((e) => e.activo).length;
  const totalInactivos = empleados.filter((e) => !e.activo).length;

  return (
    <Stack p={32} gap="lg">
      {/* Header */}
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} fw={900} c="dark" style={{ letterSpacing: '-0.02em' }}>
            Configuración de Empleados
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Gestioná los datos y turnos de cada empleado
          </Text>
        </Box>
        <Button color="red" leftSection={<Plus size={16} />} onClick={openCreate}>
          Nuevo empleado
        </Button>
      </Group>

      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red" radius="md" variant="light"
          withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stat cards */}
      <SimpleGrid cols={3}>
        <StatCard icon={<Users size={22} />}     label="Total de empleados" value={empleados.length}  color="blue"  />
        <StatCard icon={<UserCheck size={22} />} label="Activos"            value={totalActivos}     color="green" />
        <StatCard icon={<UserX size={22} />}     label="Inactivos"          value={totalInactivos}   color="gray"  />
      </SimpleGrid>

      {/* Table card */}
      <Card withBorder shadow="xs" radius="md" padding={0}>
        <Group p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="nowrap">
          <TextInput
            placeholder="Buscar por nombre o legajo..."
            leftSection={<Search size={14} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, maxWidth: 320 }}
          />
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            data={[
              { label: 'Todos',     value: 'todos'     },
              { label: 'Activos',   value: 'activos'   },
              { label: 'Inactivos', value: 'inactivos' },
            ]}
            size="sm"
          />
        </Group>

        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : (
          <Table striped highlightOnHover withColumnBorders={false} verticalSpacing="sm">
            <Table.Thead style={{ background: '#f8fafc' }}>
              <Table.Tr>
                {['Legajo', 'Empleado', 'Rol', 'Categoría', 'Fecha de ingreso', 'Estado', ''].map((h) => (
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
              {filtered.map((emp) => (
                <Table.Tr key={emp.legajo}>
                  <Table.Td>
                    <Text size="sm" ff="monospace" c="dimmed" fw={600}>#{emp.legajo}</Text>
                  </Table.Td>

                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Box
                        style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: avatarColor(emp.legajo),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        {getInitials(emp.nombre)}
                      </Box>
                      <Stack gap={0}>
                        <Text size="sm" fw={600} c="dark">{emp.nombre}</Text>
                        <Text size="xs" c="dimmed">CUIL {emp.cuil}</Text>
                      </Stack>
                    </Group>
                  </Table.Td>

                  <Table.Td>
                    <Badge variant="light" color={ROL_BADGE[emp.rol].color}>
                      {ROL_BADGE[emp.rol].label}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge variant="light" color="gray">Cat. {emp.categoria_laboral}</Badge>
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm" c="dark.2">
                      {parseLocalDate(emp.fecha_ingreso).toLocaleDateString('es-AR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    {emp.activo
                      ? <Badge variant="light" color="green">Activo</Badge>
                      : <Badge variant="light" color="gray">Inactivo</Badge>
                    }
                  </Table.Td>

                  <Table.Td style={{ width: 50 }}>
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" aria-label="Acciones">
                          <MoreVertical size={16} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item leftSection={<Edit size={14} />} onClick={() => openEdit(emp)}>
                          Editar
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<Calendar size={14} />}
                          onClick={() => { setTurnosFor(emp); setTurnosOpen(true); }}
                        >
                          Asignar turnos
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<KeyRound size={14} />}
                          onClick={() => openSetPassword(emp)}
                        >
                          Establecer contraseña
                        </Menu.Item>
                        {emp.activo ? (
                          <Menu.Item
                            color="red"
                            leftSection={<UserMinus size={14} />}
                            onClick={() => void handleBaja(emp)}
                          >
                            Dar de baja
                          </Menu.Item>
                        ) : (
                          <Menu.Item
                            color="green"
                            leftSection={<UserPlus size={14} />}
                            onClick={() => void handleReactivar(emp)}
                          >
                            Reactivar
                          </Menu.Item>
                        )}
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}

              {filtered.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text ta="center" size="sm" c="dimmed" py="xl">
                      No se encontraron empleados que coincidan con la búsqueda.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}

        <Box px="md" py="sm" style={{ borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
          <Text size="xs" c="dimmed">
            Mostrando <strong>{filtered.length}</strong> de <strong>{empleados.length}</strong> empleados
          </Text>
        </Box>
      </Card>

      <EmpleadoFormModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        empleado={editing}
      />

      <AsignarTurnosModal
        opened={turnosOpen}
        onClose={() => setTurnosOpen(false)}
        empleado={turnosFor}
      />

      <Modal
        opened={pwdOpen}
        onClose={() => setPwdOpen(false)}
        title={
          <Group gap="xs">
            <KeyRound size={16} />
            <Text fw={700} size="md">
              Establecer contraseña — {pwdFor?.nombre}
            </Text>
          </Group>
        }
        centered
        size="sm"
      >
        <Stack gap="md">
          <PasswordInput
            label="Nueva contraseña"
            placeholder="Mínimo 6 caracteres"
            value={pwdValue}
            onChange={(e) => setPwdValue(e.currentTarget.value)}
          />
          <PasswordInput
            label="Confirmar contraseña"
            placeholder="Repetí la contraseña"
            value={pwdConfirm}
            onChange={(e) => setPwdConfirm(e.currentTarget.value)}
          />
          {pwdError && (
            <Alert icon={<AlertCircle size={14} />} color="red" variant="light" radius="md">
              {pwdError}
            </Alert>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={() => setPwdOpen(false)}>
              Cancelar
            </Button>
            <Button color="red" loading={pwdLoading} onClick={() => void handleSetPassword()}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
