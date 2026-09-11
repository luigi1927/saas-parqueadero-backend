import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type { ITicketRepository } from '../../domain/repositories/ITicketRepository.js';
import type { IActualizarClienteMensualDTO } from '../../domain/types/clienteMensual.types.js';

export class GestionarClienteMensualUseCase {
    constructor(
        private readonly clienteMensualRepository: IClienteMensualRepository,
        private readonly ticketRepository: ITicketRepository
    ) { }

    async actualizar(id: number, parqueaderoId: number, usuarioId: number, datos: IActualizarClienteMensualDTO) {
        this.validarDatos(datos);
        return this.clienteMensualRepository.actualizarCliente(id, parqueaderoId, usuarioId, datos);
    }

    async detalle(id: number, parqueaderoId: number) {
        if (!Number.isInteger(id) || id <= 0) {
            throw new TypeError('El identificador de la mensualidad no es válido.');
        }
        return this.clienteMensualRepository.obtenerDetalle(id, parqueaderoId);
    }

    async cambiarPlaca(id: number, parqueaderoId: number, usuarioId: number, placaNueva: string) {
        const cliente = await this.clienteMensualRepository.buscarPorId(id, parqueaderoId);
        if (!cliente) throw new Error('La mensualidad no existe.');
        if (!placaNueva.trim()) throw new TypeError('La nueva placa es requerida.');
        const placaNuevaLimpia = placaNueva.trim().toUpperCase();
        if (!/^[A-Z0-9-]{1,10}$/.test(placaNuevaLimpia)) {
            throw new TypeError('La placa es inválida: debe tener entre 1 y 10 caracteres alfanuméricos.');
        }
        if (cliente.placa === placaNuevaLimpia) return cliente;

        const ticketActivo = await this.ticketRepository.buscarTicketActivoPorPlaca(parqueaderoId, cliente.placa);
        if (ticketActivo) {
            throw new Error('No puedes cambiar la placa mientras el vehículo anterior tenga un ticket activo.');
        }
        const mensualidadNueva = await this.clienteMensualRepository.buscarPorPlaca(placaNueva, parqueaderoId);
        if (mensualidadNueva && mensualidadNueva.id !== id) {
            throw new Error('La nueva placa ya está registrada en otra mensualidad.');
        }
        return this.clienteMensualRepository.cambiarPlaca(id, parqueaderoId, usuarioId, placaNueva);
    }

    async cancelar(id: number, parqueaderoId: number, usuarioId: number, motivo: string) {
        if (!motivo.trim()) throw new TypeError('El motivo de cancelación es requerido.');
        return this.clienteMensualRepository.cambiarEstado(id, parqueaderoId, 'CANCELADA', usuarioId, motivo.trim());
    }

    async reactivar(id: number, parqueaderoId: number, usuarioId: number, motivo: string) {
        if (!motivo.trim()) throw new TypeError('El motivo de reactivación es requerido.');
        const cliente = await this.clienteMensualRepository.buscarPorId(id, parqueaderoId);
        if (!cliente) throw new Error('La mensualidad no existe.');
        const estado = determinarEstadoActual(cliente.fechaVencimiento);
        return this.clienteMensualRepository.cambiarEstado(id, parqueaderoId, estado, usuarioId, motivo.trim());
    }

    private validarDatos(datos: IActualizarClienteMensualDTO): void {
        if (!datos.nombreCliente.trim() || !datos.telefono.trim()) {
            throw new TypeError('El nombre y teléfono son requeridos.');
        }
        if (!['SR', 'SRA', 'NEUTRO'].includes(datos.tratamiento)) {
            throw new TypeError('El tratamiento debe ser SR, SRA o NEUTRO.');
        }
        if (!Number.isInteger(datos.diaPagoMensual) || datos.diaPagoMensual < 1 || datos.diaPagoMensual > 30) {
            throw new TypeError('El día de pago debe estar entre 1 y 30.');
        }
    }
}

const determinarEstadoActual = (fechaVencimiento: Date): 'AL_DIA' | 'POR_VENCER' | 'VENCIDO' => {
    const hoy = new Date();
    const diferenciaDias = Math.floor((fechaVencimiento.getTime() - hoy.getTime()) / 86_400_000);
    if (diferenciaDias < 0) return 'VENCIDO';
    if (diferenciaDias <= 3) return 'POR_VENCER';
    return 'AL_DIA';
};