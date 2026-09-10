import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController.js';
import { authenticateToken, requireParqueaderoOperativo, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken, requireParqueaderoOperativo);

router.get('/resumen', requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), DashboardController.resumen);

export default router;