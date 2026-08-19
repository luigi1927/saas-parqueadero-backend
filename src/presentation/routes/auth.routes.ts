import { Router } from 'express';
import type { Request, Response } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/v1/auth/login-operario
router.post('/login-operario', AuthController.loginOperario);

// Ruta protegida de prueba
router.get('/perfil', authenticateToken, (req: Request, res: Response) => {
    res.status(200).json({
        mensaje: 'Acceso concedido a ruta protegida',
        usuarioAutenticado: req.user
    });
});

export default router;