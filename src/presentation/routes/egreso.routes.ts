import { Router } from 'express';
import { EgresoController } from '../controllers/EgresoController.js';
import { authenticateToken, requireParqueaderoOperativo, requireRoles } from '../middlewares/auth.middleware.js';
import { salidaOperacionalLimiter } from '../middlewares/rateLimit.middlewares.js';

const router = Router();

router.use(authenticateToken, requireParqueaderoOperativo, requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'));

router.post('/', salidaOperacionalLimiter, EgresoController.registrar);
router.get('/turno/:turnoId', EgresoController.listarPorTurno);

export default router;