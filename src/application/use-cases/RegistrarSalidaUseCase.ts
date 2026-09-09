import type { ITicketRepository, IRegistrarSalidaDTO } from '../../domain/repositories/ITicketRepository.js';
import type { IWhatsAppService } from '../../domain/services/IWhatsAppService.js';
import { CalculadorTarifa } from '../../domain/services/CalculadorTarifa.js';

export class RegistrarSalidaUseCase {
    constructor(
        private readonly ticketRepository: ITicketRepository,
        private readonly whatsappService?: IWhatsAppService
    ) { }

    async ejecutar(dto: IRegistrarSalidaDTO) {
        // 1. Validar turno de salida del operario
        const turnoSalidaId = await this.ticketRepository.buscarTurnoAbierto(dto.parqueaderoId, dto.usuarioSalidaId);
        if (!turnoSalidaId) {
            throw new Error('Debes tener un turno de caja abierto para procesar salidas.');
        }

        // 2. Obtener el ticket (por QR o por TicketId)
        let ticket = null;

        if (dto.codigoQr) {
            // 👈 Se usa la firma existente buscarTicketPorQr(codigoQr: string)
            ticket = await this.ticketRepository.buscarTicketPorQr(dto.codigoQr);
        } else if (dto.ticketId) {
            ticket = await this.ticketRepository.buscarTicketPorId(dto.ticketId, dto.parqueaderoId);
        } else {
            throw new Error('Debes proporcionar el ID del ticket o el código QR.');
        }

        if (!ticket) throw new Error('El ticket no existe.');
        if (ticket.parqueaderoId !== dto.parqueaderoId) {
            throw new Error('El ticket no pertenece a este parqueadero.');
        }
        if (ticket.estado !== 'ACTIVO') {
            throw new Error(`El ticket ya se encuentra en estado ${ticket.estado}.`);
        }

        // 3. Calcular cobro final
        const fechaSalida = new Date();
        console.log('⏰ Calculando tarifa:', {
            fechaEntrada: ticket.fechaEntrada,
            fechaSalida: fechaSalida,
            tarifa: ticket.tarifa
        });

        const calculo = ticket.tipoVehiculo === 'MENSUAL'
            ? { minutosTotales: 0, horasACobrar: 0, subtotalBase: 0, aplicoNocturno: false, recargoNocturnoAplicado: 0, totalAPagar: 0, esTiempoGracia: false }
            : CalculadorTarifa.calcular(ticket.fechaEntrada, fechaSalida, ticket.tarifa);

        console.log('💰 Resultado del cálculo:', {
            minutosTotales: calculo.minutosTotales,
            horasACobrar: calculo.horasACobrar,
            subtotalBase: calculo.subtotalBase,
            aplicoNocturno: calculo.aplicoNocturno,
            recargoNocturnoAplicado: calculo.recargoNocturnoAplicado,
            totalAPagar: calculo.totalAPagar,
            esTiempoGracia: calculo.esTiempoGracia
        });

        // 4. Guardar salida en BDD
        await this.ticketRepository.finalizarTicket({
            ticketId: ticket.id,
            parqueaderoId: dto.parqueaderoId,
            subtotalBase: calculo.subtotalBase,
            recargoNocturnoAplicado: calculo.recargoNocturnoAplicado,
            aplicoNocturno: calculo.aplicoNocturno,
            totalPagado: calculo.totalAPagar,
            metodoPago: dto.metodoPago,
            turnoSalidaId
        });

        // 🚀 5. Notificar por WhatsApp en segundo plano si el cliente tiene número registrado
        if (ticket.telefonoWhatsapp && this.whatsappService) {
            this.ticketRepository.obtenerNombreParqueadero(dto.parqueaderoId)
                .then((nombreParqueadero: string) => {
                    return this.whatsappService!.enviarConfirmacionSalida({
                        telefono: ticket.telefonoWhatsapp!,
                        placa: ticket.placa,
                        totalPagado: calculo.totalAPagar,
                        nombreParqueadero,
                        minutosGracia: 10
                    });
                })
                .then((exito: boolean) => {
                    if (!exito) console.log(`⚠️ No se pudo entregar la confirmación de salida a: ${ticket.telefonoWhatsapp}`);
                })
                .catch((err: unknown) => {
                    console.error('❌ Error crítico al enviar confirmación de salida por WhatsApp:', err);
                });
        }

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