import type { IRecargoStrategy } from '../../../types/tarifa.types.js';

export class PorcentajeRecargoStrategy implements IRecargoStrategy {
    calcular(subtotalBase: number, valorConfigurado: number): number {
        return (subtotalBase * valorConfigurado) / 100;
    }
}