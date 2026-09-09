import type { IReporteRepository } from '../../domain/repositories/IReporteRepository.js';
import type { IRangoFechas } from '../../domain/types/reporte.types.js';
import { validarRangoFechas } from './validarRangoFechas.js';

/**
 * Consulta de reportes globales del SaaS (Super Admin).
 * Cada método valida el rango de fechas y delega la consulta al repositorio.
 */
export class ConsultarReportesSaasUseCase {
    constructor(private readonly reporteRepository: IReporteRepository) { }

    rentabilidad(fechaInicio: string, fechaFin: string) {
        return this.reporteRepository.obtenerRentabilidad(this.rango(fechaInicio, fechaFin));
    }

    suscripciones(fechaInicio: string, fechaFin: string) {
        return this.reporteRepository.obtenerSuscripciones(this.rango(fechaInicio, fechaFin));
    }

    usoPlataforma(fechaInicio: string, fechaFin: string) {
        return this.reporteRepository.obtenerUsoPlataforma(this.rango(fechaInicio, fechaFin));
    }

    private rango(fechaInicio: string, fechaFin: string): IRangoFechas {
        return validarRangoFechas(fechaInicio, fechaFin);
    }
}