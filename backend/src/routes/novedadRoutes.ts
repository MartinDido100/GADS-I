import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/novedadController.js';

const router = Router();

// Tipos de novedad (cualquier autenticado)
router.get('/tipos', requireAuth, ctrl.tiposNovedad);

// Listar y crear (todos los roles ven las suyas; EMPLEADO solo las propias)
router.get('/',    requireAuth, ctrl.list);
router.post('/',   requireAuth, ctrl.create);
router.get('/:id', requireAuth, ctrl.getOne);

// Aprobar / rechazar — solo ADMINISTRADOR
router.post('/:id/aprobar',  requireAuth, requireRole('ADMINISTRADOR'), ctrl.aprobar);
router.post('/:id/rechazar', requireAuth, requireRole('ADMINISTRADOR'), ctrl.rechazar);

// Eliminar — solo ADMINISTRADOR (o dueño si es PENDIENTE — validado en controller)
router.delete('/:id', requireAuth, ctrl.remove);

export { router as novedadRoutes };

// Ruta anidada: POST /empleados/:legajo/recalcular-novedades
// Se monta desde el router principal como sub-ruta de empleados.
const recalcularRouter = Router({ mergeParams: true });
recalcularRouter.post('/', requireAuth, requireRole('ADMINISTRADOR'), ctrl.recalcular);
export { recalcularRouter as recalcularNovedadesRouter };
