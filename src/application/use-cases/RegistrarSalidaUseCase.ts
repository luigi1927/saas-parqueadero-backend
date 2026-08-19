import type { ITicketRepository, IRegistrarSalidaDTO } from '../../domain/repositories/ITicketRepository.js';
import { CalculadorTarifa } from '../../domain/services/CalculadorTarifa.js';

export class RegistrarSalidaUseCase {
    constructor(private ticketRepository: ITicketRepository) { }

    async ejecutar(dto: IRegistrarSalidaDTO) {
        // 1. Validar turno de salida del operario
        const turnoSalidaId = await this.ticketRepository.buscarTurnoAbierto(dto.parqueaderoId, dto.usuarioSalidaId);
        if (!turnoSalidaId) {
            throw new Error('Debes tener un turno de caja abierto para procesar salidas.');
        }

        // 2. Obtener el ticket
        const ticket = await this.ticketRepository.buscarTicketPorId(dto.ticketId, dto.parqueaderoId);
        if (!ticket) throw new Error('El ticket no existe.');
        if (ticket.estado !== 'ACTIVO') {
            throw new Error(`El ticket ya se encuentra en estado ${ticket.estado}.`);
        }

        // 3. Calcular cobro final
        const fechaSalida = new Date();
        const calculo = CalculadorTarifa.calcular(ticket.fechaEntrada, fechaSalida, ticket.tarifa);

        // 4. Guardar salida en BDD
        await this.ticketRepository.finalizarTicket({
            ticketId: ticket.id,
            subtotalBase: calculo.subtotalBase,
            recargoNocturnoAplicado: calculo.recargoNocturnoAplicado,
            aplicoNocturno: calculo.aplicoNocturno,
            totalPagado: calculo.totalAPagar,
            metodoPago: dto.metodoPago,
            turnoSalidaId
        });

        return {
            ticketId: ticket.id,
            placa: ticket.placa,
            fechaEntrada: ticket.fechaEntrada,
            fechaSalida,
            minutosTotales: calculo.minutosTotales,
            subtotalBase: calculo.subtotalBase,
            recargoNocturnoAplicado: calculo.recargoNocturnoAplicado,
            totalPagado: calculo.totalAPagar,
            metodoPago: dto.metodoPago,
            estado: 'FINALIZADO'
        };
    }
}