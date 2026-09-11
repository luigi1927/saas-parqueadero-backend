import { Router } from 'express';
import { EntradaController } from '../controllers/EntradaController.js';
import { authenticateToken, requireParqueaderoOperativo, requireRoles } from '../middlewares/auth.middleware.js';
import { entradaOperacionalLimiter } from '../middlewares/rateLimit.middlewares.js';

const router = Router();

// POST /api/v1/entradas (Ruta Protegida con JWT)
router.post('/', entradaOperacionalLimiter, authenticateToken, requireParqueaderoOperativo, requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), EntradaController.registrarEntrada);

export default router;