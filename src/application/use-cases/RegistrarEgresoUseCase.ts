import type { IEgresoRepository } from '../../domain/repositories/IEgresoRepository.js';
import type { ITurnoRepository } from '../../domain/repositories/ITurnoRepository.js';

export class RegistrarEgresoUseCase {
    constructor(
        private egresoRepository: IEgresoRepository,
        private turnoRepository: ITurnoRepository
    ) { }

    async ejecutar(dto: { parqueaderoId: number; usuarioId: number; monto: number; motivo: string }) {
        if (dto.monto <= 0) {
            throw new Error('El monto del egreso debe ser mayor a cero.');
        }
        if (!dto.motivo || dto.motivo.trim().length < 5) {
            throw new Error('Debe proporcionar un motivo válido y descriptivo.');
        }

        // 1. Validar que el usuario tiene un turno abierto
        const turnoActual = await this.turnoRepository.buscarTurnoAbiertoPorUsuario(
            dto.parqueaderoId,
            dto.usuarioId
        );

        if (!turnoActual) {
            throw new Error('No puedes registrar egresos sin tener un turno de caja abierto.');
        }

        // 2. Registrar el egreso (Esto dispara la transacción SQL)
        const egreso = await this.egresoRepository.registrar({
            turnoCajaId: turnoActual.id,
            usuarioId: dto.usuarioId,
            monto: dto.monto,
            motivo: dto.motivo.trim()
        });

        return egreso;
    }
}