import { Router } from 'express';
import { ConfiguracionMensualidadController } from '../controllers/ConfiguracionMensualidadController.js';
import { authenticateToken, requireParqueaderoOperativo, requireRoles } from '../middlewares/auth.middleware.js';
import { requirePlanFeature } from '../middlewares/planFeature.middleware.js';

const router = Router();
router.use(authenticateToken, requireParqueaderoOperativo, requireRoles('ADMIN_PARQUEADERO'));
router.get('/', ConfiguracionMensualidadController.obtener);
router.put('/', requirePlanFeature('soportaWhatsapp'), ConfiguracionMensualidadController.actualizar);

export default router;