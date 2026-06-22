import { useEffect, useState } from 'react';
import { Box, Group, Stack, Text } from '@mantine/core';
import { Clock } from 'lucide-react';
import { getClock } from '../lib/demoApi';
import { clientNow } from '../lib/clock';

function formatReloj(d: Date): { fecha: string; hora: string } {
  return {
    fecha: d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' }),
    hora: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  };
}

// Indicador de la hora del sistema en el sidebar. Sigue el reloj de demo:
// muestra en violeta cuando el tiempo está simulado, gris cuando es real.
export function RelojSidebar() {
  const [ahora, setAhora] = useState(() => clientNow());
  const [simulado, setSimulado] = useState(false);

  useEffect(() => {
    // Estado inicial del reloj de demo (solo admin tiene acceso al endpoint).
    // Usamos su "now" directo por si el offset del cliente aún no se sincronizó.
    getClock()
      .then((r) => {
        setSimulado(r.isSimulated);
        setAhora(new Date(r.now));
      })
      .catch(() => {});

    // Tic visual cada 30 s para que la hora avance sola.
    const tick = setInterval(() => setAhora(clientNow()), 30_000);

    // Cuando el reloj de demo cambia, refrescar al instante.
    const onClock = (e: Event) => {
      const detail = (e as CustomEvent).detail as { isSimulated?: boolean } | undefined;
      if (detail) setSimulado(Boolean(detail.isSimulated));
      setAhora(clientNow());
    };
    window.addEventListener('demo-clock-changed', onClock);

    return () => {
      clearInterval(tick);
      window.removeEventListener('demo-clock-changed', onClock);
    };
  }, []);

  const { fecha, hora } = formatReloj(ahora);

  return (
    <Box
      px="md" py={8}
      style={{
        borderTop: '1px solid #1e293b',
        background: simulado ? '#1e1b4b' : 'transparent',
      }}
    >
      <Group gap={8} wrap="nowrap">
        <Clock size={14} color={simulado ? '#a5b4fc' : '#475569'} />
        <Stack gap={0}>
          <Text size="xs" fw={700} c={simulado ? 'indigo.2' : '#cbd5e1'} style={{ lineHeight: 1.2, textTransform: 'capitalize' }}>
            {fecha} · {hora}
          </Text>
          <Text size="9px" c={simulado ? 'indigo.4' : '#475569'} style={{ lineHeight: 1.2 }}>
            {simulado ? 'Hora simulada (demo)' : 'Hora del sistema'}
          </Text>
        </Stack>
      </Group>
    </Box>
  );
}
