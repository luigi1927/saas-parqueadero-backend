import type { ITarifaRepository } from '../../domain/repositories/ITarifaRepository.js';
import type { ICrearTarifaDTO, IActualizarTarifaDTO } from '../../domain/types/tarifa.types.js';

export class GestionarTarifaUseCase {
    constructor(private tarifaRepository: ITarifaRepository) { }

    async crear(dto: ICrearTarifaDTO) {
        if (dto.precioBaseHora < 0 || dto.precioMensualidad < 0) {
            throw new Error('Los precios no pueden ser valores negativos.');
        }
        return await this.tarifaRepository.crear(dto);
    }

    async actualizar(id: number, parqueaderoId: number, dto: IActualizarTarifaDTO) {
        if (dto.precioBaseHora !== undefined && dto.precioBaseHora < 0) {
            throw new Error('El precio base por hora no puede ser negativo.');
        }
        if (dto.precioMensualidad !== undefined && dto.precioMensualidad < 0) {
            throw new Error('El precio de la mensualidad no puede ser negativo.');
        }

        const existe = await this.tarifaRepository.buscarPorId(id, parqueaderoId);
        if (!existe) {
            throw new Error('La tarifa especificada no existe.');
        }

        return await this.tarifaRepository.actualizar(id, parqueaderoId, dto);
    }
}