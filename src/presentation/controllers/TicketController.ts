import type { Request, Response } from 'express';
import { MySQLTicketRepository } from '../../infrastructure/repositories/MySQLTicketRepository.js';
import { ConsultarTicketUseCase } from '../../application/use-cases/ConsultarTicketUseCase.js';
import { RegistrarSalidaUseCase } from '../../application/use-cases/RegistrarSalidaUseCase.js';
import { AnularTicketUseCase } from '../../application/use-cases/AnularTicketUseCase.js';
import { RegistrarEntradaUseCase } from '../../application/use-cases/RegistrarEntradaUseCase.js';
import { GestionarMovimientoMensualQrUseCase } from '../../application/use-cases/GestionarMovimientoMensualQrUseCase.js';
import { MySQLClienteMensualRepository } from '../../infrastructure/repositories/MySQLClienteMensualRepository.js';
import { MySQLConfiguracionCobrosDigitalesRepository } from '../../infrastructure/repositories/MySQLConfiguracionCobrosDigitalesRepository.js';
import { PasarelaCobroReferenciaService } from '../../infrastructure/services/PasarelaCobroReferenciaService.js';
import { whatsappService } from '../../infrastructure/services/whatsappInstance.js';

const ticketRepository = new MySQLTicketRepository();
const consultarTicketUseCase = new ConsultarTicketUseCase(ticketRepository);
const configuracionCobrosRepository = new MySQLConfiguracionCobrosDigitalesRepository();
const pasarelaService = new PasarelaCobroReferenciaService();
const registrarSalidaUseCase = new RegistrarSalidaUseCase(ticketRepository, whatsappService);
const registrarEntradaUseCase = new RegistrarEntradaUseCase(ticketRepository, new MySQLClienteMensualRepository(), whatsappService);
const gestionarMovimientoMensualQrUseCase = new GestionarMovimientoMensualQrUseCase(
    new MySQLClienteMensualRepository(),
    ticketRepository,
    registrarEntradaUseCase,
    registrarSalidaUseCase
);
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
            let respuesta: Record<string, unknown> = { ...resultado };
            if (resultado.estado === 'ACTIVO') {
                const configuracion = await configuracionCobrosRepository.obtener(resultado.parqueaderoId);
                const medios = pasarelaService.mediosDisponibles(configuracion);
                if (medios.length > 0) {
                    respuesta = {
                        ...respuesta,
                        opcionesCobroDigital: {
                            referencia: codigoQr,
                            metodos: medios
                        }
                    };
                }
            }
            res.status(200).json({ data: respuesta });
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    }

    // GET /api/v1/tickets/placa/:placa (Protegido por JWT, buscado dentro del parqueadero del cajero)
    static async consultarPorPlaca(req: Request, res: Response): Promise<void> {
        try {
            const { placa } = req.params;
            const { parqueaderoId } = req.user!;
            if (!placa || typeof placa !== 'string') {
                res.status(400).json({ error: 'La placa debe ser una cadena válida.' });
                return;
            }
            const resultado = await consultarTicketUseCase.ejecutarPorPlaca(parqueaderoId, placa);
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

    // POST /api/v1/tickets/mensual/entrada (Protegido por JWT)
    static async registrarEntradaMensualQr(req: Request, res: Response): Promise<void> {
        try {
            const { codigoQr } = req.body;
            const { parqueaderoId, usuarioId } = req.user!;

            if (!codigoQr) {
                res.status(400).json({ error: 'El código QR de la mensualidad es obligatorio.' });
                return;
            }

            const resultado = await gestionarMovimientoMensualQrUseCase.entrada(codigoQr, parqueaderoId, usuarioId);

            res.status(201).json({
                mensaje: 'Entrada registrada. El vehículo ahora está dentro del parqueadero.',
                data: resultado
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // POST /api/v1/tickets/mensual/salida (Protegido por JWT)
    static async registrarSalidaMensualQr(req: Request, res: Response): Promise<void> {
        try {
            const { codigoQr } = req.body;
            const { parqueaderoId, usuarioId } = req.user!;

            if (!codigoQr) {
                res.status(400).json({ error: 'El código QR de la mensualidad es obligatorio.' });
                return;
            }

            const resultado = await gestionarMovimientoMensualQrUseCase.salida(codigoQr, parqueaderoId, usuarioId);

            res.status(200).json({
                mensaje: 'Salida registrada. El vehículo ya está fuera del parqueadero.',
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