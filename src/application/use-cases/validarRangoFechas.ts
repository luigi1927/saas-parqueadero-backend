import type { IRangoFechas } from '../../domain/types/reporte.types.js';

export function validarRangoFechas(fechaInicio: string, fechaFin: string): IRangoFechas {
    const inicio = new Date(`${fechaInicio}T00:00:00`);
    const fin = new Date(`${fechaFin}T00:00:00`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || inicio > fin) {
        throw new TypeError('El rango de fechas no es válido.');
    }
    const dias = Math.floor((fin.getTime() - inicio.getTime()) / 86_400_000);
    if (dias > 366) throw new TypeError('El rango máximo permitido es de 366 días.');
    return { fechaInicio, fechaFin };
}