import type { ITicketRepository, IAnularTicketDTO } from '../../domain/repositories/ITicketRepository.js';

export class AnularTicketUseCase {
    constructor(private ticketRepository: ITicketRepository) { }

    async ejecutar(dto: IAnularTicketDTO) {
        if (!dto.motivo || dto.motivo.trim().length < 5) {
            throw new Error('Debes proporcionar un motivo detallado para la anulación (mínimo 5 caracteres).');
        }

        const ticket = await this.ticketRepository.buscarTicketPorId(dto.ticketId, dto.parqueaderoId);
        if (!ticket) throw new Error('El ticket no existe.');
        if (ticket.estado !== 'ACTIVO') {
            throw new Error(`No se puede anular un ticket que ya está ${ticket.estado}.`);
        }

        await this.ticketRepository.anularTicket(dto);

        return {
            ticketId: dto.ticketId,
            estado: 'ANULADO',
            motivo: dto.motivo
        };
    }
}