import { Router } from 'express';
import { ClienteMensualController } from '../controllers/ClienteMensualController.js';
import { authenticateToken, requireParqueaderoOperativo, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Ruta pública: consultar estado del vehículo de una mensualidad mediante su QR.
// Debe registrarse antes del middleware de autenticación.
router.get('/qr/:codigoQr', ClienteMensualController.consultarEstadoPorQr);

router.use(authenticateToken, requireParqueaderoOperativo);

router.get('/resumen', requireRoles('ADMIN_PARQUEADERO'), ClienteMensualController.resumen);
router.get('/intenciones', requireRoles('ADMIN_PARQUEADERO'), ClienteMensualController.listarIntenciones);
router.get('/notificaciones', requireRoles('ADMIN_PARQUEADERO'), ClienteMensualController.listarNotificaciones);
router.post('/notificaciones/:notificacionId/reintentar', requireRoles('ADMIN_PARQUEADERO'), ClienteMensualController.reintentarNotificacion);
router.get('/', requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), ClienteMensualController.listar);
router.post('/', requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), ClienteMensualController.crear);
router.get('/:id', requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), ClienteMensualController.detalle);
router.post('/:id/pagos', requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), ClienteMensualController.registrarPago);
router.get('/:id/pagos', requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), ClienteMensualController.listarPagos);
router.get('/pagos/:pagoId/recibo', requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), ClienteMensualController.obtenerRecibo);
router.post('/pagos/:pagoId/recibo/enviar', requireRoles('ADMIN_PARQUEADERO', 'OPERARIO'), ClienteMensualController.enviarRecibo);
router.put('/:id', requireRoles('ADMIN_PARQUEADERO'), ClienteMensualController.actualizar);
router.patch('/:id/placa', requireRoles('ADMIN_PARQUEADERO'), ClienteMensualController.cambiarPlaca);
router.post('/:id/cancelar', requireRoles('ADMIN_PARQUEADERO'), ClienteMensualController.cancelar);
router.post('/:id/reactivar', requireRoles('ADMIN_PARQUEADERO'), ClienteMensualController.reactivar);

export default router;