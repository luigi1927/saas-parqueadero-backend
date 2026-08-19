import { Router } from 'express';
import { TarifaController } from '../controllers/TarifaController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/activa', TarifaController.obtenerTarifaActiva);
router.post('/', TarifaController.crear);
router.put('/:id', TarifaController.actualizar);

export default router;