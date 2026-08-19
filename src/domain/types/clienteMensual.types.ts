export interface IClienteMensual {
    id: number;
    parqueaderoId: number;
    placa: string;
    nombreCliente: string;
    telefono?: string | undefined;
    documentoIdentidad?: string | undefined;
    fechaInicioContrato: Date;
    diaPagoMensual: number;
    activo: boolean;
    creadoEn?: Date | undefined;
}

export interface IPagoMensualidad {
    id: number;
    clienteMensualId: number;
    parqueaderoId: number;
    turnoCajaId: number;
    monto: number;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA';
    periodoPagadoInicio: Date;
    periodoPagadoFin: Date;
    fechaPago?: Date | undefined;
    observaciones?: string | undefined;
}

export interface ICrearClienteMensualDTO {
    parqueaderoId: number;
    placa: string;
    nombreCliente: string;
    telefono?: string | undefined;
    documentoIdentidad?: string | undefined;
    fechaInicioContrato?: string | undefined; // Formato "YYYY-MM-DD"
    diaPagoMensual?: number | undefined;
}

export interface IRegistrarPagoMensualidadDTO {
    clienteMensualId: number;
    parqueaderoId: number;
    turnoCajaId: number;
    monto: number;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA';
    periodoPagadoInicio: string; // Formato "YYYY-MM-DD"
    periodoPagadoFin: string;    // Formato "YYYY-MM-DD"
    observaciones?: string | undefined;
}