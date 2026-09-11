import type { Request, Response } from 'express';
import { RegistrarParqueaderoUseCase } from '../../application/use-cases/RegistrarParqueaderoUseCase.js';
import { MySQLParqueaderoRepository } from '../../infrastructure/repositories/MySQLParqueaderoRepository.js';
import type { IRegistrarParqueaderoInput, IRenovarSuscripcionParqueaderoDTO } from '../../domain/types/parqueadero.types.js';

const registrarParqueaderoUseCase = new RegistrarParqueaderoUseCase(new MySQLParqueaderoRepository());

export class SuperAdminParqueaderoController {
    static async listar(_req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({ data: await registrarParqueaderoUseCase.listar() });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible listar los parqueaderos.' });
        }
    }

    static async detalle(req: Request, res: Response): Promise<void> {
        try {
            const parqueadero = await registrarParqueaderoUseCase.detalle(Number(req.params.id));
            if (!parqueadero) {
                res.status(404).json({ error: 'El parqueadero no existe.' });
                return;
            }
            res.status(200).json({ data: parqueadero });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible consultar el parqueadero.' });
        }
    }

    static async registrar(req: Request, res: Response): Promise<void> {
        try {
            const resultado = await registrarParqueaderoUseCase.ejecutar(req.body as IRegistrarParqueaderoInput);
            res.status(201).json({ mensaje: 'Parqueadero registrado correctamente.', data: resultado });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible registrar el parqueadero.' });
        }
    }

    static async activar(req: Request, res: Response): Promise<void> {
        await SuperAdminParqueaderoController.cambiarEstado(req, res, 'ACTIVO');
    }

    static async suspender(req: Request, res: Response): Promise<void> {
        await SuperAdminParqueaderoController.cambiarEstado(req, res, 'SUSPENDIDO');
    }

    static async renovarSuscripcion(req: Request, res: Response): Promise<void> {
        try {
            const suscripcionId = await registrarParqueaderoUseCase.renovarSuscripcion(
                Number(req.params.id),
                req.user!.usuarioId,
                req.body as IRenovarSuscripcionParqueaderoDTO
            );
            res.status(201).json({ mensaje: 'Suscripción renovada.', data: { suscripcionId } });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible renovar la suscripción.' });
        }
    }

    private static async cambiarEstado(req: Request, res: Response, estado: 'ACTIVO' | 'SUSPENDIDO'): Promise<void> {
        try {
            await registrarParqueaderoUseCase.cambiarEstado(Number(req.params.id), req.user!.usuarioId, estado, String(req.body.motivo ?? ''));
            res.status(200).json({ mensaje: estado === 'ACTIVO' ? 'Parqueadero activado.' : 'Parqueadero suspendido.' });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible cambiar el estado.' });
        }
    }
}