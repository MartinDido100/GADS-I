import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CentroNotificaciones } from './pages/CentroNotificaciones';
import { EmpleadosConfig } from './pages/EmpleadosConfig';
import { HorariosConfig } from './pages/HorariosConfig';
import { CierreMensual } from './pages/CierreMensual';
import { Justificativos } from './pages/Justificativos';
import { Perfil } from './pages/Perfil';
import { Login } from './pages/Login';
import { RequireAuth } from './auth/RequireAuth';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/app/notificaciones" replace />} />
          <Route path="notificaciones" element={<CentroNotificaciones />} />
          <Route path="justificativos" element={<Justificativos />} />
          <Route path="perfil" element={<Perfil />} />
          <Route
            path="empleados"
            element={
              <RequireAuth roles={['ADMINISTRADOR']}>
                <EmpleadosConfig />
              </RequireAuth>
            }
          />
          <Route
            path="horarios"
            element={
              <RequireAuth roles={['ADMINISTRADOR']}>
                <HorariosConfig />
              </RequireAuth>
            }
          />
          <Route
            path="cierre"
            element={
              <RequireAuth roles={['ADMINISTRADOR', 'CONTADOR']}>
                <CierreMensual />
              </RequireAuth>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
