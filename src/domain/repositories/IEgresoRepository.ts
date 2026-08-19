import type { IEgresoCaja, IRegistrarEgresoDTO } from '../types/egreso.types.js';

export interface IEgresoRepository {
    registrar(datos: IRegistrarEgresoDTO): Promise<IEgresoCaja>;
    listarPorTurno(turnoCajaId: number): Promise<IEgresoCaja[]>;
}