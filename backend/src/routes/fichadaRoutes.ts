import { Router } from 'express';
import * as ctrl from '../controllers/fichadaController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const fichadaRoutes: Router = Router();

fichadaRoutes.use(requireAuth);

// Lectura: cualquier autenticado. El controller filtra por legajo si es EMPLEADO.
fichadaRoutes.get('/', ctrl.list);
fichadaRoutes.get('/:id', ctrl.get);

// Mutaciones: solo administrador.
fichadaRoutes.post('/', requireRole('ADMINISTRADOR'), ctrl.create);
fichadaRoutes.post('/:id/corregir', requireRole('ADMINISTRADOR'), ctrl.corregir);
