export interface ITarifa {
    id: number;
    parqueaderoId: number;
    nombre: string;
    precioBaseHora: number;
    minutosGracia: number;
    horaInicioNocturna: string; // Formato "HH:mm:ss"
    horaFinNocturna: string;    // Formato "HH:mm:ss"
    tipoRecargoNocturno: 'PORCENTAJE' | 'VALOR_FIJO' | 'TARIFA_PLANA_PERNOCTA';
    valorRecargoNocturno: number;
    precioMensualidad: number;
    activo: boolean;
    actualizadoEn?: Date;
}

export interface ICrearTarifaDTO {
    parqueaderoId: number;
    nombre?: string | undefined;
    precioBaseHora: number;
    minutosGracia?: number | undefined;
    horaInicioNocturna?: string | undefined;
    horaFinNocturna?: string | undefined;
    tipoRecargoNocturno?: 'PORCENTAJE' | 'VALOR_FIJO' | 'TARIFA_PLANA_PERNOCTA' | undefined;
    valorRecargoNocturno?: number | undefined;
    precioMensualidad: number;
}

export interface IActualizarTarifaDTO {
    nombre?: string;
    precioBaseHora?: number;
    minutosGracia?: number;
    horaInicioNocturna?: string;
    horaFinNocturna?: string;
    tipoRecargoNocturno?: 'PORCENTAJE' | 'VALOR_FIJO' | 'TARIFA_PLANA_PERNOCTA';
    valorRecargoNocturno?: number;
    precioMensualidad?: number;
    activo?: boolean;
}