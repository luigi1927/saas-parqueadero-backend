import type { Request, Response } from 'express';
import { MySQLTarifaRepository } from '../../infrastructure/repositories/MySQLTarifaRepository.js';
import { ConsultarTarifaUseCase } from '../../application/use-cases/ConsultarTarifaUseCase.js';
import { GestionarTarifaUseCase } from '../../application/use-cases/GestionarTarifaUseCase.js';

const tarifaRepository = new MySQLTarifaRepository();
const consultarTarifaUseCase = new ConsultarTarifaUseCase(tarifaRepository);
const gestionarTarifaUseCase = new GestionarTarifaUseCase(tarifaRepository);

export class TarifaController {

    // GET /api/v1/tarifas/activa
    static async obtenerTarifaActiva(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId } = req.user!;
            const tarifa = await consultarTarifaUseCase.ejecutar(parqueaderoId);
            res.status(200).json({ data: tarifa });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // POST /api/v1/tarifas
    static async crear(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId } = req.user!;
            const { nombre, precioBaseHora, minutosGracia, horaInicioNocturna, horaFinNocturna, tipoRecargoNocturno, valorRecargoNocturno, precioMensualidad } = req.body;

            if (precioBaseHora === undefined || precioMensualidad === undefined) {
                res.status(400).json({ error: 'El precioBaseHora y precioMensualidad son requeridos.' });
                return;
            }

            const tarifa = await gestionarTarifaUseCase.crear({
                parqueaderoId,
                nombre,
                precioBaseHora: Number(precioBaseHora),
                minutosGracia: minutosGracia !== undefined ? Number(minutosGracia) : undefined,
                horaInicioNocturna,
                horaFinNocturna,
                tipoRecargoNocturno,
                valorRecargoNocturno: valorRecargoNocturno !== undefined ? Number(valorRecargoNocturno) : undefined,
                precioMensualidad: Number(precioMensualidad)
            });

            res.status(201).json({ mensaje: 'Tarifa creada exitosamente', data: tarifa });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // PUT /api/v1/tarifas/:id
    static async actualizar(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { parqueaderoId } = req.user!;

            const tarifaActualizada = await gestionarTarifaUseCase.actualizar(
                Number(id),
                parqueaderoId,
                req.body
            );

            res.status(200).json({ mensaje: 'Tarifa actualizada correctamente', data: tarifaActualizada });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}