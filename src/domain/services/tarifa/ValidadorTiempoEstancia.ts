import type { IResultadoTiempo } from '../../types/tarifa.types.js';

export class ValidadorTiempoEstancia {
    static evaluar(fechaEntrada: Date | string, fechaSalida: Date | string, minutosGracia: number): IResultadoTiempo {
        const entrada = new Date(fechaEntrada);
        const salida = new Date(fechaSalida);

        const diffMs = salida.getTime() - entrada.getTime();
        const minutosTotales = Math.max(0, Math.ceil(diffMs / (1000 * 60)));

        if (minutosTotales <= minutosGracia) {
            return {
                minutosTotales,
                horasACobrar: 0,
                esTiempoGracia: true
            };
        }

        const horasACobrar = Math.ceil(minutosTotales / 60);
        return {
            minutosTotales,
            horasACobrar,
            esTiempoGracia: false
        };
    }
}