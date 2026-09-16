import type { IActualizarConfiguracionCobrosDTO, IConfiguracionCobrosDigitales } from '../types/configuracionCobros.types.js';

export interface IConfiguracionCobrosDigitalesRepository {
    obtener(parqueaderoId: number): Promise<IConfiguracionCobrosDigitales>;
    actualizar(parqueaderoId: number, datos: IActualizarConfiguracionCobrosDTO): Promise<IConfiguracionCobrosDigitales>;
}