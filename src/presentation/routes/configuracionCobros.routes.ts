import { Router } from 'express';
import { ConfiguracionCobrosController } from '../controllers/ConfiguracionCobrosController.js';
import { authenticateToken, requireParqueaderoOperativo, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticateToken, requireParqueaderoOperativo, requireRoles('ADMIN_PARQUEADERO'));
router.get('/', ConfiguracionCobrosController.obtener);
router.put('/', ConfiguracionCobrosController.actualizar);

export default router;