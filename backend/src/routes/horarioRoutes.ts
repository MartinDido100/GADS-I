import { Router } from 'express';
import * as ctrl from '../controllers/horarioController.js';
import * as turnoCtrl from '../controllers/turnoController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const horarioRoutes: Router = Router();

horarioRoutes.use(requireAuth);

horarioRoutes.get('/', ctrl.list);
horarioRoutes.get('/:id', ctrl.get);

horarioRoutes.post('/', requireRole('ADMINISTRADOR'), ctrl.create);
horarioRoutes.patch('/:id', requireRole('ADMINISTRADOR'), ctrl.update);
horarioRoutes.post('/:id/desactivar', requireRole('ADMINISTRADOR'), ctrl.desactivar);
horarioRoutes.post('/:id/reactivar', requireRole('ADMINISTRADOR'), ctrl.reactivar);

// Turnos de un empleado: bajo /empleados/:legajo/turnos
export const turnoRoutes: Router = Router({ mergeParams: true });
turnoRoutes.use(requireAuth);
turnoRoutes.get('/', turnoCtrl.listDeEmpleado);
turnoRoutes.post('/', requireRole('ADMINISTRADOR'), turnoCtrl.asignar);
turnoRoutes.put('/', requireRole('ADMINISTRADOR'), turnoCtrl.reemplazarSemana);
turnoRoutes.delete('/:dia', requireRole('ADMINISTRADOR'), turnoCtrl.desasignar);
