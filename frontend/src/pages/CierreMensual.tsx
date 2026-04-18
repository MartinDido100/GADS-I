import { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Title, Text, SimpleGrid, Card, Stack, Box, Badge,
  Alert, Table, Group,
} from '@mantine/core';
import { cierresMensuales, empleados, resumenCierre, defaultResumen } from '../data/mockData';
import type { ResumenEmpleadoPeriodo } from '../types';

function getMonthLabel(periodo: string) {
  const [year, month] = periodo.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function parseLocalDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getInitials(nombre: string) {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#0ea5e9', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
  '#10b981', '#6366f1', '#ef4444',
];
function avatarColor(legajo: number) {
  return AVATAR_COLORS[legajo % AVATAR_COLORS.length];
}

function getCurrentPeriodo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
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

function DetailPanel({ r }: { r: ResumenEmpleadoPeriodo }) {
  const hasTardanzas = r.tardanzas.length > 0;
  const hasAusencias = r.ausencias.length > 0;
  return (
    <Box py={10} px={4} style={{ borderTop: '1px dashed #e2e8f0' }}>
      {hasTardanzas && (
        <Group gap="xs" mb={hasAusencias ? 8 : 0} align="flex-start">
          <Text size="xs" fw={700} c="orange.7" style={{ minWidth: 90, paddingTop: 2 }}>
            Llegadas tarde
          </Text>
          <Group gap={6} wrap="wrap">
            {r.tardanzas.map((t) => {
              const d = parseLocalDate(t.fecha);
              const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
              return (
              <Box
                key={t.fecha}
                style={{
                  background: '#fff7ed',
                  border: '1px solid #fed7aa',
                  borderRadius: 6,
                  padding: '3px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text size="xs" fw={700} c="orange.8" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {label}
                </Text>
                <Box style={{ width: 1, height: 10, background: '#fed7aa' }} />
                <Text size="xs" c="orange.6" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {t.minutos} min
                </Text>
              </Box>
              );
            })}
          </Group>
        </Group>
      )}
      {hasAusencias && (
        <Group gap="xs" align="flex-start">
          <Text size="xs" fw={700} c="red.7" style={{ minWidth: 90, paddingTop: 2 }}>
            Ausencias
          </Text>
          <Group gap={6} wrap="wrap">
            {r.ausencias.map((fecha) => {
              const d = parseLocalDate(fecha);
              const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
              return (
              <Box
                key={fecha}
                style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: 6,
                  padding: '3px 10px',
                }}
              >
                <Text size="xs" fw={700} c="red.8" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {label}
                </Text>
              </Box>
              );
            })}
          </Group>
        </Group>
      )}
    </Box>
  );
}

export function CierreMensual() {
  const [expandedLegajo, setExpandedLegajo] = useState<number | null>(null);

  const periodoActual = getCurrentPeriodo();
  const cierre =
    cierresMensuales.find((c) => c.periodo === periodoActual) ??
    cierresMensuales[cierresMensuales.length - 1];
  const periodo = cierre.periodo;

  const empleadosActivos = empleados.filter((e) => e.activo);
  const resumenPeriodo = resumenCierre[periodo] ?? {};

  const totales = empleadosActivos.reduce(
    (acc, emp) => {
      const r = resumenPeriodo[emp.legajo] ?? defaultResumen;
      return {
        diasTrabajados: acc.diasTrabajados + r.diasTrabajados,
        conTardanzas: acc.conTardanzas + (r.tardanzas.length > 0 ? 1 : 0),
        ausencias: acc.ausencias + r.ausencias.length,
        horasExtra: acc.horasExtra + r.horasExtra50,
      };
    },
    { diasTrabajados: 0, conTardanzas: 0, ausencias: 0, horasExtra: 0 }
  );

  return (
    <Stack p={32} gap="lg">
      {/* Header */}
      <Box>
        <Title order={2} fw={900} c="dark" style={{ letterSpacing: '-0.02em' }}>
          Cierre Mensual
        </Title>
        <Group gap="sm" mt={6} align="center">
          <Text size="sm" c="dimmed" style={{ textTransform: 'capitalize' }}>
            {getMonthLabel(periodo)}
          </Text>
          <Badge
            color={cierre.estado === 'C' ? 'green' : 'yellow'}
            variant="light"
            size="sm"
          >
            {cierre.estado === 'C' ? 'Cerrado' : 'En borrador'}
          </Badge>
        </Group>
      </Box>

      {/* Status alert */}
      {cierre.estado === 'C' ? (
        <Alert icon={<CheckCircle size={16} />} color="green" radius="md" title="Cierre cerrado">
          Cerrado el{' '}
          {parseLocalDate(cierre.fecha_cierre!).toLocaleDateString('es-AR', {
            day: '2-digit', month: 'long', year: 'numeric',
          })}
        </Alert>
      ) : (
        <Alert icon={<Clock size={16} />} color="yellow" radius="md" title="Cierre en borrador">
          Pendiente de confirmación — revisá las novedades antes de cerrar
        </Alert>
      )}

      {/* Stat cards */}
      <SimpleGrid cols={4}>
        <StatCard label="Días trabajados" value={totales.diasTrabajados} unit="total"  color="blue"   />
        <StatCard label="Con tardanzas"   value={totales.conTardanzas}   unit="emp."   color="orange"  />
        <StatCard label="Ausencias"       value={totales.ausencias}      unit="días"   color="red"     />
        <StatCard label="Hs. extra 50%"   value={totales.horasExtra}     unit="hs."    color="violet"  />
      </SimpleGrid>

      {/* Employee table */}
      <Card withBorder shadow="xs" radius="md" padding={0}>
        <Box px="md" py="sm" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <Text size="sm" fw={700} c="dark">Resumen por empleado</Text>
          <Text size="xs" c="dimmed" mt={2}>
            {getMonthLabel(periodo)} — {empleadosActivos.length} empleados activos · Hacé clic en una fila para ver el detalle
          </Text>
        </Box>

        <Table striped highlightOnHover withColumnBorders={false} verticalSpacing="sm">
          <Table.Thead style={{ background: '#f8fafc' }}>
            <Table.Tr>
              {['Empleado', 'Días trab.', 'Llegadas tarde', 'Ausencias', 'Hs. extra 50%'].map((h) => (
                <Table.Th
                  key={h}
                  style={{
                    color: '#94a3b8', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}
                >
                  {h}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {empleadosActivos.map((emp) => {
              const r = resumenPeriodo[emp.legajo] ?? defaultResumen;
              const isExpanded = expandedLegajo === emp.legajo;
              const hasDetail = r.tardanzas.length > 0 || r.ausencias.length > 0;

              return (
                <Table.Tr
                  key={emp.legajo}
                  onClick={() => hasDetail && setExpandedLegajo(isExpanded ? null : emp.legajo)}
                  style={{ cursor: hasDetail ? 'pointer' : 'default' }}
                >
                  {/* Empleado */}
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Box style={{ width: 16, flexShrink: 0, color: '#94a3b8' }}>
                        {hasDetail
                          ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
                          : null}
                      </Box>
                      <Box
                        style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: avatarColor(emp.legajo),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}
                      >
                        {getInitials(emp.nombre)}
                      </Box>
                      <Stack gap={0}>
                        <Text size="sm" fw={600} c="dark">{emp.nombre}</Text>
                        <Text size="xs" c="dimmed">#{emp.legajo}</Text>
                      </Stack>

                      {/* Expanded detail inline below name */}
                      {isExpanded && (
                        <Box style={{ position: 'absolute', display: 'none' }} />
                      )}
                    </Group>

                    {isExpanded && <DetailPanel r={r} />}
                  </Table.Td>

                  {/* Días trabajados */}
                  <Table.Td style={{ verticalAlign: 'top', paddingTop: 14 }}>
                    <Text size="sm" fw={700} c="dark">{r.diasTrabajados}</Text>
                  </Table.Td>

                  {/* Tardanzas — count badge */}
                  <Table.Td style={{ verticalAlign: 'top', paddingTop: 12 }}>
                    {r.tardanzas.length > 0 ? (
                      <Badge variant="light" color="orange" size="sm">
                        {r.tardanzas.length}
                      </Badge>
                    ) : (
                      <Text size="sm" c="gray.4">—</Text>
                    )}
                  </Table.Td>

                  {/* Ausencias — count badge */}
                  <Table.Td style={{ verticalAlign: 'top', paddingTop: 12 }}>
                    {r.ausencias.length > 0 ? (
                      <Badge variant="light" color="red" size="sm">
                        {r.ausencias.length}
                      </Badge>
                    ) : (
                      <Text size="sm" c="gray.4">—</Text>
                    )}
                  </Table.Td>

                  {/* Hs. extra */}
                  <Table.Td style={{ verticalAlign: 'top', paddingTop: 12 }}>
                    {r.horasExtra50 > 0 ? (
                      <Badge variant="light" color="violet">{r.horasExtra50}h</Badge>
                    ) : (
                      <Text size="sm" c="gray.4">—</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>

        {cierre.estado === 'B' && (
          <Group px="md" py="sm" gap="xs" style={{ borderTop: '1px solid #f1f5f9', background: '#fffbeb' }}>
            <AlertCircle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />
            <Text size="xs" c="yellow.9">
              El cierre aún está en borrador. Revisá los datos antes de confirmar.
            </Text>
          </Group>
        )}
      </Card>
    </Stack>
  );
}
