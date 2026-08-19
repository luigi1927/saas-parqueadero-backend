import type { Request, Response } from 'express';
import { MySQLClienteMensualRepository } from '../../infrastructure/repositories/MySQLClienteMensualRepository.js';
import { MySQLTurnoRepository } from '../../infrastructure/repositories/MySQLTurnoRepository.js';
import { RegistrarClienteMensualUseCase } from '../../application/use-cases/RegistrarClienteMensualUseCase.js';
import { RegistrarPagoMensualidadUseCase } from '../../application/use-cases/RegistrarPagoMensualidadUseCase.js';

const clienteRepository = new MySQLClienteMensualRepository();
const turnoRepository = new MySQLTurnoRepository();

const registrarClienteUseCase = new RegistrarClienteMensualUseCase(clienteRepository);
const registrarPagoUseCase = new RegistrarPagoMensualidadUseCase(clienteRepository, turnoRepository);

export class ClienteMensualController {

    // GET /api/v1/clientes-mensuales
    static async listar(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId } = req.user!;
            const clientes = await clienteRepository.listarPorParqueadero(parqueaderoId);
            res.status(200).json({ data: clientes });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // POST /api/v1/clientes-mensuales
    static async crear(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId } = req.user!;
            const { placa, nombreCliente, telefono, documentoIdentidad, fechaInicioContrato, diaPagoMensual } = req.body;

            const cliente = await registrarClienteUseCase.ejecutar({
                parqueaderoId,
                placa,
                nombreCliente,
                telefono,
                documentoIdentidad,
                fechaInicioContrato,
                diaPagoMensual: diaPagoMensual ? Number(diaPagoMensual) : undefined
            });

            res.status(201).json({ mensaje: 'Cliente mensual registrado exitosamente', data: cliente });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // POST /api/v1/clientes-mensuales/:id/pagos
    static async registrarPago(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { parqueaderoId, usuarioId } = req.user!;
            const { monto, metodoPago, observaciones } = req.body;

            const pago = await registrarPagoUseCase.ejecutar(usuarioId, {
                clienteMensualId: Number(id),
                parqueaderoId,
                turnoCajaId: 0,
                monto: Number(monto),
                metodoPago: metodoPago || 'EFECTIVO',
                periodoPagadoInicio: req.body.periodoPagadoInicio ?? new Date().toISOString(),
                periodoPagadoFin: req.body.periodoPagadoFin ?? new Date().toISOString(),
                observaciones
            });

            res.status(201).json({ mensaje: 'Pago de mensualidad registrado con éxito', data: pago });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // GET /api/v1/clientes-mensuales/:id/pagos
    static async listarPagos(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { parqueaderoId } = req.user!;

            const pagos = await clienteRepository.listarPagosPorCliente(Number(id), parqueaderoId);
            res.status(200).json({ data: pagos });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}