import QRCode from 'qrcode';
import type { ITicketRepository } from '../../domain/repositories/ITicketRepository.js';
import type { IWhatsAppService } from '../../domain/services/IWhatsAppService.js';

export class ProcesarRespuestaWhatsAppUseCase {
    constructor(
        private ticketRepository: ITicketRepository,
        private whatsappService: IWhatsAppService
    ) { }

    async ejecutar(telefonoCliente: string, textoMensaje: string) {
        // Limpiamos el texto removiendo espacios, puntos y convirtiendo a minúsculas
        const opcion = textoMensaje.trim().toLowerCase().replace('.', '');

        console.log(`⚙️ Procesando opción "${opcion}" para el número: ${telefonoCliente}`);

        // Evaluación amplia
        if (opcion === '1' || opcion.includes('tiquete') || opcion.includes('qr')) {

            // 1. Buscar en la BDD el tiquete activo del cliente
            const ticket = await this.ticketRepository.buscarTicketActivoPorTelefono(telefonoCliente);

            if (!ticket) {
                console.log(`⚠️ No se encontró tiquete en estado 'ACTIVO' para el teléfono: ${telefonoCliente}`);
                return;
            }

            console.log(`🎯 Tiquete encontrado ID ${ticket.id} (${ticket.placa}). Generando QR...`);

            // 2. Generar Buffer PNG del codigoQr (UUID v4)
            const qrBuffer = await QRCode.toBuffer(ticket.codigoQr, {
                type: 'png',
                width: 350,
                margin: 2
            });

            // 3. Responder enviando la imagen del QR
            await this.whatsappService.enviarImagenQRTiquete({
                telefono: telefonoCliente,
                placa: ticket.placa,
                ticketId: ticket.id!,
                qrBuffer
            });

            console.log(`✅ Código QR enviado exitosamente a WhatsApp.`);
        }
    }
}