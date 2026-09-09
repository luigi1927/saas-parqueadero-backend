import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type { ITicketRepository } from '../../domain/repositories/ITicketRepository.js';
import type { IConsultaEstadoMensualidadQr } from '../../domain/types/clienteMensual.types.js';

export class ConsultarEstadoMensualidadQrUseCase {
    constructor(
        private readonly clienteRepository: IClienteMensualRepository,
        private readonly ticketRepository: ITicketRepository
    ) { }

    async ejecutar(codigoQr: string): Promise<IConsultaEstadoMensualidadQr> {
        const cliente = await this.clienteRepository.buscarPorCodigoQr(codigoQr);
        if (!cliente) {
            throw new Error('El código QR no corresponde a una mensualidad registrada.');
        }

        const ticketActivo = await this.ticketRepository.buscarTicketActivoPorPlaca(cliente.parqueaderoId, cliente.placa);
        const mensualidadVigente = cliente.estado !== 'CANCELADA' && cliente.fechaVencimiento >= new Date();

        return {
            placa: cliente.placa,
            nombreCliente: cliente.nombreCliente,
            tratamiento: cliente.tratamiento,
            parqueaderoId: cliente.parqueaderoId,
            nombreParqueadero: cliente.nombreParqueadero,
            fechaVencimiento: cliente.fechaVencimiento,
            estadoMensualidad: cliente.estado,
            mensualidadVigente,
            vehiculo: ticketActivo?.id
                ? {
                    estado: 'DENTRO',
                    ticketActivo: {
                        ticketId: ticketActivo.id,
                        fechaEntrada: ticketActivo.fechaEntrada ?? new Date(),
                        tipoVehiculo: ticketActivo.tipoVehiculo ?? 'MENSUAL'
                    }
                }
                : { estado: 'FUERA' }
        };
    }
}