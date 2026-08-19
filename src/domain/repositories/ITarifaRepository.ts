import type { ITarifa, ICrearTarifaDTO, IActualizarTarifaDTO } from '../types/tarifa.types.js';

export interface ITarifaRepository {
    buscarActivaPorParqueadero(parqueaderoId: number): Promise<ITarifa | null>;
    buscarPorId(id: number, parqueaderoId: number): Promise<ITarifa | null>;
    crear(datos: ICrearTarifaDTO): Promise<ITarifa>;
    actualizar(id: number, parqueaderoId: number, datos: IActualizarTarifaDTO): Promise<ITarifa>;
}