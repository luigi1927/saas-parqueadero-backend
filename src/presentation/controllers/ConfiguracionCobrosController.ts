import type { Request, Response } from 'express';
import { GestionarConfiguracionCobrosUseCase } from '../../application/use-cases/GestionarConfiguracionCobrosUseCase.js';
import { MySQLConfiguracionCobrosDigitalesRepository } from '../../infrastructure/repositories/MySQLConfiguracionCobrosDigitalesRepository.js';

const useCase = new GestionarConfiguracionCobrosUseCase(new MySQLConfiguracionCobrosDigitalesRepository());

export class ConfiguracionCobrosController {
    static async obtener(req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({ data: await useCase.obtener(req.user!.parqueaderoId) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible consultar la configuración de cobros.' });
        }
    }

    static async actualizar(req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({ data: await useCase.actualizar(req.user!.parqueaderoId, req.body) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible actualizar la configuración de cobros.' });
        }
    }
}