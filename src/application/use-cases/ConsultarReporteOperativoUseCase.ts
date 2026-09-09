import type { IReporteRepository } from '../../domain/repositories/IReporteRepository.js';
import type { IRangoFechas, IMoraFiltros } from '../../domain/types/reporte.types.js';
import { validarRangoFechas } from './validarRangoFechas.js';

/**
 * Consulta de reportes operativos de un parqueadero.
 * Cada método valida el rango de fechas y delega la consulta al repositorio.
 */
export class ConsultarReporteOperativoUseCase {
    constructor(private readonly reporteRepository: IReporteRepository) { }

    cuadreCaja(parqueaderoId: number, fechaInicio: string, fechaFin: string) {
        return this.reporteRepository.obtenerCuadreCaja(parqueaderoId, this.rango(fechaInicio, fechaFin));
    }

    egresos(parqueaderoId: number, fechaInicio: string, fechaFin: string) {
        return this.reporteRepository.obtenerEgresos(parqueaderoId, this.rango(fechaInicio, fechaFin));
    }

    ocupacion(parqueaderoId: number, fechaInicio: string, fechaFin: string) {
        return this.reporteRepository.obtenerOcupacion(parqueaderoId, this.rango(fechaInicio, fechaFin));
    }

    mora(parqueaderoId: number, filtros: IMoraFiltros) {
        return this.reporteRepository.obtenerMora(parqueaderoId, filtros);
    }

    recaudoMensualidades(parqueaderoId: number, fechaInicio: string, fechaFin: string) {
        return this.reporteRepository.obtenerRecaudoMensualidades(parqueaderoId, this.rango(fechaInicio, fechaFin));
    }

    desercion(parqueaderoId: number, fechaInicio: string, fechaFin: string) {
        return this.reporteRepository.obtenerDesercion(parqueaderoId, this.rango(fechaInicio, fechaFin));
    }

    anulaciones(parqueaderoId: number, fechaInicio: string, fechaFin: string) {
        return this.reporteRepository.obtenerAnulaciones(parqueaderoId, this.rango(fechaInicio, fechaFin));
    }

    actividadOperarios(parqueaderoId: number, fechaInicio: string, fechaFin: string) {
        return this.reporteRepository.obtenerActividadOperarios(parqueaderoId, this.rango(fechaInicio, fechaFin));
    }

    private rango(fechaInicio: string, fechaFin: string): IRangoFechas {
        return validarRangoFechas(fechaInicio, fechaFin);
    }
}