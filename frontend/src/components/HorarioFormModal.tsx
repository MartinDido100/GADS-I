import { useEffect, useState, type FormEvent } from 'react';
import {
  Modal, TextInput, Stack, Group, Button, NumberInput, Alert, Text, SimpleGrid,
} from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import { ApiError } from '../lib/api';
import {
  createHorario, updateHorario,
  type Horario, type HorarioInput,
} from '../lib/horariosApi';

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: (h: Horario) => void;
  horario: Horario | null;
}

const defaults: HorarioInput = {
  descripcion: '',
  horario_entrada: '09:00',
  horario_retiro: '18:00',
  horas_a_trabajar: null,
  tolerancia_entrada: 5,
  tolerancia_retiro: 5,
  minutos_minimos_descanso: 60,
  umbral_horas_extras: 15,
};

function fromHorario(h: Horario): HorarioInput {
  return {
    descripcion: h.descripcion,
    horario_entrada: h.horario_entrada,
    horario_retiro: h.horario_retiro,
    horas_a_trabajar: h.horas_a_trabajar,
    tolerancia_entrada: h.tolerancia_entrada,
    tolerancia_retiro: h.tolerancia_retiro,
    minutos_minimos_descanso: h.minutos_minimos_descanso,
    umbral_horas_extras: h.umbral_horas_extras,
  };
}

export function HorarioFormModal({ opened, onClose, onSaved, horario }: Props) {
  const isEdit = horario !== null;
  const [form, setForm] = useState<HorarioInput>(defaults);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (opened) {
      setForm(horario ? fromHorario(horario) : defaults);
      setError(null);
    }
  }, [opened, horario]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const saved = isEdit
        ? await updateHorario(horario.id, form)
        : await createHorario(form);
      onSaved(saved);
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
      title={
        <Text fw={700} size="md">
          {isEdit ? `Editar horario #${horario.id}` : 'Nuevo horario'}
        </Text>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Descripción"
            placeholder="Jornada completa Lun–Vie 09:00 a 18:00"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.currentTarget.value })}
            required
            minLength={2}
          />

          <Group grow>
            <TextInput
              label="Entrada"
              type="time"
              value={form.horario_entrada}
              onChange={(e) => setForm({ ...form, horario_entrada: e.currentTarget.value })}
              required
            />
            <TextInput
              label="Retiro"
              type="time"
              value={form.horario_retiro}
              onChange={(e) => setForm({ ...form, horario_retiro: e.currentTarget.value })}
              required
            />
          </Group>

          <SimpleGrid cols={2}>
            <NumberInput
              label="Tolerancia entrada (min)"
              value={form.tolerancia_entrada}
              onChange={(v) => setForm({ ...form, tolerancia_entrada: Number(v) || 0 })}
              min={0}
            />
            <NumberInput
              label="Tolerancia retiro (min)"
              value={form.tolerancia_retiro}
              onChange={(v) => setForm({ ...form, tolerancia_retiro: Number(v) || 0 })}
              min={0}
            />
            <NumberInput
              label="Descanso mínimo (min)"
              value={form.minutos_minimos_descanso}
              onChange={(v) => setForm({ ...form, minutos_minimos_descanso: Number(v) || 0 })}
              min={0}
            />
            <NumberInput
              label="Umbral hs. extra (min)"
              value={form.umbral_horas_extras}
              onChange={(v) => setForm({ ...form, umbral_horas_extras: Number(v) || 0 })}
              min={0}
            />
          </SimpleGrid>

          <NumberInput
            label="Horas a trabajar (jornada flexible, opcional)"
            description="Para horarios flexibles. Dejar vacío si es jornada fija."
            value={form.horas_a_trabajar ?? ''}
            onChange={(v) => setForm({ ...form, horas_a_trabajar: v === '' ? null : Number(v) })}
            min={0}
            allowDecimal={false}
          />

          {error && (
            <Alert icon={<AlertCircle size={16} />} color="red" radius="md" variant="light">
              {error}
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={submitting} color="red">
              {isEdit ? 'Guardar cambios' : 'Crear horario'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
