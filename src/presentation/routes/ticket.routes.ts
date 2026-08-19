import { Router } from 'express';
import { TicketController } from '../controllers/TicketController.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Ruta pública para consultar estado del ticket escaneando el QR
router.get('/qr/:codigoQr', TicketController.consultarPorQr);

// Rutas protegidas para el cajero
router.post('/salida', authenticateToken, TicketController.registrarSalida);
router.post('/anular', authenticateToken, TicketController.anularTicket);

export default router;