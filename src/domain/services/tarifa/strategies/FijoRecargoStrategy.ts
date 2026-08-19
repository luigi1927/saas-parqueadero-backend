import type { IRecargoStrategy } from '../../../types/tarifa.types.js';

export class FijoRecargoStrategy implements IRecargoStrategy {
    calcular(_subtotalBase: number, valorConfigurado: number): number {
        return valorConfigurado;
    }
}