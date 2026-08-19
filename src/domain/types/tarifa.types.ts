export interface IResultadoCalculoTarifa {
    minutosTotales: number;
    horasACobrar: number;
    subtotalBase: number;
    aplicoNocturno: boolean;
    recargoNocturnoAplicado: number;
    totalAPagar: number;
    esTiempoGracia: boolean;
}

export interface ITarifaConfig {
    precioBaseHora: number;
    minutosGracia: number;
    horaInicioNocturna: string;
    horaFinNocturna: string;
    tipoRecargoNocturno: 'PORCENTAJE' | 'VALOR_FIJO' | 'TARIFA_PLANA_PERNOCTA';
    valorRecargoNocturno: number;
}

export interface IResultadoTiempo {
    minutosTotales: number;
    horasACobrar: number;
    esTiempoGracia: boolean;
}

// Contrato para las Estrategias de Recargo Nocturno
export interface IRecargoStrategy {
    calcular(subtotalBase: number, valorConfigurado: number): number;
}