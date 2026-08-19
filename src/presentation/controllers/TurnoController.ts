import type { Request, Response } from 'express';
import { MySQLTurnoRepository } from '../../infrastructure/repositories/MySQLTurnoRepository.js';
import { AbrirTurnoUseCase } from '../../application/use-cases/AbrirTurnoUseCase.js';
import { CerrarTurnoUseCase } from '../../application/use-cases/CerrarTurnoUseCase.js';
import { ConsultarEstadoTurnoUseCase } from '../../application/use-cases/ConsultarEstadoTurnoUseCase.js';

const turnoRepository = new MySQLTurnoRepository();
const abrirTurnoUseCase = new AbrirTurnoUseCase(turnoRepository);
const cerrarTurnoUseCase = new CerrarTurnoUseCase(turnoRepository);
const consultarEstadoTurnoUseCase = new ConsultarEstadoTurnoUseCase(turnoRepository);

export class TurnoController {

    // POST /api/v1/turnos/abrir
    static async abrirTurno(req: Request, res: Response): Promise<void> {
        try {
            const { montoInicialEfectivo } = req.body;
            const { parqueaderoId, usuarioId } = req.user!;

            if (montoInicialEfectivo === undefined || montoInicialEfectivo === null) {
                res.status(400).json({ error: 'El montoInicialEfectivo es requerido.' });
                return;
            }

            const resultado = await abrirTurnoUseCase.ejecutar({
                parqueaderoId,
                usuarioId,
                montoInicialEfectivo: Number(montoInicialEfectivo)
            });

            res.status(201).json({
                mensaje: 'Turno de caja abierto correctamente',
                data: resultado
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // POST /api/v1/turnos/cerrar
    static async cerrarTurno(req: Request, res: Response): Promise<void> {
        try {
            const { turnoId, efectivoReportadoCierre, observacionesCierre } = req.body;
            const { parqueaderoId, usuarioId } = req.user!;

            if (!turnoId || efectivoReportadoCierre === undefined) {
                res.status(400).json({ error: 'El turnoId y el efectivoReportadoCierre son requeridos.' });
                return;
            }

            const resultado = await cerrarTurnoUseCase.ejecutar({
                turnoId: Number(turnoId),
                parqueaderoId,
                usuarioId,
                efectivoReportadoCierre: Number(efectivoReportadoCierre),
                observacionesCierre
            });

            res.status(200).json({
                mensaje: 'Turno de caja cerrado correctamente',
                data: resultado
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // GET /api/v1/turnos/actual
    static async consultarEstadoActual(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId, usuarioId } = req.user!;
            const resultado = await consultarEstadoTurnoUseCase.ejecutar(parqueaderoId, usuarioId);
            res.status(200).json({ data: resultado });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}