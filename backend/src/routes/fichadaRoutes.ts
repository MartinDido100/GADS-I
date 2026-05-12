import { Router } from 'express';
import * as ctrl from '../controllers/fichadaController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const fichadaRoutes: Router = Router();

fichadaRoutes.use(requireAuth);

// Lectura: cualquier autenticado. El controller filtra por legajo si es EMPLEADO.
fichadaRoutes.get('/', ctrl.list);
fichadaRoutes.get('/:id', ctrl.get);

// Biométrico: cualquier autenticado puede simular su propia lectura.
fichadaRoutes.post('/biometrico', ctrl.biometrico);

// Almuerzo: cualquier autenticado registra salida/regreso de su propio almuerzo.
fichadaRoutes.post('/almuerzo', ctrl.almuerzo);

// Mutaciones manuales: solo administrador.
fichadaRoutes.post('/', requireRole('ADMINISTRADOR'), ctrl.create);
fichadaRoutes.post('/:id/corregir', requireRole('ADMINISTRADOR'), ctrl.corregir);
