import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestWaWebVersion
} from '@whiskeysockets/baileys';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import pino from 'pino';
import QRCodeBase64 from 'qrcode';
import type { IWhatsAppService, DTOBienvenidaBaileys, DTOEnvioQRBaileys, DTONotificacionMensualidad, DTORespuestaRenovacionMensualidad, DTOReciboMensualidad, DTOBienvenidaMensualidad, DTOCodigoRecuperacion } from '../../domain/services/IWhatsAppService.js';

export class BaileysWhatsAppService implements IWhatsAppService {
    private static readonly TIEMPO_ENVIO_MS = 15000;
    private static readonly TIEMPO_RECONEXION_MS = 5000;
    private static readonly MAX_REINTENTOS_RECONEXION = 10;

    private sock: any;
    private conectado = false;
    private conectando = false;
    private reconexionTimer?: NodeJS.Timeout;
    private reintentosReconexion = 0;
    private oyenteMensajes?: (telefono: string, texto: string) => Promise<void>;
    private qrActual: string | null = null;

    //  Mapa de sesión: vincula el remoteJid (@lid o @s.whatsapp.net) con el teléfono real de MySQL
    private mapaLidATelefono = new Map<string, string>();

    //  Mapa auxiliar de números pendientes de emparejar cuando el cliente responda por primera vez
    private telefonosEnEspera = new Set<string>();

    async inicializar(): Promise<void> {
        if (this.conectando) {
            return;
        }
        this.conectando = true;
        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.obtenerDirectorioAuth());
            const { version } = await this.conTimeout(fetchLatestWaWebVersion({}), 10000)
                .catch(() => ({ version: undefined as never }));

        this.sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' })
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                this.qrActual = await QRCodeBase64.toDataURL(qr);
            }

            if (connection === 'close') {
                this.conectado = false;
                this.reintentosReconexion += 1;
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                const sesionInvalida = [
                    DisconnectReason.loggedOut,          // 401
                    DisconnectReason.connectionReplaced, // 440
                    DisconnectReason.badSession,         // 500
                ].includes(statusCode);

                if (sesionInvalida) {
                    this.reintentosReconexion = 0;
                    clearTimeout(this.reconexionTimer);
                    console.log('🧹 La sesión de WhatsApp es inválida/está desvinculada. Limpiando credenciales para generar un QR nuevo...');
                    await this.limpiarSesion();
                } else if (this.reintentosReconexion > BaileysWhatsAppService.MAX_REINTENTOS_RECONEXION) {
                    console.log('🚫 WhatsApp: se alcanzó el máximo de reintentos de reconexión. Se detiene el ciclo.');
                    this.cerrarSocket();
                } else {
                    console.log(`🔴 Conexión de WhatsApp cerrada. Reconectando (intento ${this.reintentosReconexion})...`);
                    this.cerrarSocket();
                    clearTimeout(this.reconexionTimer);
                    this.reconexionTimer = setTimeout(
                        () => void this.inicializar(),
                        BaileysWhatsAppService.TIEMPO_RECONEXION_MS
                    );
                }
            } else if (connection === 'open') {
                this.reintentosReconexion = 0;
                this.conectado = true;
                this.qrActual = null;
                console.log('🟢 WhatsApp conectado exitosamente mediante Baileys.');
            }
        });

        // Escuchador de mensajes
        this.sock.ev.on('messages.upsert', async (m: any) => {
            if (m.type !== 'notify') return;

            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message) {
                    const texto = msg.message.conversation ||
                        msg.message.extendedTextMessage?.text ||
                        '';

                    if (!texto.trim()) continue;

                    const remoteJid = msg.key.remoteJid || '';
                    let telefonoCliente = '';

                    // 1. Si el JID viene mapeado previamente en nuestro cache
                    if (this.mapaLidATelefono.has(remoteJid)) {
                        telefonoCliente = this.mapaLidATelefono.get(remoteJid)!;
                    }
                    // 2. Si es la primera vez que responde y viene de una ID estándar
                    else if (!remoteJid.endsWith('@lid')) {
                        telefonoCliente = remoteJid.split('@')[0].replace(/\D/g, '');
                        if (telefonoCliente.startsWith('57') && telefonoCliente.length === 12) {
                            telefonoCliente = telefonoCliente.substring(2);
                        }
                        this.mapaLidATelefono.set(remoteJid, telefonoCliente);
                    }
                    // 3. Si el JID es @lid y sólo hay 1 número en espera
                    else if (this.telefonosEnEspera.size === 1) {
                        const primerTelefono = Array.from(this.telefonosEnEspera)[0];
                        if (primerTelefono) {
                            telefonoCliente = primerTelefono;
                            this.mapaLidATelefono.set(remoteJid, telefonoCliente);
                            this.telefonosEnEspera.delete(telefonoCliente);
                        }

                    }
                    // 4. Fallback directo
                    else {
                        telefonoCliente = remoteJid.split('@')[0].replace(/\D/g, '');
                        if (telefonoCliente.startsWith('57') && telefonoCliente.length === 12) {
                            telefonoCliente = telefonoCliente.substring(2);
                        }
                    }

                    console.log(`📩 Mensaje recibido de [${telefonoCliente}] (JID: ${remoteJid}): "${texto}"`);

                    if (this.oyenteMensajes && telefonoCliente && texto) {
                        await this.oyenteMensajes(telefonoCliente, texto.trim());
                    }
                }
            }
        });
        } finally {
            this.conectando = false;
        }
    }

    alRecibirMensaje(callback: (telefono: string, texto: string) => Promise<void>): void {
        this.oyenteMensajes = callback;
    }

    estaConectado(): boolean {
        return this.conectado;
    }

    async enviarMensajeIngreso(datos: DTOBienvenidaBaileys): Promise<boolean> {
        const jid = this.formatearJid(datos.telefono);

        let telefonoLimpio = datos.telefono.replace(/\D/g, '');
        if (telefonoLimpio.startsWith('57') && telefonoLimpio.length === 12) {
            telefonoLimpio = telefonoLimpio.substring(2);
        }

        // Registramos este número en la lista de espera de emparejamiento
        this.telefonosEnEspera.add(telefonoLimpio);

        const mensajeTexto = `👋 ¡Hola *${datos.placa}*! Bienvenido a *${datos.nombreParqueadero}*.\n` +
            `Registramos tu ingreso al parqueadero a las *${datos.horaIngreso}*.\n\n` +
            `Elige una opción respondiendo con el número: 👇\n\n` +
            `1️⃣ *Pagar*\n` +
            `2️⃣ *Tiquete de parqueadero*\n` +
            `3️⃣ *Enviar mi código QR*`;

        let envio: any;
        if (datos.imagenBannerUrl) {
            envio = await this.conTimeout(this.sock.sendMessage(jid, {
                image: { url: datos.imagenBannerUrl },
                caption: mensajeTexto
            }), BaileysWhatsAppService.TIEMPO_ENVIO_MS);
        } else {
            envio = await this.conTimeout(this.sock.sendMessage(jid, { text: mensajeTexto }), BaileysWhatsAppService.TIEMPO_ENVIO_MS);
        }

        // Si Baileys nos devuelve la ID de la conversación, la asociamos de inmediato
        if (envio?.key?.remoteJid) {
            this.mapaLidATelefono.set(envio.key.remoteJid, telefonoLimpio);
        }

        return true;
    }

    async enviarImagenQRTiquete(datos: DTOEnvioQRBaileys): Promise<boolean> {
        const jid = this.formatearJid(datos.telefono);

        await this.conTimeout(this.sock.sendMessage(jid, {
            image: datos.qrBuffer,
            caption: `🎟️ *TIQUETE VIRTUAL - PLACA ${datos.placa}*\n\n` +
                `Muestra este código QR al operario al momento de tu salida para liquidar la tarifa.`
        }), BaileysWhatsAppService.TIEMPO_ENVIO_MS);

        return true;
    }

    // Enviar menú de medios de pago formateado
    async enviarMenuMediosPago(telefono: string): Promise<boolean> {
        const jid = this.formatearJid(telefono);

        const mensajeTexto = `Elige un medio seguro para el pago de esta visita al parqueadero. 👇\n\n` +
            `1️⃣ *DaviPlata*\n` +
            `2️⃣ *Tarjetas de crédito (WOMPI)*\n` +
            `3️⃣ *Nequi*\n` +
            `0️⃣ *Volver al menú principal*`;

        await this.conTimeout(this.sock.sendMessage(jid, { text: mensajeTexto }), BaileysWhatsAppService.TIEMPO_ENVIO_MS);
        return true;
    }

    // Enviar información del tiquete con link externo
    async enviarDetalleTiqueteConLink(datos: {
        telefono: string;
        placa: string;
        tiempoParqueo: string;
        urlWebTiquete: string;
    }): Promise<boolean> {
        const jid = this.formatearJid(datos.telefono);

        const mensajeText = `Tu tiempo de parqueo es de *${datos.tiempoParqueo}*\n\n` +
            `Para el vehículo de placa *${datos.placa}* ` +
            `Presenta el tiquete de pago que encuentras en este enlace: 👇\n\n` +
            `${datos.urlWebTiquete}`;

        await this.conTimeout(this.sock.sendMessage(jid, {
            text: mensajeText,
            linkPreview: {
                "canonical-url": datos.urlWebTiquete,
                "matched-url": datos.urlWebTiquete,
                title: "Ver tiquete",
                description: `Tiquete de entrada - Placa ${datos.placa}`,
                jpegThumbnail: null // Puedes adjuntar un Buffer en Base64 con el logo de SmartParking
            }
        }), BaileysWhatsAppService.TIEMPO_ENVIO_MS);

        return true;
    }

    private formatearJid(telefono: string): string {
        let limpio = telefono.replace(/\D/g, '');
        if (!limpio.startsWith('57') && limpio.length === 10) {
            limpio = `57${limpio}`;
        }
        return `${limpio}@s.whatsapp.net`;
    }

    // Método helper reutilizable para formatear y enviar el menú principal
    async enviarMenuPrincipal(datos: {
        telefono: string;
        placa: string;
        fechaEntrada: Date | string;
        ticketId: string | number;
        nombreParqueadero: string;
    }): Promise<boolean> {
        const fecha = new Date(datos.fechaEntrada);

        // Formato estandarizado de hora (ej: "03:15 PM")
        const horaFormateada = fecha.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        return await this.enviarMensajeIngreso({
            telefono: datos.telefono,
            placa: datos.placa,
            horaIngreso: horaFormateada,
            nombreParqueadero: datos.nombreParqueadero,
            ticketId: datos.ticketId
        });
    }

    async enviarConfirmacionSalida(datos: {
        telefono: string;
        placa: string;
        totalPagado: number;
        nombreParqueadero: string;
        minutosGracia?: number;
    }): Promise<boolean> {

        const jid = this.formatearJid(datos.telefono);
        const minutos = datos.minutosGracia ?? 10;

        // Formatear el total a pesos/moneda local (ej. $5.000)
        const valorFormateado = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(datos.totalPagado);

        const mensajeTexto = `Gracias *${datos.placa}*, hemos recibido tu pago por valor de *${valorFormateado}*.\n` +
            `Tienes *${minutos} minutos* para salir del parqueadero o empezará un nuevo cobro.\n` +
            `¡Gracias por visitar *${datos.nombreParqueadero}*! 🚗💨`;

        await this.conTimeout(this.sock.sendMessage(jid, { text: mensajeTexto }), BaileysWhatsAppService.TIEMPO_ENVIO_MS);
        return true;
    }

    async enviarNotificacionMensualidad(datos: DTONotificacionMensualidad): Promise<boolean> {
        const fecha = datos.fechaVencimiento.toLocaleDateString('es-CO');
        const mensaje = this.construirMensajeMensualidad(datos, fecha);
        await this.enviarTextoConMapeoTelefono(datos.telefono, mensaje);
        return true;
    }

    private construirMensajeMensualidad(datos: DTONotificacionMensualidad, fecha: string): string {
        const saludo = this.obtenerSaludoFormal();
        const encabezado = `${saludo}, ${this.formatearDestinatario(datos.nombreCliente, datos.tratamiento)}.`;
        if (datos.tipo === 'VENCIDA_DIA_4') {
            return `${encabezado}Su período de gracia terminó. Si no renueva su mensualidad para la placa *${datos.placa}*, los próximos ingresos se cobrarán como parqueo ocasional.`;
        }
        if (datos.tipo.startsWith('VENCIDA')) {
            return `${encabezado}\n\nLa mensualidad para el vehiculo con placa *${datos.placa}* venció el *${fecha}* en *${datos.nombreParqueadero}*. ¿Desea renovarla? Responda *SI* o *NO*.`;
        }
        if (datos.tipo === 'RENOVADA') {
            return `${encabezado}Su mensualidad para la placa *${datos.placa}* fue renovada. Gracias por preferir *${datos.nombreParqueadero}*.`;
        }
        return `${encabezado}Su mensualidad para la placa *${datos.placa}* vence el *${fecha}* en *${datos.nombreParqueadero}*.`;
    }

    private obtenerSaludoFormal(): string {
        const hora = Number(new Intl.DateTimeFormat('es-CO', {
            hour: '2-digit',
            hourCycle: 'h23',
            timeZone: 'America/Bogota'
        }).format(new Date()));

        if (hora >= 5 && hora < 12) return 'Buenos días';
        if (hora >= 12 && hora < 18) return 'Buenas tardes';
        return 'Buenas noches';
    }

    async enviarMenuRenovacionMensualidad(datos: { telefono: string; placa: string }): Promise<boolean> {
        const mensaje = `Elige el medio para renovar la mensualidad para la placa *${datos.placa}*:\n\n1. *Efectivo*\n0. *Cancelar*`;
        await this.enviarTextoConMapeoTelefono(datos.telefono, mensaje);
        return true;
    }

    async enviarConfirmacionRechazoRenovacion(telefono: string, placa: string): Promise<boolean> {
        await this.enviarTextoConMapeoTelefono(telefono, `No enviaremos más avisos de renovación para la placa *${placa}* en este ciclo.`);
        return true;
    }

    async enviarConfirmacionCancelacionRenovacion(telefono: string, placa: string): Promise<boolean> {
        await this.enviarTextoConMapeoTelefono(telefono, `La solicitud de renovación para la placa *${placa}* fue cancelada.`);
        return true;
    }

    async enviarInstruccionPagoPresencial(datos: DTORespuestaRenovacionMensualidad): Promise<boolean> {
        if (!datos.fechaLimite) {
            throw new Error('La fecha límite para el pago presencial es requerida.');
        }
        const fecha = datos.fechaLimite.toLocaleDateString('es-CO');
        const mensaje = `${this.formatearDestinatario(datos.nombreCliente, datos.tratamiento)}. Puede acercarse a pagar en efectivo la mensualidad para la placa *${datos.placa}* hasta el final del día hábil *${fecha}*. La renovación se aplicará cuando el cajero registre el pago.`;
        await this.enviarTextoConMapeoTelefono(datos.telefono, mensaje);
        return true;
    }

    async enviarReciboMensualidad(datos: DTOReciboMensualidad): Promise<boolean> {
        const valor = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(datos.monto);
        const inicio = datos.periodoInicio.toLocaleDateString('es-CO');
        const fin = datos.periodoFin.toLocaleDateString('es-CO');
        const destinatario = this.formatearDestinatario(datos.nombreCliente, datos.tratamiento);
        const mensaje = `Recibo de mensualidad No. *${datos.pagoId}*\n\n${destinatario}\nPlaca: *${datos.placa}*\nParqueadero: *${datos.nombreParqueadero}*\nValor pagado: *${valor}*\nMedio de pago: *${datos.metodoPago}*\nPeriodo: *${inicio}* al *${fin}*.`;
        await this.enviarTextoConMapeoTelefono(datos.telefono, mensaje);
        return true;
    }

    async enviarBienvenidaMensualidad(datos: DTOBienvenidaMensualidad): Promise<boolean> {
        const saludo = this.obtenerSaludoFormal();
        const fechaPago = datos.fechaPago.toLocaleDateString('es-CO');
        const fechaVencimiento = datos.fechaVencimiento.toLocaleDateString('es-CO');
        const monto = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(datos.monto);
        const destinatario = this.formatearDestinatario(datos.nombreCliente, datos.tratamiento);
        const mensaje = `${saludo}, ${destinatario}. ¡Bienvenido a *${datos.nombreParqueadero}*!\n\n` +
            `Registramos tu mensualidad para la placa *${datos.placa}*.\n` +
            `Fecha del pago: *${fechaPago}*\n` +
            `Valor pagado: *${monto}*\n` +
            `Día acordado de pago: *${datos.diaPagoMensual} de cada mes*\n` +
            `Vigencia hasta: *${fechaVencimiento}*\n\n` +
            `Gracias por preferir *${datos.nombreParqueadero}*.`;
        await this.enviarTextoConMapeoTelefono(datos.telefono, mensaje);

        if (datos.codigoQr?.trim()) {
            try {
                const urlQr = `https://tu-dominio-parqueadero.com/mensualidad/${datos.codigoQr}`;
                const qrBuffer = await QRCodeBase64.toBuffer(urlQr, { type: 'png', width: 300, margin: 2 });
                await this.conTimeout(this.sock.sendMessage(this.formatearJid(datos.telefono), {
                    image: qrBuffer,
                    caption: `🔖 *QR DE TU MENSUALIDAD - PLACA ${datos.placa}*\n\n` +
                        `Guarda este código: al escanearlo, el sistema te indica si el vehículo está *dentro* del parqueadero o si ya salió, junto con la vigencia de tu mensualidad.`
                }), BaileysWhatsAppService.TIEMPO_ENVIO_MS);
            } catch (error: unknown) {
                console.error('No fue posible enviar el QR de la mensualidad.', error);
            }
        }

        return true;
    }

    private formatearDestinatario(nombreCliente: string, tratamiento?: 'SR' | 'SRA' | 'NEUTRO'): string {
        if (tratamiento === 'SR') return `Sr. *${nombreCliente}*`;
        if (tratamiento === 'SRA') return `Sra. *${nombreCliente}*`;
        return `*${nombreCliente}*`;
    }

    private async enviarTextoConMapeoTelefono(telefono: string, mensaje: string): Promise<void> {
        const telefonoLimpio = this.normalizarTelefono(telefono);
        this.telefonosEnEspera.add(telefonoLimpio);
        const envio: any = await this.conTimeout(this.sock.sendMessage(this.formatearJid(telefono), { text: mensaje }), BaileysWhatsAppService.TIEMPO_ENVIO_MS);
        const remoteJid = envio?.key?.remoteJid;
        if (remoteJid) {
            this.mapaLidATelefono.set(remoteJid, telefonoLimpio);
        }
    }

    private normalizarTelefono(telefono: string): string {
        const telefonoLimpio = telefono.replace(/\D/g, '');
        return telefonoLimpio.startsWith('57') && telefonoLimpio.length === 12
            ? telefonoLimpio.substring(2)
            : telefonoLimpio;
    }

    /**
     * Ejecuta una promesa acotándola a un tiempo máximo para que una
     * operación de red colgada (p. ej. envío de WhatsApp) nunca bloquee
     * la aplicación ni agote recursos indefinidamente.
     */
    private async conTimeout<T>(promesa: Promise<T>, ms: number): Promise<T> {
        promesa.then(() => { }, () => { });
        let temporizador: NodeJS.Timeout | undefined;
        const temporizadorPromesa = new Promise<never>((_, rechazar) => {
            temporizador = setTimeout(() => {
                rechazar(new Error(`Tiempo de espera agotado (${ms} ms).`));
            }, ms);
        });
        try {
            return await Promise.race([promesa, temporizadorPromesa]);
        } finally {
            if (temporizador) clearTimeout(temporizador);
        }
    }

    /**
     * Directorio donde se guardan las credenciales de sesión de Baileys.
     * Se puede aislar por proceso/instancia con la variable WHATSAPP_AUTH_DIR
     * (evita que dos instancias compartan el mismo par de keys de WhatsApp).
     */
    private obtenerDirectorioAuth(): string {
        return process.env.WHATSAPP_AUTH_DIR?.trim() || 'baileys_auth';
    }

    private cerrarSocket(): void {
        if (this.sock) {
            this.sock.ev.removeAllListeners('connection.update');
            this.sock.ev.removeAllListeners('messages.upsert');
            try {
                this.sock.end(undefined);
            } catch {
                // el socket ya estaba cerrado
            }
            this.sock = null;
        }
    }

    async enviarCodigoRecuperacion(datos: DTOCodigoRecuperacion): Promise<boolean> {
        const mensaje = `${this.obtenerSaludoFormal()}, *${datos.nombre}*.\n\n` +
            `Usa el siguiente código para restablecer tu PIN de acceso al parqueadero:\n\n` +
            `*🔐 ${datos.codigo}*\n\n` +
            `El código es válido por *${datos.minutosValidez} minutos*. No lo compartas con nadie.`;
        await this.enviarTextoConMapeoTelefono(datos.telefono, mensaje);
        return true;
    }

    /**
     * Cierra la sesión actual, elimina las credenciales locales (baileys_auth)
     * y reinicia la conexión para generar un código QR nuevo de vinculación.
     */
    async desvincular(): Promise<void> {
        await this.limpiarSesion();
    }

    /**
     * Limpia la sesión local de WhatsApp y vuelve a inicializar la conexión.
     * Se usa tanto para la desvinculación manual (botón) como para la
     * auto-sanación cuando Baileys detecta credenciales rotas o desvinculadas.
     */
    private async limpiarSesion(): Promise<void> {
        if (this.sock) {
            this.sock.ev.removeAllListeners('connection.update');
            this.sock.end(undefined);
            this.sock = null;
        }
        await rm(join(process.cwd(), this.obtenerDirectorioAuth()), { recursive: true, force: true });
        this.conectado = false;
        this.qrActual = null;
        this.mapaLidATelefono.clear();
        this.telefonosEnEspera.clear();
        await this.inicializar();
    }

    obtenerQr(): string | null {
        return this.qrActual;
    }
}