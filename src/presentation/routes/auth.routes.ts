import { Router } from 'express';
import type { Request, Response } from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { confirmarCodigoLimiter, loginLimiter, solicitarCodigoLimiter } from '../middlewares/rateLimit.middlewares.js';

const router = Router();

// POST /api/v1/auth/login-operario
router.post('/login-operario', loginLimiter, AuthController.loginOperario);
router.post('/login-super-admin', loginLimiter, AuthController.loginSuperAdmin);

// Recuperación de acceso (restablecer PIN olvidado)
router.post('/recuperar-codigo', solicitarCodigoLimiter, AuthController.solicitarCodigoRecuperacion);
router.post('/recuperar-confirmar', confirmarCodigoLimiter, AuthController.confirmarRestablecimientoPin);

// Cambio voluntario de PIN (sesión iniciada)
router.post('/cambiar-pin', authenticateToken, AuthController.cambiarPin);

// Ruta protegida de prueba
router.get('/perfil', authenticateToken, (req: Request, res: Response) => {
    res.status(200).json({
        mensaje: 'Acceso concedido a ruta protegida',
        usuarioAutenticado: req.user
    });
});

export default router;