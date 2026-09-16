import type { NextFunction, Request, Response } from 'express';
import { MySQLPlanSaasRepository } from '../../infrastructure/repositories/MySQLPlanSaasRepository.js';
import type { IPlanSaas } from '../../domain/types/planSaas.types.js';

type FeaturePlan = keyof Pick<
    IPlanSaas,
    'soportaWhatsapp' | 'soportaPagosDigitales' | 'soportaVerReportes' | 'soportaDescargarReportes' | 'recordatoriosWhatsapp'
>;

const MENSAJES_FEATURE: Record<FeaturePlan, string> = {
    soportaWhatsapp: 'Tu plan actual no incluye la integración con WhatsApp.',
    soportaPagosDigitales: 'Tu plan actual no incluye pagos digitales (WOMPI/NEQUI).',
    soportaVerReportes: 'Tu plan actual no incluye la visualización de reportes e historial.',
    soportaDescargarReportes: 'Tu plan actual no incluye la descarga de reportes.',
    recordatoriosWhatsapp: 'Tu plan actual no incluye recordatorios de vencimiento por WhatsApp.'
};

const planRepository = new MySQLPlanSaasRepository();

export const requirePlanFeature = (feature: FeaturePlan) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parqueaderoId = req.user?.parqueaderoId ?? 0;
            if (parqueaderoId <= 0) {
                res.status(403).json({ error: 'Esta operación requiere un parqueadero asignado.' });
                return;
            }

            const acceso = await planRepository.obtenerVigenteYEstado(parqueaderoId);

            // Durante la prueba gratuita se permite probar todas las funcionalidades.
            if (acceso.estadoParqueadero === 'PRUEBA_GRATUITA') {
                next();
                return;
            }

            if (!acceso.plan) {
                res.status(403).json({ error: 'El parqueadero no tiene un plan activo. Contrata un plan para continuar.' });
                return;
            }

            if (acceso.plan[feature]) {
                next();
                return;
            }

            res.status(403).json({ error: `${MENSAJES_FEATURE[feature]} Mejora tu plan desde Mi perfil.` });
        } catch (error: unknown) {
            next(error);
        }
    };