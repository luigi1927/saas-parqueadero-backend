import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type { ITurnoRepository } from '../../domain/repositories/ITurnoRepository.js';
import type { IRegistrarPagoMensualidadDTO } from '../../domain/types/clienteMensual.types.js';

export class RegistrarPagoMensualidadUseCase {
    constructor(
        private clienteRepository: IClienteMensualRepository,
        private turnoRepository: ITurnoRepository
    ) { }

    async ejecutar(usuarioId: number, dto: IRegistrarPagoMensualidadDTO) {
        if (dto.monto <= 0) {
            throw new Error('El monto a pagar debe ser mayor a cero.');
        }

        // 1. Validar que el cliente exista
        const cliente = await this.clienteRepository.buscarPorId(dto.clienteMensualId, dto.parqueaderoId);
        if (!cliente) {
            throw new Error('El cliente mensual especificado no existe.');
        }

        // 2. Validar que el usuario tenga turno abierto
        const turno = await this.turnoRepository.buscarTurnoAbiertoPorUsuario(dto.parqueaderoId, usuarioId);
        if (!turno) {
            throw new Error('Debes tener un turno de caja abierto para registrar el cobro de mensualidad.');
        }

        // 3. Registrar el pago enlazado al turno actual
        return await this.clienteRepository.registrarPago({
            ...dto,
            turnoCajaId: turno.id
        });
    }
}