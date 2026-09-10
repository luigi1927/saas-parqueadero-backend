// import QRCode from 'qrcode';
// import type { ITicketRepository } from '../../domain/repositories/ITicketRepository.js';
// import type { IWhatsAppService } from '../../domain/services/IWhatsAppService.js';

// export class ProcesarRespuestaWhatsAppUseCase {
//     constructor(
//         private ticketRepository: ITicketRepository,
//         private whatsappService: IWhatsAppService
//     ) { }

//     async ejecutar(telefonoCliente: string, textoMensaje: string) {
//         // Limpiamos el texto removiendo espacios, puntos y convirtiendo a minúsculas
//         const opcion = textoMensaje.trim().toLowerCase().replace('.', '');

//         console.log(`⚙️ Procesando opción "${opcion}" para el número: ${telefonoCliente}`);

//         // Evaluación amplia
//         if (opcion === '1' || opcion.includes('tiquete') || opcion.includes('qr')) {

//             // 1. Buscar en la BDD el tiquete activo del cliente
//             const ticket = await this.ticketRepository.buscarTicketActivoPorTelefono(telefonoCliente);

//             if (!ticket) {
//                 console.log(`⚠️ No se encontró tiquete en estado 'ACTIVO' para el teléfono: ${telefonoCliente}`);
//                 return;
//             }

//             console.log(`🎯 Tiquete encontrado ID ${ticket.id} (${ticket.placa}). Generando QR...`);

//             // 2. Generar Buffer PNG del codigoQr (UUID v4)
//             const qrBuffer = await QRCode.toBuffer(ticket.codigoQr, {
//                 type: 'png',
//                 width: 350,
//                 margin: 2
//             });

//             // 3. Responder enviando la imagen del QR
//             await this.whatsappService.enviarImagenQRTiquete({
//                 telefono: telefonoCliente,
//                 placa: ticket.placa,
//                 ticketId: ticket.id!,
//                 qrBuffer
//             });

//             console.log(`✅ Código QR enviado exitosamente a WhatsApp.`);
//         }
//     }
// }

import QRCode from 'qrcode';
import type { ITicketRepository } from '../../domain/repositories/ITicketRepository.js';
import type { BaileysWhatsAppService } from '../../infrastructure/services/BaileysWhatsAppService.js';

export class ProcesarRespuestaWhatsAppUseCase {
    constructor(
        private readonly ticketRepository: ITicketRepository,
        private readonly whatsappService: BaileysWhatsAppService
    ) { }

    async ejecutar(telefonoCliente: string, textoMensaje: string) {
        const opcion = textoMensaje.trim().toLowerCase().replace('.', '');

        console.log(opcion);

        // CÓDIGO QR DEL TIQUETE: el cliente pide la imagen QR para mostrar en el control de acceso.
        if (opcion.includes('qr') || opcion.includes('código qr') || opcion === '3') {
            const ticket = await this.ticketRepository.buscarTicketActivoPorTelefono(telefonoCliente);

            if (!ticket) {
                console.log(`⚠️ No se encontró tiquete activo para: ${telefonoCliente}`);
                return;
            }

            const qrBuffer = await QRCode.toBuffer(ticket.codigoQr, {
                type: 'png',
                width: 350,
                margin: 2
            });

            await this.whatsappService.enviarImagenQRTiquete({
                telefono: telefonoCliente,
                placa: ticket.placa,
                ticketId: ticket.id!,
                qrBuffer
            });

            console.log(`✅ Código QR enviado a WhatsApp [${telefonoCliente}] para ${ticket.placa}.`);
            return;
        }
        if (opcion === '1') {
            await this.whatsappService.enviarMenuMediosPago(telefonoCliente);
            return;
        }

        // OPCIÓN 2: TIQUETE DE PARQUEADERO (Muestra tiempo, PIN y enlace al visor WEB)
        if (opcion === '2' || opcion.includes('tiquete')) {
            const ticket = await this.ticketRepository.buscarTicketActivoPorTelefono(telefonoCliente);

            if (!ticket) {
                console.log(`⚠️ No se encontró tiquete activo para: ${telefonoCliente}`);
                return;
            }

            // 1. Obtener la fecha de entrada de forma segura
            const fechaIngreso = ticket.fechaEntrada ? new Date(ticket.fechaEntrada) : new Date();
            // 2. Calcular tiempo transcurrido pasándole un objeto Date garantizado
            const tiempoParqueo = this.calcularTiempoTranscurrido(fechaIngreso);
            // 3. Generar la URL con el UUID único del tiquete
            const urlWebTiquete = `https://tu-dominio-parqueadero.com/tiquete/${ticket.codigoQr}`;

            // 4. Enviar detalle al cliente
            await this.whatsappService.enviarDetalleTiqueteConLink({
                telefono: telefonoCliente,
                placa: ticket.placa,
                tiempoParqueo,
                urlWebTiquete
            });
            return;
        }

        // 💳 SUB-OPCIONES DEL MENÚ DE PAGO (DaviPlata, WOMPI, Nequi)
        if (opcion.includes('daviplata')) {
            // Lógica o link de cobro DaviPlata
            return;
        }

        if (opcion.includes('wompi') || opcion.includes('tarjeta')) {
            // Lógica o link de pasarela WOMPI
            return;
        }

        if (opcion.includes('nequi')) {
            // Lógica o link de cobro Nequi
            return;
        }

        // OPCIÓN 0: VOLVER AL MENÚ PRINCIPAL
        if (opcion === '0' || opcion.includes('menu') || opcion.includes('menú')) {
            const ticket = await this.ticketRepository.buscarTicketActivoPorTelefono(telefonoCliente);

            if (ticket?.id === undefined) {
                console.log(`⚠️ No se encontró tiquete activo para: ${telefonoCliente}`);
                return;
            }

            const nombreParqueadero = await this.ticketRepository.obtenerNombreParqueadero(ticket.parqueaderoId);

            // Se reutiliza la lógica centralizada evitando código duplicado
            await this.whatsappService.enviarMenuPrincipal({
                telefono: telefonoCliente,
                placa: ticket.placa,
                fechaEntrada: ticket.fechaEntrada || new Date(),
                ticketId: ticket.id,
                nombreParqueadero: nombreParqueadero
            });

            console.log(`🔄 Menú principal re-enviado exitosamente a [${telefonoCliente}]`);
        }
    }

    // Helper robusto con manejo de tipos flexibles
    private calcularTiempoTranscurrido(fechaEntrada?: Date | string | number): string {
        if (!fechaEntrada) {
            return '0d:0h:0m:0s';
        }

        const entrada = new Date(fechaEntrada);
        const ahora = new Date();

        // Si la fecha resultó inválida, retorna valor por defecto
        if (Number.isNaN(entrada.getTime())) {
            return '0d:0h:0m:0s';
        }

        const diffMs = ahora.getTime() - entrada.getTime();
        const segundosTotales = Math.max(0, Math.floor(diffMs / 1000));

        const dias = Math.floor(segundosTotales / 86400);
        const horas = Math.floor((segundosTotales % 86400) / 3600);
        const minutos = Math.floor((segundosTotales % 3600) / 60);
        const segundos = segundosTotales % 60;

        return `${dias}d:${horas}h:${minutos}m:${segundos}s`;
    }
}