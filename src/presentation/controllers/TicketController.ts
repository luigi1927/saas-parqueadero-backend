import type { Request, Response } from 'express';
import { MySQLTicketRepository } from '../../infrastructure/repositories/MySQLTicketRepository.js';
import { ConsultarTicketUseCase } from '../../application/use-cases/ConsultarTicketUseCase.js';
import { RegistrarSalidaUseCase } from '../../application/use-cases/RegistrarSalidaUseCase.js';
import { AnularTicketUseCase } from '../../application/use-cases/AnularTicketUseCase.js';

const ticketRepository = new MySQLTicketRepository();
const consultarTicketUseCase = new ConsultarTicketUseCase(ticketRepository);
const registrarSalidaUseCase = new RegistrarSalidaUseCase(ticketRepository);
const anularTicketUseCase = new AnularTicketUseCase(ticketRepository);

export class TicketController {

    // GET /api/v1/tickets/qr/:codigoQr (Público para el cliente o cajero)
    static async consultarPorQr(req: Request, res: Response): Promise<void> {
        try {
            const { codigoQr } = req.params;
            // Validamos que sea un string válido y no esté vacío
            if (!codigoQr || typeof codigoQr !== 'string') {
                res.status(400).json({ error: 'El código QR debe ser una cadena válida.' });
                return;
            }
            const resultado = await consultarTicketUseCase.ejecutarPorQr(codigoQr);
            res.status(200).json({ data: resultado });
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    }

    // POST /api/v1/tickets/salida (Protegido por JWT)
    static async registrarSalida(req: Request, res: Response): Promise<void> {
        try {
            const { ticketId, metodoPago } = req.body;
            const { parqueaderoId, usuarioId } = req.user!;

            if (!ticketId || !metodoPago) {
                res.status(400).json({ error: 'El ticketId y el metodoPago son obligatorios.' });
                return;
            }

            const resultado = await registrarSalidaUseCase.ejecutar({
                ticketId: Number(ticketId),
                parqueaderoId,
                usuarioSalidaId: usuarioId,
                metodoPago
            });

            res.status(200).json({
                mensaje: 'Salida registrada y cobro procesado con éxito',
                data: resultado
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // POST /api/v1/tickets/anular (Protegido por JWT)
    static async anularTicket(req: Request, res: Response): Promise<void> {
        try {
            const { ticketId, motivo } = req.body;
            const { parqueaderoId, usuarioId } = req.user!;

            if (!ticketId || !motivo) {
                res.status(400).json({ error: 'El ticketId y el motivo son obligatorios.' });
                return;
            }

            const resultado = await anularTicketUseCase.ejecutar({
                ticketId: Number(ticketId),
                parqueaderoId,
                usuarioId,
                motivo
            });

            res.status(200).json({
                mensaje: 'Ticket anulado correctamente',
                data: resultado
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}