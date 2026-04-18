import { NavLink, Outlet } from 'react-router-dom';
import { AppShell, Group, Stack, Text, Box, Avatar, ActionIcon } from '@mantine/core';
import { Users, FileText, Clock, Bell } from 'lucide-react';
import styles from './Layout.module.css';

const navItems = [
  { to: '/app/empleados', icon: Users, label: 'Empleados' },
  { to: '/app/cierre', icon: FileText, label: 'Cierre Mensual' },
];

export function Layout() {
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
            <Avatar color="red" size="sm" radius="xl">A</Avatar>
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} c="#cbd5e1" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Administrador
              </Text>
              <Text size="xs" c="#475569" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                admin@digitalcheck
              </Text>
            </Stack>
          </div>
        </Box>
      </AppShell.Navbar>

      {/* Top bar */}
      <AppShell.Header style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
        <Group h="100%" px="lg" justify="space-between">
          <Text size="sm" fw={500} c="#0f172a">DigitalCheck</Text>
          <Group gap="xs">
            <Box style={{ position: 'relative' }}>
              <ActionIcon variant="subtle" color="gray" size="lg">
                <Bell size={15} />
              </ActionIcon>
              <Box
                style={{
                  position: 'absolute', top: 7, right: 7,
                  width: 7, height: 7, borderRadius: '50%', background: '#dc2626',
                  pointerEvents: 'none',
                }}
              />
            </Box>
            <Avatar color="red" size="sm" radius="xl">A</Avatar>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Page content */}
      <AppShell.Main style={{ background: '#f8fafc' }}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
