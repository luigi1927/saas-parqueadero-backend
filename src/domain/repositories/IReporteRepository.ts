import type {
    IActividadOperario,
    IReporteActividadOperarios,
    IReporteAnulaciones,
    IReporteCuadreCaja,
    IReporteDesercion,
    IReporteEgresos,
    IReporteMora,
    IReporteOcupacion,
    IReporteRecaudo,
    IReporteRecaudoDTO,
    IReporteRecaudoMensualidades,
    IReporteRentabilidad,
    IReporteSuscripciones,
    IReporteUsoPlataforma,
    IRangoFechas,
} from '../types/reporte.types.js';

export interface IReporteRepository {
    obtenerRecaudo(parqueaderoId: number, rango: IReporteRecaudoDTO): Promise<IReporteRecaudo>;
    obtenerCuadreCaja(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteCuadreCaja>;
    obtenerEgresos(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteEgresos>;
    obtenerOcupacion(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteOcupacion>;
    obtenerMora(parqueaderoId: number): Promise<IReporteMora>;
    obtenerRecaudoMensualidades(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteRecaudoMensualidades>;
    obtenerDesercion(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteDesercion>;
    obtenerAnulaciones(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteAnulaciones>;
    obtenerActividadOperarios(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteActividadOperarios>;
    obtenerRentabilidad(rango: IRangoFechas): Promise<IReporteRentabilidad>;
    obtenerSuscripciones(rango: IRangoFechas): Promise<IReporteSuscripciones>;
    obtenerUsoPlataforma(rango: IRangoFechas): Promise<IReporteUsoPlataforma>;
}

export type { IActividadOperario };