import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type { ICrearClienteMensualDTO } from '../../domain/types/clienteMensual.types.js';

export class RegistrarClienteMensualUseCase {
    constructor(private clienteRepository: IClienteMensualRepository) { }

    async ejecutar(dto: ICrearClienteMensualDTO) {
        if (!dto.placa || !dto.nombreCliente) {
            throw new Error('La placa y el nombre del cliente son requeridos.');
        }

        const clienteExistente = await this.clienteRepository.buscarPorPlaca(dto.placa, dto.parqueaderoId);
        if (clienteExistente) {
            throw new Error(`Ya existe un cliente mensual activo asignado a la placa ${dto.placa.toUpperCase()}.`);
        }

        return await this.clienteRepository.crearCliente(dto);
    }
}