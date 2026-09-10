import { Router } from 'express';
import { OperarioController } from '../controllers/OperarioController.js';
import { authenticateToken, requireParqueaderoOperativo, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticateToken, requireParqueaderoOperativo, requireRoles('ADMIN_PARQUEADERO'));
router.get('/', OperarioController.listar);
router.post('/', OperarioController.registrar);
router.put('/:id', OperarioController.actualizar);
router.post('/:id/resetear-pin', OperarioController.resetearPin);
router.post('/:id/activar', OperarioController.activar);
router.post('/:id/desactivar', OperarioController.desactivar);

export default router;