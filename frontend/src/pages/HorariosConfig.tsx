import { useEffect, useState } from 'react';
import {
  Title, Text, Card, Group, Stack, Button, Box, Badge, Loader, Center, Alert,
  Table, Menu, ActionIcon, ThemeIcon, SimpleGrid,
} from '@mantine/core';
import {
  Plus, MoreVertical, Edit, Power, AlertCircle, Clock,
} from 'lucide-react';
import {
  listHorarios, desactivarHorario, reactivarHorario,
  type Horario,
} from '../lib/horariosApi';
import { ApiError } from '../lib/api';
import { HorarioFormModal } from '../components/HorarioFormModal';

export function HorariosConfig() {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Horario | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setHorarios(await listHorarios());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function handleSaved(saved: Horario) {
    setHorarios((prev) => {
      const i = prev.findIndex((h) => h.id === saved.id);
      if (i === -1) return [...prev, saved].sort((a, b) => a.id - b.id);
      const copy = [...prev];
      copy[i] = saved;
      return copy;
    });
  }

  async function toggleActivo(h: Horario) {
    try {
      const updated = h.activo ? await desactivarHorario(h.id) : await reactivarHorario(h.id);
      handleSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error');
    }
  }

  const totalActivos = horarios.filter((h) => h.activo).length;

  return (
    <Stack p={32} gap="lg">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} fw={900} c="dark" style={{ letterSpacing: '-0.02em' }}>
            Horarios y Turnos
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Configurá los horarios de trabajo y sus tolerancias
          </Text>
        </Box>
        <Button
          color="red"
          leftSection={<Plus size={16} />}
          onClick={() => { setEditing(null); setModalOpen(true); }}
        >
          Nuevo horario
        </Button>
      </Group>

      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red" radius="md" variant="light"
          withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <SimpleGrid cols={2}>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="blue" variant="light"><Clock size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{horarios.length}</Text>
              <Text size="sm" c="dimmed">Horarios totales</Text>
            </Stack>
          </Group>
        </Card>
        <Card withBorder shadow="xs" radius="md" padding="lg">
          <Group gap="md">
            <ThemeIcon size={48} radius="md" color="green" variant="light"><Power size={22} /></ThemeIcon>
            <Stack gap={2}>
              <Text size="28px" fw={900} lh={1} c="dark">{totalActivos}</Text>
              <Text size="sm" c="dimmed">Activos</Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      <Card withBorder shadow="xs" radius="md" padding={0}>
        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : (
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead style={{ background: '#f8fafc' }}>
              <Table.Tr>
                {['ID', 'Descripción', 'Entrada', 'Retiro', 'Tolerancias', 'Umbral HE', 'Estado', ''].map((h) => (
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
              {horarios.map((h) => (
                <Table.Tr key={h.id}>
                  <Table.Td>
                    <Text size="sm" ff="monospace" c="dimmed" fw={600}>#{h.id}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={600} c="dark">{h.descripcion}</Text>
                    {h.horas_a_trabajar !== null && (
                      <Text size="xs" c="dimmed">Flexible · {h.horas_a_trabajar} min</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">{h.horario_entrada}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">{h.horario_retiro}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      +{h.tolerancia_entrada} / -{h.tolerancia_retiro} min
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">{h.umbral_horas_extras} min</Text>
                  </Table.Td>
                  <Table.Td>
                    {h.activo
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
                        <Menu.Item
                          leftSection={<Edit size={14} />}
                          onClick={() => { setEditing(h); setModalOpen(true); }}
                        >
                          Editar
                        </Menu.Item>
                        <Menu.Item
                          color={h.activo ? 'red' : 'green'}
                          leftSection={<Power size={14} />}
                          onClick={() => void toggleActivo(h)}
                        >
                          {h.activo ? 'Desactivar' : 'Reactivar'}
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Table.Td>
                </Table.Tr>
              ))}

              {horarios.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text ta="center" size="sm" c="dimmed" py="xl">
                      Aún no hay horarios cargados.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <HorarioFormModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        horario={editing}
      />
    </Stack>
  );
}
