import { Router } from 'express';
import { TurnoController } from '../controllers/TurnoController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticateToken); // Protegemos todas las rutas de turnos con JWT

router.get('/actual', TurnoController.consultarEstadoActual);
router.post('/abrir', TurnoController.abrirTurno);
router.post('/cerrar', TurnoController.cerrarTurno);

export default router;