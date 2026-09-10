import type { Request, Response } from 'express';
import { GestionarOperarioUseCase } from '../../application/use-cases/GestionarOperarioUseCase.js';
import { MySQLUsuarioRepository } from '../../infrastructure/repositories/MySQLUsuarioRepository.js';

const useCase = new GestionarOperarioUseCase(new MySQLUsuarioRepository());

export class OperarioController {
    static async listar(req: Request, res: Response): Promise<void> {
        try {
            res.status(200).json({ data: await useCase.listar(req.user!.parqueaderoId) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible listar usuarios.' });
        }
    }

    static async registrar(req: Request, res: Response): Promise<void> {
        try {
            const usuario = await useCase.registrar(req.user!.parqueaderoId, req.user!.usuarioId, req.body);
            res.status(201).json({ mensaje: 'Operario registrado.', data: usuario });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible registrar el operario.' });
        }
    }

    static async activar(req: Request, res: Response): Promise<void> {
        await this.cambiarEstado(req, res, 'ACTIVO');
    }

    static async desactivar(req: Request, res: Response): Promise<void> {
        await this.cambiarEstado(req, res, 'INACTIVO');
    }

    static async actualizar(req: Request, res: Response): Promise<void> {
        try {
            await useCase.actualizar(req.user!.parqueaderoId, req.user!.usuarioId, Number(req.params.id), {
                nombre: String(req.body.nombre ?? ''),
                telefono: String(req.body.telefono ?? ''),
                email: req.body.email ? String(req.body.email) : undefined,
            });
            res.status(200).json({ mensaje: 'Operario actualizado.' });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible actualizar el operario.' });
        }
    }

    static async resetearPin(req: Request, res: Response): Promise<void> {
        try {
            const pinNuevo = String(req.body.pin ?? '');
            await useCase.resetearPin(req.user!.parqueaderoId, req.user!.usuarioId, Number(req.params.id), pinNuevo);
            res.status(200).json({ mensaje: 'PIN reiniciado.' });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible reiniciar el PIN.' });
        }
    }

    private static async cambiarEstado(req: Request, res: Response, estado: 'ACTIVO' | 'INACTIVO'): Promise<void> {
        try {
            await useCase.cambiarEstado(req.user!.parqueaderoId, req.user!.usuarioId, Number(req.params.id), estado, String(req.body.motivo ?? ''));
            res.status(200).json({ mensaje: estado === 'ACTIVO' ? 'Operario activado.' : 'Operario desactivado.' });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible cambiar el estado del operario.' });
        }
    }
}