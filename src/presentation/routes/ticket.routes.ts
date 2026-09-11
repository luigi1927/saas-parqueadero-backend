import { Router } from 'express';
import { TicketController } from '../controllers/TicketController.js';
import { authenticateToken, requireParqueaderoOperativo, requireRoles } from '../middlewares/auth.middleware.js';
import { qrPublicoLimiter, salidaOperacionalLimiter } from '../middlewares/rateLimit.middlewares.js';

const router = Router();

// Ruta pública para consultar estado del ticket escaneando el QR
router.get('/qr/:codigoQr', qrPublicoLimiter, TicketController.consultarPorQr);

// Ruta protegida para el cajero: buscar el ticket activo por placa dentro de su parqueadero
router.get('/placa/:placa', authenticateToken, requireParqueaderoOperativo, requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), TicketController.consultarPorPlaca);

// Rutas protegidas para el cajero
router.post('/salida', salidaOperacionalLimiter, authenticateToken, requireParqueaderoOperativo, requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), TicketController.registrarSalida);
router.post('/anular', salidaOperacionalLimiter, authenticateToken, requireParqueaderoOperativo, requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), TicketController.anularTicket);

export default router;