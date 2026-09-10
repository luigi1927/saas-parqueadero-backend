import type { Request, Response } from 'express';
import { MySQLTicketRepository } from '../../infrastructure/repositories/MySQLTicketRepository.js';
import { MySQLReporteRepository } from '../../infrastructure/repositories/MySQLReporteRepository.js';

const ticketRepository = new MySQLTicketRepository();
const reporteRepository = new MySQLReporteRepository();

export class DashboardController {

    /**
     * GET /api/v1/dashboard/resumen
     * Métricas en vivo del parqueadero: ocupación actual, recaudo del día y turno.
     */
    static async resumen(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId } = req.user!;
            const hoy = new Date().toISOString().slice(0, 10);

            const [ocupacion, recaudo] = await Promise.all([
                ticketRepository.obtenerOcupacionActual(parqueaderoId),
                reporteRepository.obtenerRecaudo(parqueaderoId, { fechaInicio: hoy, fechaFin: hoy }),
            ]);

            const porcentajeOcupacion = ocupacion.capacidad > 0
                ? Math.round((ocupacion.activos / ocupacion.capacidad) * 1000) / 10
                : 0;

            res.status(200).json({
                data: {
                    nombresParqueadero: await ticketRepository.obtenerNombreParqueadero(parqueaderoId),
                    ocupacion: {
                        activos: ocupacion.activos,
                        capacidad: ocupacion.capacidad,
                        porcentajeOcupacion,
                    },
                    recaudoHoy: {
                        totalOcasional: recaudo.totalOcasional,
                        totalMensualidades: recaudo.totalMensualidades,
                        total: recaudo.totalRecaudado,
                    },
                    fecha: hoy,
                },
            });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'Error al consultar el resumen.' });
        }
    }
}