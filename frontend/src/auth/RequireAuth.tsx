import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Center, Loader } from '@mantine/core';
import { useAuth } from './AuthContext';
import type { Rol } from '../types';

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Rol[];
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(user.rol)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
