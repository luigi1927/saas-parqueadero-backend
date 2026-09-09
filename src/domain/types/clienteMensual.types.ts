export interface IClienteMensual {
    id: number;
    parqueaderoId: number;
    placa: string;
    codigoQr?: string | undefined;
    nombreCliente: string;
    tratamiento?: TratamientoCliente | undefined;
    telefono?: string | undefined;
    documentoIdentidad?: string | undefined;
    fechaInicioContrato: Date;
    fechaVencimiento: Date;
    diaPagoMensual: number;
    activo: boolean;
    estado: 'AL_DIA' | 'POR_VENCER' | 'VENCIDO' | 'CANCELADA';
    creadoEn?: Date | undefined;
}

export interface IClienteMensualDetalle extends IClienteMensual {
    nombreParqueadero: string;
    usuarioRegistro?: {
        id: number;
        nombre: string;
        documentoId: string;
    } | undefined;
    pagos: IPagoMensualidad[];
}

export type TratamientoCliente = 'SR' | 'SRA' | 'NEUTRO';
export type MetodoPagoMensualidad = 'EFECTIVO' | 'WOMPI_PSE' | 'WOMPI_TARJETA' | 'WOMPI_BRE_B' | 'NEQUI' | 'DAVIPLATA' | 'OTRO';
export type CanalRenovacion = 'FISICO' | 'WHATSAPP';
export type EstadoIntencionPagoMensualidad = 'PENDIENTE_SELECCION' | 'PENDIENTE_PAGO_DIGITAL' | 'PENDIENTE_PAGO_PRESENCIAL' | 'PENDIENTE_VERIFICACION' | 'PAGADA' | 'RECHAZADA' | 'CANCELADA' | 'EXPIRADA';
export type TipoNotificacionMensualidad = 'POR_VENCER_3_DIAS' | 'POR_VENCER_2_DIAS' | 'POR_VENCER_1_DIA' | 'VENCIDA_DIA_1' | 'VENCIDA_DIA_2' | 'VENCIDA_DIA_3' | 'VENCIDA_DIA_4' | 'VENCIDA_DIA_5' | 'RENOVADA';

export interface IClienteMensualQr {
    id: number;
    parqueaderoId: number;
    placa: string;
    nombreCliente: string;
    tratamiento?: TratamientoCliente | undefined;
    fechaVencimiento: Date;
    estado: 'AL_DIA' | 'POR_VENCER' | 'VENCIDO' | 'CANCELADA';
    nombreParqueadero: string;
}

export interface IConsultaEstadoMensualidadQr {
    placa: string;
    nombreCliente: string;
    tratamiento?: TratamientoCliente | undefined;
    parqueaderoId: number;
    nombreParqueadero: string;
    fechaVencimiento: Date;
    estadoMensualidad: 'AL_DIA' | 'POR_VENCER' | 'VENCIDO' | 'CANCELADA';
    mensualidadVigente: boolean;
    vehiculo: {
        estado: 'DENTRO' | 'FUERA';
        ticketActivo?: {
            ticketId: number;
            fechaEntrada: Date;
            tipoVehiculo: 'OCASIONAL' | 'MENSUAL';
        } | undefined;
    };
}

export interface IIntencionPagoMensualidad {
    id: number;
    clienteMensualId: number;
    parqueaderoId: number;
    canal: CanalRenovacion;
    metodoPago?: MetodoPagoMensualidad | undefined;
    estado: EstadoIntencionPagoMensualidad;
    monto: number;
    fechaExpiracion?: Date | undefined;
    referenciaExterna?: string | undefined;
}

export interface IPagoMensualidad {
    id: number;
    clienteMensualId: number;
    parqueaderoId: number;
    turnoCajaId?: number | undefined;
    monto: number;
    metodoPago: MetodoPagoMensualidad;
    periodoPagadoInicio: Date;
    periodoPagadoFin: Date;
    fechaPago?: Date | undefined;
    observaciones?: string | undefined;
}

export interface ICrearClienteMensualDTO {
    parqueaderoId: number;
    placa: string;
    nombreCliente: string;
    tratamiento: TratamientoCliente;
    telefono?: string | undefined;
    documentoIdentidad?: string | undefined;
    fechaInicioContrato?: string | undefined; // Formato "YYYY-MM-DD"
    diaPagoMensual?: number | undefined;
    metodoPagoInicial: MetodoPagoMensualidad;
}

export interface IRegistrarPagoMensualidadDTO {
    clienteMensualId: number;
    parqueaderoId: number;
    turnoCajaId?: number | undefined;
    monto: number;
    metodoPago: MetodoPagoMensualidad;
    canal: CanalRenovacion;
    referenciaExterna?: string | undefined;
    idempotencyKey: string;
    periodoPagadoInicio?: Date | undefined;
    periodoPagadoFin?: Date | undefined;
    cicloRenovado?: Date | undefined;
    observaciones?: string | undefined;
}

export interface IRenovarMensualidadDTO {
    clienteMensualId: number;
    parqueaderoId: number;
    monto: number;
    metodoPago: MetodoPagoMensualidad;
    canal: CanalRenovacion;
    referenciaExterna?: string | undefined;
}

export interface INotificacionMensualidadPendiente {
    id: number;
    clienteMensualId: number;
    parqueaderoId: number;
    nombreCliente: string;
    tratamiento?: TratamientoCliente | undefined;
    telefono: string;
    placa: string;
    nombreParqueadero: string;
    fechaVencimiento: Date;
    tipo: TipoNotificacionMensualidad;
}

export interface IActualizarClienteMensualDTO {
    nombreCliente: string;
    tratamiento: TratamientoCliente;
    telefono: string;
    documentoIdentidad?: string | undefined;
    diaPagoMensual: number;
}

export interface IListarMensualidadesDTO {
    pagina: number;
    limite: number;
    busqueda?: string | undefined;
    estado?: 'AL_DIA' | 'POR_VENCER' | 'VENCIDO' | 'CANCELADA' | undefined;
}

export interface IPaginaMensualidades {
    items: IClienteMensual[];
    total: number;
    pagina: number;
    limite: number;
}

export interface IResumenMensualidades {
    alDia: number;
    porVencer: number;
    vencidas: number;
    canceladas: number;
    pagosPresencialesPendientes: number;
    notificacionesFallidas: number;
}

export interface IReciboMensualidad {
    pagoId: number;
    fechaPago: Date;
    monto: number;
    metodoPago: MetodoPagoMensualidad;
    canal: CanalRenovacion;
    periodoInicio: Date;
    periodoFin: Date;
    placa: string;
    nombreCliente: string;
    tratamiento?: TratamientoCliente | undefined;
    telefono: string;
    nombreParqueadero: string;
    turnoCajaId?: number | undefined;
}

export interface IListarTrazabilidadMensualidadDTO {
    pagina: number;
    limite: number;
    clienteMensualId?: number | undefined;
    estado?: string | undefined;
}

export interface IIntencionMensualidadAdministrativa {
    id: number;
    clienteMensualId: number;
    placa: string;
    monto: number;
    canal: CanalRenovacion;
    metodoPago?: MetodoPagoMensualidad | undefined;
    estado: EstadoIntencionPagoMensualidad;
    fechaExpiracion?: Date | undefined;
    pagoMensualidadId?: number | undefined;
    creadoEn: Date;
}

export interface INotificacionMensualidadAdministrativa {
    id: number;
    clienteMensualId: number;
    placa: string;
    tipo: TipoNotificacionMensualidad;
    estadoEnvio: 'PENDIENTE' | 'PROCESANDO' | 'ENVIADO' | 'FALLIDO';
    intentos: number;
    ultimoError?: string | undefined;
    enviadoEn?: Date | undefined;
    creadoEn: Date;
}

export interface IPaginaTrazabilidad<T> {
    items: T[];
    total: number;
    pagina: number;
    limite: number;
}