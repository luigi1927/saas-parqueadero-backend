import type { ITarifaRepository } from '../../domain/repositories/ITarifaRepository.js';

export class ConsultarTarifaUseCase {
    constructor(private tarifaRepository: ITarifaRepository) { }

    async ejecutar(parqueaderoId: number) {
        const tarifa = await this.tarifaRepository.buscarActivaPorParqueadero(parqueaderoId);
        if (!tarifa) {
            throw new Error('No existe una tarifa activa configurada para este parqueadero.');
        }
        return tarifa;
    }
}