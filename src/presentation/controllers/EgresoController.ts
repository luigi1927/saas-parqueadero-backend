import type { Request, Response } from 'express';
import { MySQLEgresoRepository } from '../../infrastructure/repositories/MySQLEgresoRepository.js';
import { MySQLTurnoRepository } from '../../infrastructure/repositories/MySQLTurnoRepository.js';
import { RegistrarEgresoUseCase } from '../../application/use-cases/RegistrarEgresoUseCase.js';

const egresoRepository = new MySQLEgresoRepository();
const turnoRepository = new MySQLTurnoRepository();
const registrarEgresoUseCase = new RegistrarEgresoUseCase(egresoRepository, turnoRepository);

export class EgresoController {

    static async registrar(req: Request, res: Response): Promise<void> {
        try {
            const { monto, motivo } = req.body;
            const { parqueaderoId, usuarioId } = req.user!;

            const resultado = await registrarEgresoUseCase.ejecutar({
                parqueaderoId,
                usuarioId,
                monto: Number(monto),
                motivo
            });

            res.status(201).json({
                mensaje: 'Egreso registrado correctamente',
                data: resultado
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async listarPorTurno(req: Request, res: Response): Promise<void> {
        try {
            const { turnoId } = req.params;
            const egresos = await egresoRepository.listarPorTurno(Number(turnoId));
            res.status(200).json({ data: egresos });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}