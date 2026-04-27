import { useEffect, useState } from 'react';
import {
  Modal, Stack, Group, Button, Select, Alert, Text, Loader, Center, Box, Divider,
} from '@mantine/core';
import { AlertCircle, Calendar } from 'lucide-react';
import { ApiError } from '../lib/api';
import {
  listHorarios, listTurnosDeEmpleado, reemplazarSemana,
  type Horario, type DiaSemana,
} from '../lib/horariosApi';
import type { Empleado } from '../types';

interface Props {
  opened: boolean;
  onClose: () => void;
  empleado: Empleado | null;
}

const DIAS: { value: DiaSemana; label: string }[] = [
  { value: 'LUN', label: 'Lunes' },
  { value: 'MAR', label: 'Martes' },
  { value: 'MIE', label: 'Miércoles' },
  { value: 'JUE', label: 'Jueves' },
  { value: 'VIE', label: 'Viernes' },
  { value: 'SAB', label: 'Sábado' },
  { value: 'DOM', label: 'Domingo' },
];

type SemanaState = Record<DiaSemana, number | null>;

const semanaVacia: SemanaState = {
  LUN: null, MAR: null, MIE: null, JUE: null, VIE: null, SAB: null, DOM: null,
};

export function AsignarTurnosModal({ opened, onClose, empleado }: Props) {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [semana, setSemana] = useState<SemanaState>(semanaVacia);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || !empleado) return;

    setError(null);
    setLoading(true);
    Promise.all([
      listHorarios({ activo: true }),
      listTurnosDeEmpleado(empleado.legajo),
    ])
      .then(([hs, turnos]) => {
        setHorarios(hs);
        const s: SemanaState = { ...semanaVacia };
        for (const t of turnos) s[t.dia] = t.id_horario;
        setSemana(s);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Error al cargar datos');
      })
      .finally(() => setLoading(false));
  }, [opened, empleado]);

  const horarioOptions = horarios.map((h) => ({
    value: String(h.id),
    label: `${h.descripcion} (${h.horario_entrada}–${h.horario_retiro})`,
  }));

  function setDia(dia: DiaSemana, idHorario: string | null) {
    setSemana((prev) => ({ ...prev, [dia]: idHorario ? Number(idHorario) : null }));
  }

  async function handleGuardar() {
    if (!empleado) return;
    setError(null);
    setSubmitting(true);
    try {
      const asignaciones = (Object.keys(semana) as DiaSemana[])
        .filter((d) => semana[d] !== null)
        .map((d) => ({ dia: d, id_horario: semana[d]! }));
      await reemplazarSemana(empleado.legajo, asignaciones);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar la semana');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      centered
      title={
        <Group gap="xs">
          <Calendar size={18} />
          <Text fw={700} size="md">
            Turnos de {empleado?.nombre} (#{empleado?.legajo})
          </Text>
        </Group>
      }
    >
      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Asigná un horario por cada día de la semana. Los días sin horario se interpretan como descanso.
          </Text>

          <Divider />

          <Stack gap="sm">
            {DIAS.map(({ value, label }) => (
              <Group key={value} gap="md" wrap="nowrap">
                <Box style={{ width: 100, flexShrink: 0 }}>
                  <Text size="sm" fw={600}>{label}</Text>
                </Box>
                <Select
                  placeholder="Descanso"
                  value={semana[value] ? String(semana[value]) : null}
                  onChange={(v) => setDia(value, v)}
                  data={horarioOptions}
                  clearable
                  searchable
                  style={{ flex: 1 }}
                />
              </Group>
            ))}
          </Stack>

          {horarios.length === 0 && (
            <Alert icon={<AlertCircle size={16} />} color="yellow" variant="light">
              No hay horarios activos. Creá uno desde la sección Horarios.
            </Alert>
          )}

          {error && (
            <Alert icon={<AlertCircle size={16} />} color="red" radius="md" variant="light">
              {error}
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
            <Button color="red" onClick={() => void handleGuardar()} loading={submitting}>
              Guardar semana
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
