import type { Request, Response } from 'express';
import { MySQLTicketRepository } from '../../infrastructure/repositories/MySQLTicketRepository.js';
import { RegistrarEntradaUseCase } from '../../application/use-cases/RegistrarEntradaUseCase.js';

const ticketRepository = new MySQLTicketRepository();
const registrarEntradaUseCase = new RegistrarEntradaUseCase(ticketRepository);

export class EntradaController {

    static async registrarEntrada(req: Request, res: Response): Promise<void> {
        try {
            const { placa, telefonoWhatsapp, observacionesDanos } = req.body;
            const { parqueaderoId, usuarioId } = req.user!; // Obtenido del token JWT

            if (!placa) {
                res.status(400).json({ error: 'La placa es obligatoria.' });
                return;
            }

            const resultado = await registrarEntradaUseCase.ejecutar({
                parqueaderoId,
                usuarioIngresoId: usuarioId,
                placa,
                telefonoWhatsapp,
                observacionesDanos
            });

            res.status(201).json({
                mensaje: 'Entrada de moto registrada con éxito',
                data: resultado
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}