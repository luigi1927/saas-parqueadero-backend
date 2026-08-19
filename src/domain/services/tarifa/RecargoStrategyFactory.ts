import type { IRecargoStrategy } from '../../types/tarifa.types.js';
import { PorcentajeRecargoStrategy } from './strategies/PorcentajeRecargoStrategy.js';
import { FijoRecargoStrategy } from './strategies/FijoRecargoStrategy.js';

export class RecargoStrategyFactory {
    static obtenerEstrategia(tipo: 'PORCENTAJE' | 'VALOR_FIJO' | 'TARIFA_PLANA_PERNOCTA'): IRecargoStrategy {
        switch (tipo) {
            case 'PORCENTAJE':
                return new PorcentajeRecargoStrategy();
            case 'VALOR_FIJO':
            case 'TARIFA_PLANA_PERNOCTA':
                return new FijoRecargoStrategy();
            default:
                throw new Error(`Tipo de recargo nocturno no soportado: ${tipo}`);
        }
    }
}