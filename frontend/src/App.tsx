import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { EmpleadosConfig } from './pages/EmpleadosConfig';
import { CierreMensual } from './pages/CierreMensual';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/app" element={<Layout />}>
          <Route index element={<Navigate to="/app/empleados" replace />} />
          <Route path="empleados" element={<EmpleadosConfig />} />
          <Route path="cierre" element={<CierreMensual />} />
        </Route>
        <Route path="*" element={<Navigate to="/app/empleados" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
