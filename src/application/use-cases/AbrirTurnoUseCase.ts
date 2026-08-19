import type { ITurnoRepository } from '../../domain/repositories/ITurnoRepository.js';
import type { IAbrirTurnoDTO } from '../../domain/types/turno.types.js';

export class AbrirTurnoUseCase {
    constructor(private turnoRepository: ITurnoRepository) { }

    async ejecutar(dto: IAbrirTurnoDTO) {
        if (dto.montoInicialEfectivo < 0) {
            throw new Error('El monto inicial en efectivo no puede ser negativo.');
        }

        const turnoExistente = await this.turnoRepository.buscarTurnoAbiertoPorUsuario(
            dto.parqueaderoId,
            dto.usuarioId
        );

        if (turnoExistente) {
            throw new Error(`Ya tienes un turno de caja abierto (ID Turno: ${turnoExistente.id}).`);
        }

        const turnoId = await this.turnoRepository.abrirTurno(dto);

        return {
            turnoId,
            parqueaderoId: dto.parqueaderoId,
            usuarioId: dto.usuarioId,
            montoInicialEfectivo: dto.montoInicialEfectivo,
            fechaApertura: new Date(),
            estado: 'ABIERTO'
        };
    }
}