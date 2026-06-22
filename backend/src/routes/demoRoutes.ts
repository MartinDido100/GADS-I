import { Router } from 'express';
import * as ctrl from '../controllers/demoController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// Reloj de demo: solo administrador. El offset vive en memoria del proceso y
// no mueve el reloj real del SO.
export const demoRoutes: Router = Router();

demoRoutes.use(requireAuth, requireRole('ADMINISTRADOR'));

demoRoutes.get('/clock', ctrl.estado);
demoRoutes.post('/clock/advance', ctrl.avanzar);
demoRoutes.post('/clock/set', ctrl.fijar);
demoRoutes.post('/clock/reset', ctrl.reset);
