import { Router } from 'express';
import * as ctrl from '../controllers/empleadoController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const empleadoRoutes: Router = Router();

empleadoRoutes.use(requireAuth);

// Lectura: cualquier usuario autenticado.
empleadoRoutes.get('/', ctrl.list);
empleadoRoutes.get('/:legajo', ctrl.get);

// Mutaciones: solo administrador.
empleadoRoutes.post('/', requireRole('ADMINISTRADOR'), ctrl.create);
empleadoRoutes.patch('/:legajo', requireRole('ADMINISTRADOR'), ctrl.update);
empleadoRoutes.post('/:legajo/baja', requireRole('ADMINISTRADOR'), ctrl.baja);
empleadoRoutes.post('/:legajo/reactivar', requireRole('ADMINISTRADOR'), ctrl.reactivar);
