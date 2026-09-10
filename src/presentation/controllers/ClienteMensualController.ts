import type { Request, Response } from 'express';
import { MySQLClienteMensualRepository } from '../../infrastructure/repositories/MySQLClienteMensualRepository.js';
import { MySQLTurnoRepository } from '../../infrastructure/repositories/MySQLTurnoRepository.js';
import { MySQLTarifaRepository } from '../../infrastructure/repositories/MySQLTarifaRepository.js';
import { RegistrarClienteMensualUseCase } from '../../application/use-cases/RegistrarClienteMensualUseCase.js';
import { RegistrarPagoMensualidadUseCase } from '../../application/use-cases/RegistrarPagoMensualidadUseCase.js';
import { GestionarClienteMensualUseCase } from '../../application/use-cases/GestionarClienteMensualUseCase.js';
import { MySQLTicketRepository } from '../../infrastructure/repositories/MySQLTicketRepository.js';
import { whatsappService } from '../../infrastructure/services/whatsappInstance.js';
import { ConsultarTrazabilidadMensualidadUseCase } from '../../application/use-cases/ConsultarTrazabilidadMensualidadUseCase.js';
import { MySQLTrazabilidadMensualidadRepository } from '../../infrastructure/repositories/MySQLTrazabilidadMensualidadRepository.js';
import { ReintentarNotificacionMensualidadUseCase } from '../../application/use-cases/ReintentarNotificacionMensualidadUseCase.js';
import { MySQLNotificacionMensualidadRepository } from '../../infrastructure/repositories/MySQLNotificacionMensualidadRepository.js';
import { ConsultarEstadoMensualidadQrUseCase } from '../../application/use-cases/ConsultarEstadoMensualidadQrUseCase.js';

const clienteRepository = new MySQLClienteMensualRepository();
const turnoRepository = new MySQLTurnoRepository();
const tarifaRepository = new MySQLTarifaRepository();
const ticketRepository = new MySQLTicketRepository();

const registrarClienteUseCase = new RegistrarClienteMensualUseCase(clienteRepository, turnoRepository, tarifaRepository, whatsappService);
const registrarPagoUseCase = new RegistrarPagoMensualidadUseCase(clienteRepository, turnoRepository, tarifaRepository);
const gestionarClienteUseCase = new GestionarClienteMensualUseCase(clienteRepository, ticketRepository);
const trazabilidadUseCase = new ConsultarTrazabilidadMensualidadUseCase(new MySQLTrazabilidadMensualidadRepository());
const reintentarNotificacionUseCase = new ReintentarNotificacionMensualidadUseCase(new MySQLNotificacionMensualidadRepository());
const consultarEstadoQrUseCase = new ConsultarEstadoMensualidadQrUseCase(clienteRepository, ticketRepository);

export class ClienteMensualController {

    static async consultarEstadoPorQr(req: Request, res: Response): Promise<void> {
        try {
            const { codigoQr } = req.params as Record<string, string>;
            if (!codigoQr?.trim()) {
                res.status(400).json({ error: 'Código QR requerido.' });
                return;
            }
            const resultado = await consultarEstadoQrUseCase.ejecutar(codigoQr.trim());
            res.status(200).json({ data: resultado });
        } catch (error: unknown) {
            res.status(404).json({ error: error instanceof Error ? error.message : 'No fue posible consultar el estado de la mensualidad.' });
        }
    }

    // GET /api/v1/clientes-mensuales/mi-mensualidad
    // Autoservicio del rol CLIENTE: devuelve su mensualidad, estado, pagos y ticket activo del día.
    static async miMensualidad(req: Request, res: Response): Promise<void> {
        try {
            const usuarioId = req.user!.usuarioId;
            const cliente = await clienteRepository.buscarPorUsuarioId(usuarioId);
            if (!cliente) {
                res.status(404).json({ error: 'No tienes una mensualidad asociada a esta cuenta.' });
                return;
            }

            const [pagos, ticketActivo, nombreParqueadero] = await Promise.all([
                clienteRepository.listarPagosPorCliente(cliente.id, cliente.parqueaderoId),
                ticketRepository.buscarTicketActivoPorPlaca(cliente.parqueaderoId, cliente.placa),
                clienteRepository.obtenerNombreParqueadero(cliente.parqueaderoId),
            ]);

            const hoy = new Date();
            const vencimiento = new Date(cliente.fechaVencimiento);
            let estadoCalculado: 'AL_DIA' | 'POR_VENCER' | 'VENCIDO' | 'CANCELADA' = cliente.estado;
            if (cliente.estado !== 'CANCELADA') {
                const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / 86400000);
                estadoCalculado = diasRestantes < 0 ? 'VENCIDO' : diasRestantes <= 3 ? 'POR_VENCER' : 'AL_DIA';
            }

            res.status(200).json({
                data: {
                    cliente: {
                        id: cliente.id,
                        placa: cliente.placa,
                        codigoQr: cliente.codigoQr,
                        nombreCliente: cliente.nombreCliente,
                        tratamiento: cliente.tratamiento,
                        telefono: cliente.telefono,
                        fechaVencimiento: cliente.fechaVencimiento,
                        diaPagoMensual: cliente.diaPagoMensual,
                        parqueaderoId: cliente.parqueaderoId,
                    },
                    nombreParqueadero,
                    estadoMensualidad: estadoCalculado,
                    ticketActivo: ticketActivo ? {
                        id: ticketActivo.id,
                        placa: ticketActivo.placa,
                        codigoQr: ticketActivo.codigoQr,
                        fechaEntrada: ticketActivo.fechaEntrada,
                        tipoVehiculo: ticketActivo.tipoVehiculo,
                    } : null,
                    pagos: pagos.slice(0, 6).map((pago) => ({
                        id: pago.id,
                        monto: pago.monto,
                        metodoPago: pago.metodoPago,
                        fechaPago: pago.fechaPago,
                        periodoPagadoFin: pago.periodoPagadoFin,
                    })),
                },
            });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible consultar tu mensualidad.' });
        }
    }

    static async reintentarNotificacion(req: Request, res: Response): Promise<void> {
        try {
            await reintentarNotificacionUseCase.ejecutar(Number(req.params.notificacionId), req.user!.parqueaderoId);
            res.status(202).json({ mensaje: 'Notificación programada para reintento.' });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible reintentar la notificación.' });
        }
    }

    static async listarIntenciones(req: Request, res: Response): Promise<void> {
        try {
            const filtros = obtenerFiltrosTrazabilidad(req);
            res.status(200).json({ data: await trazabilidadUseCase.intenciones(req.user!.parqueaderoId, filtros) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible listar intenciones.' });
        }
    }

    static async listarNotificaciones(req: Request, res: Response): Promise<void> {
        try {
            const filtros = obtenerFiltrosTrazabilidad(req);
            res.status(200).json({ data: await trazabilidadUseCase.notificaciones(req.user!.parqueaderoId, filtros) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible listar notificaciones.' });
        }
    }

    static async resumen(req: Request, res: Response): Promise<void> {
        try {
            const resumen = await clienteRepository.obtenerResumenAdministrativo(req.user!.parqueaderoId);
            res.status(200).json({ data: resumen });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible consultar el resumen.' });
        }
    }

    // GET /api/v1/clientes-mensuales
    static async listar(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId } = req.user!;
            const pagina = Number(req.query.pagina ?? 1);
            const limite = Number(req.query.limite ?? 20);
            const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
            if (estado !== undefined && !['AL_DIA', 'POR_VENCER', 'VENCIDO', 'CANCELADA'].includes(estado)) {
                res.status(400).json({ error: 'El estado de mensualidad no es válido.' });
                return;
            }
            const clientes = await clienteRepository.listarAdministrativo(parqueaderoId, {
                pagina,
                limite,
                busqueda: typeof req.query.busqueda === 'string' ? req.query.busqueda : undefined,
                estado: estado as 'AL_DIA' | 'POR_VENCER' | 'VENCIDO' | 'CANCELADA' | undefined
            });
            res.status(200).json({ data: clientes });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async detalle(req: Request, res: Response): Promise<void> {
        try {
            const detalle = await gestionarClienteUseCase.detalle(Number(req.params.id), req.user!.parqueaderoId);
            if (!detalle) {
                res.status(404).json({ error: 'La mensualidad no existe.' });
                return;
            }
            res.status(200).json({ data: detalle });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible consultar la mensualidad.' });
        }
    }

    // POST /api/v1/clientes-mensuales
    static async crear(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId, usuarioId } = req.user!;
            const { placa, nombreCliente, tratamiento, telefono, documentoIdentidad, fechaInicioContrato, diaPagoMensual, metodoPagoInicial } = req.body;

            const cliente = await registrarClienteUseCase.ejecutar(usuarioId, {
                parqueaderoId,
                placa,
                nombreCliente,
                tratamiento,
                telefono,
                documentoIdentidad,
                fechaInicioContrato,
                diaPagoMensual: diaPagoMensual ? Number(diaPagoMensual) : undefined,
                metodoPagoInicial
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
            const { metodoPago, observaciones } = req.body;
            const idempotencyKey = req.header('Idempotency-Key');
            if (!idempotencyKey?.trim()) {
                res.status(400).json({ error: 'El encabezado Idempotency-Key es requerido.' });
                return;
            }

            const pago = await registrarPagoUseCase.ejecutar(usuarioId, {
                clienteMensualId: Number(id),
                parqueaderoId,
                monto: 0,
                metodoPago: metodoPago || 'EFECTIVO',
                canal: 'FISICO',
                idempotencyKey: idempotencyKey.trim(),
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

    static async obtenerRecibo(req: Request, res: Response): Promise<void> {
        try {
            const recibo = await clienteRepository.obtenerReciboPago(Number(req.params.pagoId), req.user!.parqueaderoId);
            if (!recibo) {
                res.status(404).json({ error: 'El recibo de mensualidad no existe.' });
                return;
            }
            res.status(200).json({ data: recibo });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible consultar el recibo.' });
        }
    }

    static async enviarRecibo(req: Request, res: Response): Promise<void> {
        try {
            const recibo = await clienteRepository.obtenerReciboPago(Number(req.params.pagoId), req.user!.parqueaderoId);
            if (!recibo) {
                res.status(404).json({ error: 'El recibo de mensualidad no existe.' });
                return;
            }
            const enviado = await whatsappService.enviarReciboMensualidad(recibo);
            if (!enviado) {
                throw new Error('WhatsApp no confirmó el envío del recibo.');
            }
            res.status(200).json({ mensaje: 'Recibo enviado por WhatsApp.', data: recibo });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible enviar el recibo.' });
        }
    }

    static async actualizar(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId, usuarioId } = req.user!;
            const cliente = await gestionarClienteUseCase.actualizar(Number(req.params.id), parqueaderoId, usuarioId, req.body);
            res.status(200).json({ mensaje: 'Mensualidad actualizada.', data: cliente });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible actualizar la mensualidad.' });
        }
    }

    static async cambiarPlaca(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId, usuarioId } = req.user!;
            const cliente = await gestionarClienteUseCase.cambiarPlaca(Number(req.params.id), parqueaderoId, usuarioId, String(req.body.placaNueva ?? ''));
            res.status(200).json({ mensaje: 'Placa actualizada.', data: cliente });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible cambiar la placa.' });
        }
    }

    static async cancelar(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId, usuarioId } = req.user!;
            const cliente = await gestionarClienteUseCase.cancelar(Number(req.params.id), parqueaderoId, usuarioId, String(req.body.motivo ?? ''));
            res.status(200).json({ mensaje: 'Mensualidad cancelada.', data: cliente });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible cancelar la mensualidad.' });
        }
    }

    static async reactivar(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId, usuarioId } = req.user!;
            const cliente = await gestionarClienteUseCase.reactivar(Number(req.params.id), parqueaderoId, usuarioId, String(req.body.motivo ?? ''));
            res.status(200).json({ mensaje: 'Mensualidad reactivada.', data: cliente });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible reactivar la mensualidad.' });
        }
    }
}

const obtenerFiltrosTrazabilidad = (req: Request): { pagina: number; limite: number; clienteMensualId?: number; estado?: string } => {
    const clienteMensualId = typeof req.query.clienteMensualId === 'string' ? Number(req.query.clienteMensualId) : undefined;
    const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
    return {
        pagina: Number(req.query.pagina ?? 1),
        limite: Number(req.query.limite ?? 20),
        ...(clienteMensualId === undefined ? {} : { clienteMensualId }),
        ...(estado === undefined ? {} : { estado })
    };
};