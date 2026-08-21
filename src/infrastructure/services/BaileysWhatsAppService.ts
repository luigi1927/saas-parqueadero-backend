import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestWaWebVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import type { IWhatsAppService, DTOBienvenidaBaileys, DTOEnvioQRBaileys } from '../../domain/services/IWhatsAppService.js';

export class BaileysWhatsAppService implements IWhatsAppService {
    private sock: any;
    private oyenteMensajes?: (telefono: string, texto: string) => Promise<void>;

    //  Mapa de sesión: vincula el remoteJid (@lid o @s.whatsapp.net) con el teléfono real de MySQL
    private mapaLidATelefono = new Map<string, string>();

    //  Mapa auxiliar de números pendientes de emparejar cuando el cliente responda por primera vez
    private telefonosEnEspera = new Set<string>();

    async inicializar(): Promise<void> {
        const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');
        const { version } = await fetchLatestWaWebVersion({});

        this.sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'silent' })
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('connection.update', (update: any) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('\n📲 ESCANEA ESTE CÓDIGO QR CON WHATSAPP:\n');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log('🔴 Conexión de WhatsApp cerrada. Reconectando...', shouldReconnect);
                if (shouldReconnect) this.inicializar();
            } else if (connection === 'open') {
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
    }

    alRecibirMensaje(callback: (telefono: string, texto: string) => Promise<void>): void {
        this.oyenteMensajes = callback;
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
            `1️⃣ *Ver Tiquete QR*\n` +
            `2️⃣ *Pagar*\n` +
            `3️⃣ *Menú principal*`;

        let envio: any;
        if (datos.imagenBannerUrl) {
            envio = await this.sock.sendMessage(jid, {
                image: { url: datos.imagenBannerUrl },
                caption: mensajeTexto
            });
        } else {
            envio = await this.sock.sendMessage(jid, { text: mensajeTexto });
        }

        // Si Baileys nos devuelve la ID de la conversación, la asociamos de inmediato
        if (envio?.key?.remoteJid) {
            this.mapaLidATelefono.set(envio.key.remoteJid, telefonoLimpio);
        }

        return true;
    }

    async enviarImagenQRTiquete(datos: DTOEnvioQRBaileys): Promise<boolean> {
        const jid = this.formatearJid(datos.telefono);

        await this.sock.sendMessage(jid, {
            image: datos.qrBuffer,
            caption: `🎟️ *TIQUETE VIRTUAL - PLACA ${datos.placa}*\n\n` +
                `Muestra este código QR al operario al momento de tu salida para liquidar la tarifa.`
        });

        return true;
    }

    private formatearJid(telefono: string): string {
        let limpio = telefono.replace(/\D/g, '');
        if (!limpio.startsWith('57') && limpio.length === 10) {
            limpio = `57${limpio}`;
        }
        return `${limpio}@s.whatsapp.net`;
    }
}