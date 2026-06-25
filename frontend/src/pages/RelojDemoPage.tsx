import { useEffect, useState, useCallback } from 'react';
import {
  Title, Text, Card, Group, Stack, Box, Badge, Button, Alert, ThemeIcon,
  SimpleGrid, TextInput, Divider,
} from '@mantine/core';
import {
  Clock, FastForward, RotateCcw, CalendarClock, Info, CheckCircle, AlertCircle,
} from 'lucide-react';
import { getClock, advanceClock, setClock as setClockApi, resetClock, type ClockState } from '../lib/demoApi';
import { syncClock } from '../lib/clock';
import { ApiError } from '../lib/api';

function formatVirtual(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Saltos rápidos para la demo.
const SALTOS: { label: string; input: { dias?: number; horas?: number } }[] = [
  { label: '+1 hora',    input: { horas: 1 } },
  { label: '+8 horas',   input: { horas: 8 } },
  { label: '+1 día',     input: { dias: 1 } },
  { label: '+1 semana',  input: { dias: 7 } },
];

// Valor por defecto del input "fijar fecha": ahora local en formato datetime-local.
function nowLocalInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

export function RelojDemoPage() {
  const [clock, setClockState] = useState<ClockState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimoRecalc, setUltimoRecalc] = useState<number | null>(null);
  const [fechaManual, setFechaManual] = useState(nowLocalInput());

  // Aplica un nuevo estado de reloj: actualiza UI, sincroniza el reloj de
  // cliente y avisa al resto de la app para que recargue.
  const aplicar = useCallback((r: ClockState) => {
    setClockState(r);
    syncClock(r.now);
    setUltimoRecalc(r.recalculados.length);
    window.dispatchEvent(new CustomEvent('demo-clock-changed', { detail: r }));
  }, []);

  const refrescar = useCallback(async () => {
    try {
      const r = await getClock();
      setClockState(r);
      syncClock(r.now);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo leer el reloj');
    }
  }, []);

  useEffect(() => { void refrescar(); }, [refrescar]);

  async function avanzar(input: { dias?: number; horas?: number }) {
    setLoading(true);
    setError(null);
    try {
      aplicar(await advanceClock(input));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al avanzar el reloj');
    } finally {
      setLoading(false);
    }
  }

  async function fijar() {
    setLoading(true);
    setError(null);
    try {
      // El input datetime-local da hora local (UTC-3) sin zona. El backend la
      // interpreta como hora local del negocio y la convierte al UTC real.
      aplicar(await setClockApi(fechaManual));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al fijar el reloj');
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setLoading(true);
    setError(null);
    try {
      aplicar(await resetClock());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al resetear el reloj');
    } finally {
      setLoading(false);
    }
  }

  const simulado = clock?.isSimulated ?? false;

  return (
    <Stack p={32} gap="lg">
      <Box>
        <Title order={2} fw={900} c="dark" style={{ letterSpacing: '-0.02em' }}>
          Reloj de demo
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Adelantá el tiempo del sistema para mostrar cómo aparecen tardanzas, ausencias y horas extra
        </Text>
      </Box>

      <Alert icon={<Info size={18} />} color="indigo" variant="light">
        <Text size="sm" fw={600} mb={4}>¿Cómo funciona?</Text>
        <Text size="sm">
          Este reloj cambia la hora <b>solo dentro del sistema</b> — no toca la hora real de tu computadora.
          Cuando lo adelantás, las fichadas que registres usan esa hora virtual, y al cruzar la medianoche
          el sistema recalcula automáticamente las novedades del día (por ejemplo, marca como ausente a quien
          no fichó). Apretá <b>Resetear</b> para volver a la hora real.
        </Text>
      </Alert>

      {error && (
        <Alert icon={<AlertCircle size={16} />} color="red" variant="light"
          withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Hora virtual actual */}
      <Card withBorder shadow="xs" radius="md" padding="xl"
        style={{ background: simulado ? '#1e1b4b' : '#0f172a', borderColor: simulado ? '#6366f1' : '#1e293b' }}>
        <Group justify="space-between" align="center">
          <Group gap="md">
            <ThemeIcon size={56} radius="md" color={simulado ? 'indigo' : 'gray'} variant="light">
              <Clock size={28} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text size="xs" c={simulado ? 'indigo.2' : 'gray.5'} style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {simulado ? 'Tiempo simulado' : 'Hora real'}
              </Text>
              <Text size="22px" fw={800} c="white" style={{ lineHeight: 1.2, textTransform: 'capitalize' }}>
                {clock ? formatVirtual(clock.now) : '—'}
              </Text>
            </Stack>
          </Group>
          {simulado && (
            <Badge size="lg" color="indigo" variant="filled">Demo activa</Badge>
          )}
        </Group>
      </Card>

      {ultimoRecalc !== null && ultimoRecalc > 0 && (
        <Alert icon={<CheckCircle size={16} />} color="teal" variant="light"
          withCloseButton onClose={() => setUltimoRecalc(null)}>
          Se recalcularon las novedades de <b>{ultimoRecalc} día(s)</b>. Revisá la pantalla de Justificativos
          para ver las ausencias y tardanzas generadas.
        </Alert>
      )}

      {/* Adelantar tiempo */}
      <Card withBorder shadow="xs" radius="md" padding="lg">
        <Group gap="xs" mb="md">
          <FastForward size={18} color="#6366f1" />
          <Text size="sm" fw={700} c="dark">Adelantar el tiempo</Text>
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          {SALTOS.map((s) => (
            <Button
              key={s.label}
              variant="light"
              color="indigo"
              size="md"
              leftSection={<FastForward size={15} />}
              loading={loading}
              onClick={() => void avanzar(s.input)}
            >
              {s.label}
            </Button>
          ))}
        </SimpleGrid>

        <Divider my="lg" label="o ir a una fecha exacta" labelPosition="center" />

        <Group align="flex-end" gap="sm">
          <TextInput
            label="Fecha y hora"
            type="datetime-local"
            value={fechaManual}
            onChange={(e) => setFechaManual(e.currentTarget.value)}
            style={{ flex: 1 }}
            leftSection={<CalendarClock size={15} />}
          />
          <Button
            color="indigo"
            loading={loading}
            onClick={() => void fijar()}
          >
            Ir a esta fecha
          </Button>
        </Group>
      </Card>

      {/* Reset */}
      <Card withBorder shadow="xs" radius="md" padding="lg">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Text size="sm" fw={700} c="dark">Volver a la hora real</Text>
            <Text size="xs" c="dimmed">Desactiva la simulación y vuelve al tiempo actual</Text>
          </Stack>
          <Button
            variant="default"
            leftSection={<RotateCcw size={15} />}
            loading={loading}
            disabled={!simulado}
            onClick={() => void reset()}
          >
            Resetear reloj
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}
