import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/cierreController.js';

const router = Router();

// Listar períodos existentes — ADMIN + CONTADOR
router.get('/', requireAuth, requireRole('ADMINISTRADOR', 'CONTADOR'), ctrl.list);

// Resumen de un período — ADMIN + CONTADOR
router.get('/:periodo', requireAuth, requireRole('ADMINISTRADOR', 'CONTADOR'), ctrl.resumen);

// Exportar CSV — ADMIN + CONTADOR
router.get('/:periodo/export', requireAuth, requireRole('ADMINISTRADOR', 'CONTADOR'), ctrl.exportCsv);

// Cerrar período — solo ADMIN
router.post('/:periodo/cerrar', requireAuth, requireRole('ADMINISTRADOR'), ctrl.cerrar);

// Reabrir período — solo ADMIN
router.post('/:periodo/reabrir', requireAuth, requireRole('ADMINISTRADOR'), ctrl.reabrir);

export { router as cierreRoutes };
