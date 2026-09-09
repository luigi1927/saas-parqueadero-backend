import { Router } from 'express';
import { ReporteController } from '../controllers/ReporteController.js';
import { authenticateToken, requireParqueaderoOperativo, requireRoles } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticateToken, requireParqueaderoOperativo, requireRoles('ADMIN_PARQUEADERO'));
router.get('/recaudo', ReporteController.recaudo);
router.get('/cuadre-caja', ReporteController.cuadreCaja);
router.get('/egresos', ReporteController.egresos);
router.get('/ocupacion', ReporteController.ocupacion);
router.get('/mora', ReporteController.mora);
router.get('/recaudo-mensualidades', ReporteController.recaudoMensualidades);
router.get('/desercion', ReporteController.desercion);
router.get('/anulaciones', ReporteController.anulaciones);
router.get('/actividad-operarios', ReporteController.actividadOperarios);
router.get('/auditoria', ReporteController.auditoria);

export default router;