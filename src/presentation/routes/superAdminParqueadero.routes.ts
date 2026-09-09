import { Router } from 'express';
import { SuperAdminParqueaderoController } from '../controllers/SuperAdminParqueaderoController.js';
import { SuperAdminPlanController } from '../controllers/SuperAdminPlanController.js';
import { SuperAdminReporteController } from '../controllers/SuperAdminReporteController.js';
import { authenticateToken, requireSuperAdmin } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticateToken, requireSuperAdmin);
router.get('/parqueaderos', SuperAdminParqueaderoController.listar);
router.get('/parqueaderos/:id', SuperAdminParqueaderoController.detalle);
router.post('/parqueaderos', SuperAdminParqueaderoController.registrar);
router.post('/parqueaderos/:id/activar', SuperAdminParqueaderoController.activar);
router.post('/parqueaderos/:id/suspender', SuperAdminParqueaderoController.suspender);
router.post('/parqueaderos/:id/suscripciones', SuperAdminParqueaderoController.renovarSuscripcion);
router.get('/reportes/rentabilidad', SuperAdminReporteController.rentabilidad);
router.get('/reportes/suscripciones', SuperAdminReporteController.suscripciones);
router.get('/reportes/uso-plataforma', SuperAdminReporteController.usoPlataforma);
router.get('/planes', SuperAdminPlanController.listar);
router.post('/planes', SuperAdminPlanController.crear);
router.put('/planes/:id', SuperAdminPlanController.actualizar);

export default router;