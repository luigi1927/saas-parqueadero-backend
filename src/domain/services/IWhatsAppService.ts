export interface DTOBienvenidaBaileys {
    telefono: string;
    placa: string;
    horaIngreso: string;
    nombreParqueadero: string;
    imagenBannerUrl?: string;
    ticketId: number;
}

export interface DTOEnvioQRBaileys {
    telefono: string;
    placa: string;
    ticketId: number;
    qrBuffer: Buffer;
}

export interface IWhatsAppService {
    /**
     * Inicia la conexión WebSocket con WhatsApp (Genera QR en consola si no hay sesión)
     */
    inicializar(): Promise<void>;

    /**
     * Envía la imagen del banner con el menú textual explicativo
     */
    enviarMensajeIngreso(datos: DTOBienvenidaBaileys): Promise<boolean>;

    /**
     * Envía la imagen del código QR para la salida
     */
    enviarImagenQRTiquete(datos: DTOEnvioQRBaileys): Promise<boolean>;

    /**
     * Permite registrar un Callback para escuchar mensajes entrantes
     */
    alRecibirMensaje(callback: (telefono: string, texto: string) => Promise<void>): void;
}