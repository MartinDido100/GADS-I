import { useEffect, useState, type FormEvent } from 'react';
import {
  Modal, TextInput, Stack, Group, Button, Select, NumberInput, Alert, Text,
} from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import type { Empleado, Rol } from '../types';
import { ApiError } from '../lib/api';
import {
  createEmpleado, updateEmpleado,
  type EmpleadoCreateInput, type EmpleadoUpdateInput,
} from '../lib/empleadosApi';

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: (empleado: Empleado) => void;
  empleado: Empleado | null; // null = alta, no-null = edición
}

interface FormState {
  legajo: string;
  nombre: string;
  dni: string;
  cuil: string;
  fecha_ingreso: string;
  categoria_laboral: string;
  rol: Rol;
}

const emptyForm: FormState = {
  legajo: '',
  nombre: '',
  dni: '',
  cuil: '',
  fecha_ingreso: '',
  categoria_laboral: 'A',
  rol: 'EMPLEADO',
};

function toForm(e: Empleado): FormState {
  return {
    legajo: String(e.legajo),
    nombre: e.nombre,
    dni: String(e.dni),
    cuil: e.cuil,
    fecha_ingreso: e.fecha_ingreso.slice(0, 10),
    categoria_laboral: e.categoria_laboral,
    rol: e.rol,
  };
}

export function EmpleadoFormModal({ opened, onClose, onSaved, empleado }: Props) {
  const isEdit = empleado !== null;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (opened) {
      setForm(empleado ? toForm(empleado) : emptyForm);
      setError(null);
    }
  }, [opened, empleado]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let saved: Empleado;
      if (isEdit) {
        const update: EmpleadoUpdateInput = {
          nombre: form.nombre,
          dni: Number(form.dni),
          cuil: form.cuil,
          fecha_ingreso: form.fecha_ingreso,
          categoria_laboral: form.categoria_laboral,
          rol: form.rol,
        };
        saved = await updateEmpleado(empleado.legajo, update);
      } else {
        const create: EmpleadoCreateInput = {
          legajo: Number(form.legajo),
          nombre: form.nombre,
          dni: Number(form.dni),
          cuil: form.cuil,
          fecha_ingreso: form.fecha_ingreso,
          categoria_laboral: form.categoria_laboral,
          rol: form.rol,
        };
        saved = await createEmpleado(create);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Error al guardar el empleado');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="md">
          {isEdit ? `Editar empleado #${empleado.legajo}` : 'Nuevo empleado'}
        </Text>
      }
      size="md"
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Group grow>
            <NumberInput
              label="Legajo"
              placeholder="1011"
              value={form.legajo}
              onChange={(v) => setForm({ ...form, legajo: String(v ?? '') })}
              disabled={isEdit}
              required={!isEdit}
              min={1}
              hideControls
              allowDecimal={false}
              allowNegative={false}
            />
            <TextInput
              label="Categoría"
              placeholder="A / B / C"
              value={form.categoria_laboral}
              onChange={(e) => setForm({ ...form, categoria_laboral: e.currentTarget.value })}
              required
              maxLength={5}
            />
          </Group>

          <TextInput
            label="Nombre completo"
            placeholder="Juan Pérez"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.currentTarget.value })}
            required
            minLength={2}
          />

          <Group grow>
            <NumberInput
              label="DNI"
              placeholder="30123456"
              value={form.dni}
              onChange={(v) => setForm({ ...form, dni: String(v ?? '') })}
              required
              min={1}
              hideControls
              allowDecimal={false}
              allowNegative={false}
            />
            <TextInput
              label="CUIL"
              placeholder="20-30123456-7"
              value={form.cuil}
              onChange={(e) => setForm({ ...form, cuil: e.currentTarget.value })}
              required
              minLength={11}
              maxLength={13}
            />
          </Group>

          <Group grow>
            <TextInput
              label="Fecha de ingreso"
              type="date"
              value={form.fecha_ingreso}
              onChange={(e) => setForm({ ...form, fecha_ingreso: e.currentTarget.value })}
              required
            />
            <Select
              label="Rol"
              value={form.rol}
              onChange={(v) => v && setForm({ ...form, rol: v as Rol })}
              data={[
                { value: 'EMPLEADO',      label: 'Empleado' },
                { value: 'ADMINISTRADOR', label: 'Administrador' },
                { value: 'CONTADOR',      label: 'Contador' },
              ]}
              allowDeselect={false}
            />
          </Group>

          {error && (
            <Alert icon={<AlertCircle size={16} />} color="red" radius="md" variant="light">
              {error}
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={submitting} color="red">
              {isEdit ? 'Guardar cambios' : 'Crear empleado'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
