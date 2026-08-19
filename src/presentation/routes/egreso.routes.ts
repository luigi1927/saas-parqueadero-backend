import { Router } from 'express';
import { EgresoController } from '../controllers/EgresoController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken); // Protegemos las rutas

router.post('/', EgresoController.registrar);
router.get('/turno/:turnoId', EgresoController.listarPorTurno);

export default router;