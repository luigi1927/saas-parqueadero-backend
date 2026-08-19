import { Router } from 'express';
import { EntradaController } from '../controllers/EntradaController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/v1/entradas (Ruta Protegida con JWT)
router.post('/', authenticateToken, EntradaController.registrarEntrada);

export default router;