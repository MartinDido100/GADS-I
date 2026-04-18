import { useState } from 'react';
import {
  Title, Text, SimpleGrid, Card, Group, Stack, TextInput,
  SegmentedControl, Table, Badge, Box, ThemeIcon,
} from '@mantine/core';
import { Search, UserCheck, UserX, Users } from 'lucide-react';
import { empleados } from '../data/mockData';

function getInitials(nombre: string) {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const AVATAR_COLORS = [
  '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
  '#10b981', '#6366f1', '#ef4444',
];
function avatarColor(legajo: number) {
  return AVATAR_COLORS[legajo % AVATAR_COLORS.length];
}

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
      <Box>
        <Title order={2} fw={900} c="dark" style={{ letterSpacing: '-0.02em' }}>
          Configuración de Empleados
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Gestioná los datos y turnos de cada empleado
        </Text>
      </Box>

      {/* Stat cards */}
      <SimpleGrid cols={3}>
        <StatCard icon={<Users size={22} />} label="Total de empleados" value={empleados.length} color="blue" />
        <StatCard icon={<UserCheck size={22} />} label="Activos" value={totalActivos} color="green" />
        <StatCard icon={<UserX size={22} />} label="Inactivos" value={totalInactivos} color="gray" />
      </SimpleGrid>

      {/* Table card */}
      <Card withBorder shadow="xs" radius="md" padding={0}>
        {/* Toolbar */}
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
              { label: 'Todos', value: 'todos' },
              { label: 'Activos', value: 'activos' },
              { label: 'Inactivos', value: 'inactivos' },
            ]}
            size="sm"
          />
        </Group>

        {/* Table */}
        <Table striped highlightOnHover withColumnBorders={false} verticalSpacing="sm">
          <Table.Thead style={{ background: '#f8fafc' }}>
            <Table.Tr>
              <Table.Th style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Legajo</Table.Th>
              <Table.Th style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Empleado</Table.Th>
              <Table.Th style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Categoría</Table.Th>
              <Table.Th style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha de ingreso</Table.Th>
              <Table.Th style={{ color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estado</Table.Th>
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
                  {emp.activo ? (
                    <Badge variant="light" color="green">Activo</Badge>
                  ) : (
                    <Badge variant="light" color="gray">Inactivo</Badge>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}

            {filtered.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" size="sm" c="dimmed" py="xl">
                    No se encontraron empleados que coincidan con la búsqueda.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        {/* Footer */}
        <Box px="md" py="sm" style={{ borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
          <Text size="xs" c="dimmed">
            Mostrando <strong>{filtered.length}</strong> de <strong>{empleados.length}</strong> empleados
          </Text>
        </Box>
      </Card>
    </Stack>
  );
}
