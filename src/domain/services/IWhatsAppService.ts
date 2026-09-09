import type { TratamientoCliente } from '../types/clienteMensual.types.js';

export interface DTOBienvenidaBaileys {
    telefono: string;
    placa: string;
    horaIngreso: string;
    nombreParqueadero: string;
    imagenBannerUrl?: string;
    ticketId?: number | string;
}

export interface DTOEnvioQRBaileys {
    telefono: string;
    placa: string;
    ticketId: number;
    qrBuffer: Buffer;
}

export interface DTOConfirmacionSalida {
    telefono: string;
    placa: string;
    totalPagado: number;
    nombreParqueadero: string;
    minutosGracia?: number;
}

export interface DTONotificacionMensualidad {
    telefono: string;
    nombreCliente: string;
    tratamiento?: TratamientoCliente | undefined;
    placa: string;
    nombreParqueadero: string;
    fechaVencimiento: Date;
    tipo: 'POR_VENCER_3_DIAS' | 'POR_VENCER_2_DIAS' | 'POR_VENCER_1_DIA' | 'VENCIDA_DIA_1' | 'VENCIDA_DIA_2' | 'VENCIDA_DIA_3' | 'VENCIDA_DIA_4' | 'VENCIDA_DIA_5' | 'RENOVADA';
}

export interface DTORespuestaRenovacionMensualidad {
    telefono: string;
    nombreCliente: string;
    tratamiento?: TratamientoCliente | undefined;
    placa: string;
    fechaLimite?: Date | undefined;
}

export interface DTOReciboMensualidad {
    telefono: string;
    nombreCliente: string;
    tratamiento?: TratamientoCliente | undefined;
    placa: string;
    nombreParqueadero: string;
    monto: number;
    metodoPago: string;
    periodoInicio: Date;
    periodoFin: Date;
    pagoId: number;
}

export interface DTOBienvenidaMensualidad {
    telefono: string;
    nombreCliente: string;
    tratamiento?: TratamientoCliente | undefined;
    placa: string;
    nombreParqueadero: string;
    fechaPago: Date;
    monto: number;
    diaPagoMensual: number;
    fechaVencimiento: Date;
    codigoQr: string;
}

export interface DTOCodigoRecuperacion {
    telefono: string;
    nombre: string;
    codigo: string;
    minutosValidez: number;
}

export interface IWhatsAppService {
    /**
     * Inicia la conexión WebSocket con WhatsApp (Genera QR en consola si no hay sesión)
     */
    inicializar(): Promise<void>;
    estaConectado(): boolean;

    /**
     * Envía la imagen del banner con el menú textual explicativo
     */
    enviarMensajeIngreso(datos: DTOBienvenidaBaileys): Promise<boolean>;

    enviarMenuPrincipal(datos: {
        telefono: string;
        placa: string;
        fechaEntrada: Date | string;
        ticketId?: string | number;
        nombreParqueadero: string;
    }): Promise<boolean>;

    /**
     * Envía la imagen del código QR para la salida
     */
    enviarImagenQRTiquete(datos: DTOEnvioQRBaileys): Promise<boolean>;

    /**
     * Permite registrar un Callback para escuchar mensajes entrantes
     */
    alRecibirMensaje(callback: (telefono: string, texto: string) => Promise<void>): void;

    enviarConfirmacionSalida(datos: DTOConfirmacionSalida): Promise<boolean>;
    enviarNotificacionMensualidad(datos: DTONotificacionMensualidad): Promise<boolean>;
    enviarMenuRenovacionMensualidad(datos: DTORespuestaRenovacionMensualidad): Promise<boolean>;
    enviarConfirmacionRechazoRenovacion(telefono: string, placa: string): Promise<boolean>;
    enviarConfirmacionCancelacionRenovacion(telefono: string, placa: string): Promise<boolean>;
    enviarInstruccionPagoPresencial(datos: DTORespuestaRenovacionMensualidad): Promise<boolean>;
    enviarReciboMensualidad(datos: DTOReciboMensualidad): Promise<boolean>;
    enviarBienvenidaMensualidad(datos: DTOBienvenidaMensualidad): Promise<boolean>;
    enviarCodigoRecuperacion(datos: DTOCodigoRecuperacion): Promise<boolean>;
}