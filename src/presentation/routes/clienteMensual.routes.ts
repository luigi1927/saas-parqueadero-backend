import { Router } from 'express';
import { ClienteMensualController } from '../controllers/ClienteMensualController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', ClienteMensualController.listar);
router.post('/', ClienteMensualController.crear);
router.post('/:id/pagos', ClienteMensualController.registrarPago);
router.get('/:id/pagos', ClienteMensualController.listarPagos);

export default router;