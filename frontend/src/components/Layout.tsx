import { NavLink, Outlet } from 'react-router-dom';
import { AppShell, Group, Stack, Text, Box, Avatar, ActionIcon, Tooltip } from '@mantine/core';
import { Users, FileText, Clock, Bell, LogOut, Calendar, ClipboardList, UserCircle } from 'lucide-react';
// Bell se usa para el header notification icon — lo aprovecho también para nav
import styles from './Layout.module.css';
import { useAuth } from '../auth/AuthContext';
import { SimuladorFichaje } from './SimuladorFichaje';
import type { Rol } from '../types';

const allNavItems: { to: string; icon: typeof Users; label: string; roles: Rol[] }[] = [
  { to: '/app/notificaciones',  icon: Bell,          label: 'Notificaciones',  roles: ['EMPLEADO', 'ADMINISTRADOR', 'CONTADOR'] },
  { to: '/app/justificativos', icon: ClipboardList, label: 'Novedades',       roles: ['EMPLEADO', 'ADMINISTRADOR'] },
  { to: '/app/empleados',      icon: Users,         label: 'Empleados',       roles: ['ADMINISTRADOR'] },
  { to: '/app/horarios',       icon: Calendar,      label: 'Horarios',        roles: ['ADMINISTRADOR'] },
  { to: '/app/cierre',         icon: FileText,      label: 'Cierre Mensual',  roles: ['ADMINISTRADOR', 'CONTADOR'] },
  { to: '/app/perfil',         icon: UserCircle,    label: 'Mi Perfil',       roles: ['EMPLEADO', 'ADMINISTRADOR', 'CONTADOR'] },
];

const ROL_LABEL: Record<Rol, string> = {
  EMPLEADO: 'Empleado',
  ADMINISTRADOR: 'Administrador',
  CONTADOR: 'Contador',
};

function getInitials(nombre: string) {
  return nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export function Layout() {
  const { user, logout } = useAuth();
  const navItems = allNavItems.filter((item) => user && item.roles.includes(user.rol));

  return (
    <AppShell
      layout="alt"
      header={{ height: 52 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: true } }}
    >
      {/* Sidebar */}
      <AppShell.Navbar
        withBorder={false}
        style={{ background: '#0f172a', display: 'flex', flexDirection: 'column' }}
      >
        {/* Logo */}
        <Box p="md" style={{ borderBottom: '1px solid #1e293b' }}>
          <Group gap={10}>
            <Box
              style={{
                width: 32, height: 32, background: '#dc2626',
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <Clock size={16} color="#fff" />
            </Box>
            <Stack gap={0}>
              <Text size="sm" fw={700} c="white" style={{ letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                DigitalCheck
              </Text>
              <Text size="xs" c="#475569" style={{ lineHeight: 1.2 }}>Control Horario</Text>
            </Stack>
          </Group>
        </Box>

        {/* Nav */}
        <Box p={8} style={{ flex: 1 }}>
          <Text
            size="xs" fw={600} c="#334155"
            style={{ textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px 6px' }}
          >
            Menú
          </Text>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <Icon size={15} />
              <span>{label}</span>
            </NavLink>
          ))}
        </Box>

        {/* User */}
        <Box p={8} style={{ borderTop: '1px solid #1e293b' }}>
          <div className={styles.userRow}>
            <Avatar color="red" size="sm" radius="xl">
              {user ? getInitials(user.nombre) : '?'}
            </Avatar>
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} c="#cbd5e1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.nombre ?? '—'}
              </Text>
              <Text size="xs" c="#475569" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user ? `${ROL_LABEL[user.rol]} · #${user.legajo}` : ''}
              </Text>
            </Stack>
            <Tooltip label="Cerrar sesión" position="right" withArrow>
              <ActionIcon variant="subtle" color="gray" onClick={logout} aria-label="Cerrar sesión">
                <LogOut size={15} color="#94a3b8" />
              </ActionIcon>
            </Tooltip>
          </div>
        </Box>
      </AppShell.Navbar>

      {/* Top bar */}
      <AppShell.Header style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <Group h="100%" px="lg">
          <Text size="sm" fw={500} c="#0f172a">DigitalCheck</Text>
        </Group>
      </AppShell.Header>

      {/* Page content */}
      <AppShell.Main style={{ background: '#f8fafc' }}>
        <Outlet />
      </AppShell.Main>

      <SimuladorFichaje />
    </AppShell>
  );
}
