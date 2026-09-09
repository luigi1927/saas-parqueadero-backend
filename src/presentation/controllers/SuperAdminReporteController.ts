import type { Request, Response } from 'express';
import { ConsultarReportesSaasUseCase } from '../../application/use-cases/ConsultarReportesSaasUseCase.js';
import { MySQLReporteRepository } from '../../infrastructure/repositories/MySQLReporteRepository.js';

const saasUseCase = new ConsultarReportesSaasUseCase(new MySQLReporteRepository());

export class SuperAdminReporteController {
    static async rentabilidad(req: Request, res: Response): Promise<void> {
        await SuperAdminReporteController.generar(req, res, (inicio, fin) => saasUseCase.rentabilidad(inicio, fin), 'rentabilidad');
    }

    static async suscripciones(req: Request, res: Response): Promise<void> {
        await SuperAdminReporteController.generar(req, res, (inicio, fin) => saasUseCase.suscripciones(inicio, fin), 'suscripciones');
    }

    static async usoPlataforma(req: Request, res: Response): Promise<void> {
        await SuperAdminReporteController.generar(req, res, (inicio, fin) => saasUseCase.usoPlataforma(inicio, fin), 'uso de la plataforma');
    }

    private static async generar(
        req: Request,
        res: Response,
        consulta: (fechaInicio: string, fechaFin: string) => Promise<unknown>,
        nombre: string
    ): Promise<void> {
        try {
            const fechaInicio = typeof req.query.fechaInicio === 'string' ? req.query.fechaInicio : '';
            const fechaFin = typeof req.query.fechaFin === 'string' ? req.query.fechaFin : '';
            res.status(200).json({ data: await consulta(fechaInicio, fechaFin) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : `No fue posible generar el reporte de ${nombre}.` });
        }
    }
}