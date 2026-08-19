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