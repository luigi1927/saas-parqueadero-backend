import type { IResultadoCalculoTarifa, ITarifaConfig } from '../types/tarifa.types.js';
import { ValidadorTiempoEstancia } from './tarifa/ValidadorTiempoEstancia.js';
import { ValidadorNocturno } from './tarifa/ValidadorNocturno.js';
import { RecargoStrategyFactory } from './tarifa/RecargoStrategyFactory.js';

export class CalculadorTarifa {
    static calcular(fechaEntrada: Date, fechaSalida: Date, tarifa: ITarifaConfig): IResultadoCalculoTarifa {
        // 1. Evaluar tiempo y gracia (SRP)
        const tiempo = ValidadorTiempoEstancia.evaluar(fechaEntrada, fechaSalida, tarifa.minutosGracia);

        if (tiempo.esTiempoGracia) {
            return {
                minutosTotales: tiempo.minutosTotales,
                horasACobrar: 0,
                subtotalBase: 0,
                aplicoNocturno: false,
                recargoNocturnoAplicado: 0,
                totalAPagar: 0,
                esTiempoGracia: true
            };
        }

        const subtotalBase = tiempo.horasACobrar * tarifa.precioBaseHora;

        // 2. Evaluar recargo nocturno (SRP)
        const aplicoNocturno = ValidadorNocturno.aplica(
            fechaEntrada,
            fechaSalida,
            tarifa.horaInicioNocturna,
            tarifa.horaFinNocturna,
            tiempo.minutosTotales
        );

        let recargoNocturnoAplicado = 0;
        if (aplicoNocturno) {
            const estrategia = RecargoStrategyFactory.obtenerEstrategia(tarifa.tipoRecargoNocturno);
            recargoNocturnoAplicado = estrategia.calcular(subtotalBase, tarifa.valorRecargoNocturno);
        }

        const totalAPagar = subtotalBase + recargoNocturnoAplicado;

        return {
            minutosTotales: tiempo.minutosTotales,
            horasACobrar: tiempo.horasACobrar,
            subtotalBase,
            aplicoNocturno,
            recargoNocturnoAplicado,
            totalAPagar,
            esTiempoGracia: false
        };
    }
}