import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type { ITicketRepository } from '../../domain/repositories/ITicketRepository.js';
import { RegistrarEntradaUseCase } from './RegistrarEntradaUseCase.js';
import { RegistrarSalidaUseCase } from './RegistrarSalidaUseCase.js';

export class GestionarMovimientoMensualQrUseCase {
    constructor(
        private readonly clienteRepository: IClienteMensualRepository,
        private readonly ticketRepository: ITicketRepository,
        private readonly registrarEntradaUseCase: RegistrarEntradaUseCase,
        private readonly registrarSalidaUseCase: RegistrarSalidaUseCase
    ) { }

    private async buscarClienteValido(codigoQr: string) {
        if (!codigoQr || typeof codigoQr !== 'string' || !codigoQr.trim()) {
            throw new TypeError('El código QR de la mensualidad es obligatorio.');
        }
        const cliente = await this.clienteRepository.buscarPorCodigoQr(codigoQr.trim());
        if (!cliente) {
            throw new Error('El código QR no corresponde a una mensualidad registrada.');
        }
        return cliente;
    }

    async entrada(codigoQr: string, parqueaderoId: number, usuarioIngresoId: number) {
        const cliente = await this.buscarClienteValido(codigoQr);
        if (cliente.parqueaderoId !== parqueaderoId) {
            throw new Error('La mensualidad no pertenece a este parqueadero.');
        }
        if (cliente.estado === 'CANCELADA') {
            throw new Error('La mensualidad está cancelada. No se puede registrar el ingreso.');
        }
        const vigente = cliente.fechaVencimiento >= new Date();
        if (!vigente) {
            const vencidaEn = cliente.fechaVencimiento.toLocaleDateString('es-CO');
            throw new Error(`Mensualidad VENCIDA (venció el ${vencidaEn}). No se permite el ingreso. Renuévala antes de entrar.`);
        }

        const resultado = await this.registrarEntradaUseCase.ejecutar({
            parqueaderoId,
            usuarioIngresoId,
            placa: cliente.placa,
            observacionesDanos: 'Ingreso registrado con código QR de mensualidad.'
        });

        return {
            vehiculo: 'DENTRO',
            ticketId: resultado.ticketId,
            placa: resultado.placa,
            fechaEntrada: resultado.fechaEntrada,
            codigoQrToken: resultado.codigoQrToken,
            qrImageBase64: resultado.qrImageBase64,
            nombreCliente: cliente.nombreCliente,
            tratamiento: cliente.tratamiento,
            fechaVencimientoMensualidad: cliente.fechaVencimiento
        };
    }

    async salida(codigoQr: string, parqueaderoId: number, usuarioSalidaId: number) {
        const cliente = await this.buscarClienteValido(codigoQr);
        if (cliente.parqueaderoId !== parqueaderoId) {
            throw new Error('La mensualidad no pertenece a este parqueadero.');
        }

        const ticketActivo = await this.ticketRepository.buscarTicketActivoPorPlaca(parqueaderoId, cliente.placa);
        if (!ticketActivo) {
            throw new Error('El vehículo no está dentro del parqueadero.');
        }
        if (!ticketActivo.id) {
            throw new Error('El ticket activo del vehículo no tiene un identificador válido.');
        }

        const resultado = await this.registrarSalidaUseCase.ejecutar({
            ticketId: ticketActivo.id,
            parqueaderoId,
            usuarioSalidaId,
            metodoPago: 'EFECTIVO'
        });

        return {
            vehiculo: 'FUERA',
            ticketId: resultado.ticketId,
            placa: resultado.placa,
            fechaSalida: resultado.fechaSalida,
            totalPagado: resultado.totalPagado,
            nombreCliente: cliente.nombreCliente,
            tratamiento: cliente.tratamiento,
            fechaVencimientoMensualidad: cliente.fechaVencimiento
        };
    }
}