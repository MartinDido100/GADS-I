import { useEffect, useState, type FormEvent } from 'react';
import {
  Modal, Stack, Group, Button, Select, Alert, Text, TextInput,
} from '@mantine/core';
import { AlertCircle } from 'lucide-react';
import { ApiError } from '../lib/api';
import { createFichada, type EntradaSalida, type OrigenFichada } from '../lib/fichadasApi';
import { listEmpleados } from '../lib/empleadosApi';
import type { Empleado } from '../types';

interface Props {
  opened: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

export function RegistrarFichadaModal({ opened, onClose, onSaved }: Props) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [legajo, setLegajo] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState(nowLocal());
  const [entradaSalida, setEntradaSalida] = useState<EntradaSalida>('E');
  const [origen, setOrigen] = useState<OrigenFichada>('MANUAL');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!opened) return;
    setError(null);
    setLegajo(null);
    setTimestamp(nowLocal());
    setEntradaSalida('E');
    setOrigen('MANUAL');
    listEmpleados({ activo: true })
      .then(setEmpleados)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Error al cargar empleados');
      });
  }, [opened]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!legajo) {
      setError('Seleccioná un empleado');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // El input de tipo datetime-local viene sin timezone — lo interpretamos
      // como hora local del navegador y lo enviamos en ISO con offset.
      const local = new Date(timestamp);
      await createFichada({
        id_empleado: Number(legajo),
        timestamp: local.toISOString(),
        entrada_salida: entradaSalida,
        origen,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al registrar');
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
      title={<Text fw={700} size="md">Registrar fichada manual</Text>}
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Select
            label="Empleado"
            placeholder="Seleccioná un empleado..."
            data={empleados.map((e) => ({
              value: String(e.legajo),
              label: `#${e.legajo} — ${e.nombre}`,
            }))}
            value={legajo}
            onChange={setLegajo}
            searchable
            required
          />

          <TextInput
            label="Fecha y hora"
            type="datetime-local"
            value={timestamp}
            onChange={(e) => setTimestamp(e.currentTarget.value)}
            required
          />

          <Group grow>
            <Select
              label="Tipo"
              data={[
                { value: 'E', label: 'Entrada' },
                { value: 'S', label: 'Salida' },
              ]}
              value={entradaSalida}
              onChange={(v) => v && setEntradaSalida(v as EntradaSalida)}
              allowDeselect={false}
            />
            <Select
              label="Origen"
              data={[
                { value: 'MANUAL', label: 'Manual' },
                { value: 'BIOMETRICO', label: 'Biométrico' },
                { value: 'QR', label: 'QR' },
                { value: 'API', label: 'API' },
              ]}
              value={origen}
              onChange={(v) => v && setOrigen(v as OrigenFichada)}
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
            <Button type="submit" loading={submitting} color="red">Registrar</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
