import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, PasswordInput, Stack, Text, TextInput, Title, Alert, Group,
} from '@mantine/core';
import { Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/app';

  const [legajo, setLegajo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(Number(legajo), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('No se pudo conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        padding: 24,
      }}
    >
      <Card withBorder shadow="md" radius="md" padding="xl" style={{ width: '100%', maxWidth: 380 }}>
        <Stack gap="lg">
          <Group gap={10}>
            <Box
              style={{
                width: 36, height: 36, background: '#dc2626',
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Clock size={18} color="#fff" />
            </Box>
            <Stack gap={0}>
              <Title order={4} fw={900} c="dark" style={{ letterSpacing: '-0.02em' }}>
                DigitalCheck
              </Title>
              <Text size="xs" c="dimmed">Control horario para pymes</Text>
            </Stack>
          </Group>

          <Box>
            <Title order={3} fw={800} c="dark">Iniciar sesión</Title>
            <Text size="sm" c="dimmed" mt={4}>Ingresá con tu legajo y contraseña</Text>
          </Box>

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Legajo"
                placeholder="1001"
                value={legajo}
                onChange={(e) => setLegajo(e.currentTarget.value)}
                required
                inputMode="numeric"
                autoFocus
              />
              <PasswordInput
                label="Contraseña"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
              />
              {error && (
                <Alert icon={<AlertCircle size={16} />} color="red" radius="md" variant="light">
                  {error}
                </Alert>
              )}
              <Button type="submit" loading={submitting} color="red" size="md">
                Ingresar
              </Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Box>
  );
}
