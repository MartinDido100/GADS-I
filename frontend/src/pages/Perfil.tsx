import { useEffect, useState, type FormEvent } from 'react';
import {
  Title, Text, Card, Group, Stack, Box, Badge, Loader, Center, Alert,
  Avatar, Divider, Button, PasswordInput,
} from '@mantine/core';
import { AlertCircle, CheckCircle, User, Shield, Calendar, Hash, Briefcase } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { api, ApiError } from '../lib/api';
import type { Rol } from '../types';

const ROL_COLOR: Record<Rol, string> = {
  EMPLEADO: 'blue',
  ADMINISTRADOR: 'red',
  CONTADOR: 'violet',
};

const ROL_LABEL: Record<Rol, string> = {
  EMPLEADO: 'Empleado',
  ADMINISTRADOR: 'Administrador',
  CONTADOR: 'Contador',
};

interface EmpleadoFull {
  legajo: number;
  nombre: string;
  dni: number;
  cuil: string;
  fecha_ingreso: string;
  categoria_laboral: string;
  activo: boolean;
  rol: Rol;
}

function getInitials(nombre: string) {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <Group gap="md">
      <Box style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: 8, flexShrink: 0 }}>
        <Icon size={15} color="#64748b" />
      </Box>
      <Stack gap={0}>
        <Text size="xs" c="dimmed" fw={500} style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Text>
        <Text size="sm" fw={600} c="dark">{value}</Text>
      </Stack>
    </Group>
  );
}

export function Perfil() {
  const { user } = useAuth();

  const [empleado, setEmpleado] = useState<EmpleadoFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    api<EmpleadoFull>(`/empleados/${user.legajo}`)
      .then(setEmpleado)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Error al cargar perfil'))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwError('Las contraseñas no coinciden'); return; }
    if (newPw.length < 6) { setPwError('La contraseña debe tener al menos 6 caracteres'); return; }
    setPwError(null);
    setPwSuccess(false);
    setPwLoading(true);
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ password_actual: oldPw, password_nueva: newPw }),
      });
      setPwSuccess(true);
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : 'Error al cambiar contraseña');
    } finally {
      setPwLoading(false);
    }
  }

  if (loading) return <Center py="xl"><Loader /></Center>;
  if (error) return <Stack p={32}><Alert icon={<AlertCircle size={16} />} color="red">{error}</Alert></Stack>;
  if (!empleado) return null;

  return (
    <Stack p={32} gap="lg" style={{ maxWidth: 640 }}>
      <Title order={2} fw={900} c="dark" style={{ letterSpacing: '-0.02em' }}>Mi Perfil</Title>

      <Card withBorder shadow="xs" radius="md" padding="xl">
        <Group gap="lg" align="flex-start">
          <Avatar color="red" size={64} radius="xl" style={{ fontSize: 22, fontWeight: 700 }}>
            {getInitials(empleado.nombre)}
          </Avatar>
          <Stack gap={4}>
            <Text size="xl" fw={900} c="dark" style={{ lineHeight: 1.2 }}>{empleado.nombre}</Text>
            <Group gap="xs">
              <Badge color={ROL_COLOR[empleado.rol]} variant="light">{ROL_LABEL[empleado.rol]}</Badge>
              <Badge color={empleado.activo ? 'green' : 'red'} variant="light">
                {empleado.activo ? 'Activo' : 'Inactivo'}
              </Badge>
            </Group>
          </Stack>
        </Group>

        <Divider my="lg" />

        <Stack gap="md">
          <InfoRow icon={Hash}      label="Legajo"            value={`#${empleado.legajo}`} />
          <InfoRow icon={User}      label="DNI"               value={String(empleado.dni)} />
          <InfoRow icon={Shield}    label="CUIL"              value={empleado.cuil} />
          <InfoRow icon={Briefcase} label="Categoría laboral" value={empleado.categoria_laboral} />
          <InfoRow icon={Calendar}  label="Fecha de ingreso"  value={formatDate(empleado.fecha_ingreso)} />
        </Stack>
      </Card>

      <Card withBorder shadow="xs" radius="md" padding="xl">
        <Text size="sm" fw={700} c="dark" mb="md">Cambiar contraseña</Text>
        <form onSubmit={handleChangePassword}>
          <Stack gap="sm">
            <PasswordInput label="Contraseña actual" value={oldPw} onChange={(e) => setOldPw(e.currentTarget.value)} required />
            <PasswordInput label="Nueva contraseña" value={newPw} onChange={(e) => setNewPw(e.currentTarget.value)} required />
            <PasswordInput label="Confirmar nueva contraseña" value={confirmPw} onChange={(e) => setConfirmPw(e.currentTarget.value)} required />

            {pwError && <Alert icon={<AlertCircle size={16} />} color="red" variant="light">{pwError}</Alert>}
            {pwSuccess && <Alert icon={<CheckCircle size={16} />} color="green" variant="light">Contraseña actualizada correctamente.</Alert>}

            <Group justify="flex-end">
              <Button type="submit" loading={pwLoading} color="red">Actualizar contraseña</Button>
            </Group>
          </Stack>
        </form>
      </Card>
    </Stack>
  );
}
