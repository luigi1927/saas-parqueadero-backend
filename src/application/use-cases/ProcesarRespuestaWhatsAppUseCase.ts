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
import { obtenerUrlPublicaWeb } from '../../infrastructure/config/env.config.js';
import { CalculadorTarifa } from '../../domain/services/CalculadorTarifa.js';
import type { IConfiguracionCobrosDigitalesRepository } from '../../domain/repositories/IConfiguracionCobrosDigitalesRepository.js';
import type { IPasarelaPagoService } from '../../domain/services/IPasarelaPagoService.js';
import type { MetodoPagoDigital } from '../../domain/types/clienteMensual.types.js';

export class ProcesarRespuestaWhatsAppUseCase {
    constructor(
        private readonly ticketRepository: ITicketRepository,
        private readonly whatsappService: BaileysWhatsAppService,
        private readonly configuracionCobrosRepository: IConfiguracionCobrosDigitalesRepository,
        private readonly pasarelaService: IPasarelaPagoService
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

            // El QR codifica la URL pública del visor, para que al escanearlo se abra el tiquete.
            const contenidoQr = `${obtenerUrlPublicaWeb()}/q/${ticket.codigoQr}`;
            const qrBuffer = await QRCode.toBuffer(contenidoQr, {
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
            const ticket = await this.ticketRepository.buscarTicketActivoPorTelefono(telefonoCliente);
            const metodos = ticket
                ? this.pasarelaService.metodosDisponibles(await this.configuracionCobrosRepository.obtener(ticket.parqueaderoId))
                : [];
            await this.whatsappService.enviarMenuMediosPago(telefonoCliente, metodos);
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
            // 3. Generar la URL pública del visor (ruta /q/:codigoQr en el frontend)
            const urlWebTiquete = `${obtenerUrlPublicaWeb()}/q/${ticket.codigoQr}`;

            // 4. Enviar detalle al cliente
            await this.whatsappService.enviarDetalleTiqueteConLink({
                telefono: telefonoCliente,
                placa: ticket.placa,
                tiempoParqueo,
                urlWebTiquete
            });
            return;
        }

        // 💳 Sub-opciones del menú de pago digital (Daviplata, Nequi, Breve/llave):
        // el cliente transfiere por referencia y el cajero confirma al registrar la salida.
        const metodoPago = this.detectarMetodoPagoDigital(opcion);
        if (metodoPago) {
            const ticketActivo = await this.ticketRepository.buscarTicketActivoPorTelefono(telefonoCliente);
            if (!ticketActivo?.id) {
                console.log(`⚠️ No se encontró tiquete activo para: ${telefonoCliente}`);
                return;
            }
            const ticket = await this.ticketRepository.buscarTicketPorId(ticketActivo.id, ticketActivo.parqueaderoId);
            if (!ticket) {
                console.log(`⚠️ No se encontró el tiquete activo para: ${telefonoCliente}`);
                return;
            }
            const configuracion = await this.configuracionCobrosRepository.obtener(ticket.parqueaderoId);
            if (!this.pasarelaService.metodosDisponibles(configuracion).includes(metodoPago)) {
                return;
            }
            const calculo = CalculadorTarifa.calcular(ticket.fechaEntrada, ticket.fechaSalida || new Date(), ticket.tarifa);
            const instruccion = this.pasarelaService.construirInstruccion({
                monto: calculo.totalAPagar,
                referencia: ticket.codigoQr,
                configuracion
            });
            await this.whatsappService.enviarInstruccionPagoDigital({
                telefono: telefonoCliente,
                nombreCliente: '',
                placa: ticket.placa,
                textoInstruccion: instruccion.texto
            });
            console.log(`💳 Instrucción de cobro digital enviada a [${telefonoCliente}] para ${ticket.placa}.`);
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

    private detectarMetodoPagoDigital(opcion: string): MetodoPagoDigital | undefined {
        if (opcion.includes('daviplata')) return 'DAVIPLATA';
        if (opcion.includes('nequi')) return 'NEQUI';
        if (opcion.includes('breve') || opcion.includes('llave')) return 'WOMPI_BRE_B';
        return undefined;
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