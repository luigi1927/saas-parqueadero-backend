export type GemaPlanSaas = 'BRONCE' | 'PLATA' | 'ORO' | 'DIAMANTE';

export interface IPlanSaas {
    id: number;
    nombre: string;
    gema: GemaPlanSaas;
    precioMensual: number;
    limiteMotos: number;
    soportaWhatsapp: boolean;
    soportaPagosDigitales: boolean;
    soportaVerReportes: boolean;
    soportaDescargarReportes: boolean;
    recordatoriosWhatsapp: boolean;
}

export interface ICrearPlanSaasDTO {
    nombre: string;
    precioMensual: number;
    limiteMotos: number;
    soportaWhatsapp: boolean;
    soportaPagosDigitales: boolean;
    soportaVerReportes: boolean;
    soportaDescargarReportes: boolean;
    recordatoriosWhatsapp: boolean;
}

export interface IActualizarPlanSaasDTO extends ICrearPlanSaasDTO { }