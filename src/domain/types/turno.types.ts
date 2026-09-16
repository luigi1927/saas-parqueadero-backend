export interface ITurnoCaja {
    id: number;
    parqueaderoId: number;
    usuarioId: number;
    fechaApertura: Date;
    fechaCierre?: Date | undefined;
    montoInicialEfectivo: number;
    efectivoReportadoCierre?: number | undefined;
    efectivoCalculadoSistema: number;
    diferenciaCierre: number;
    totalEgresosCaja: number;
    observacionesCierre?: string | undefined;
    estado: 'ABIERTO' | 'CERRADO';
}

export interface IAbrirTurnoDTO {
    parqueaderoId: number;
    usuarioId: number;
    montoInicialEfectivo: number;
}

export interface ICerrarTurnoDTO {
    turnoId: number;
    parqueaderoId: number;
    usuarioId: number;
    efectivoReportadoCierre: number;
    observacionesCierre?: string | undefined;
}

export interface IResumenVentasTurno {
    totalEfectivoRecaudado: number;
    totalOtrosMetodos: number;
    totalTicketsCobrados: number;
}

export interface ITurnoHistorialAdmin {
    id: number;
    fechaApertura: string;
    fechaCierre?: string | undefined;
    abiertoPor?: string | undefined;
    montoInicialBase: number;
    totalEgresos: number;
    ventasEfectivo: number;
    efectivoEsperado: number;
    montoDeclarado?: number | undefined;
    diferencia?: number | undefined;
    estado: 'ABIERTO' | 'CERRADO';
}