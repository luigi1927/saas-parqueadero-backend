import type { Request, Response } from 'express';
import { GestionarPlanSaasUseCase } from '../../application/use-cases/GestionarPlanSaasUseCase.js';
import { MySQLPlanSaasRepository } from '../../infrastructure/repositories/MySQLPlanSaasRepository.js';

const useCase = new GestionarPlanSaasUseCase(new MySQLPlanSaasRepository());

export class SuperAdminPlanController {
    static async listar(_req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({ data: await useCase.listar() });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible listar los planes.' });
        }
    }

    static async crear(req: Request, res: Response): Promise<void> {
        try {
            res.status(201).json({ data: await useCase.crear(req.body) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible crear el plan.' });
        }
    }

    static async actualizar(req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({ data: await useCase.actualizar(Number(req.params.id), req.body) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible actualizar el plan.' });
        }
    }

    static async eliminar(req: Request, res: Response): Promise<void> {
        try {
            await useCase.eliminar(Number(req.params.id));
            res.status(200).json({ data: true });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible eliminar el plan.' });
        }
    }
}