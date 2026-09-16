import type { IConfiguracionCobrosDigitalesRepository } from '../../domain/repositories/IConfiguracionCobrosDigitalesRepository.js';
import type { IActualizarConfiguracionCobrosDTO, IConfiguracionCobrosDigitales } from '../../domain/types/configuracionCobros.types.js';

export class GestionarConfiguracionCobrosUseCase {
    constructor(private readonly configuracionRepository: IConfiguracionCobrosDigitalesRepository) { }

    async obtener(parqueaderoId: number): Promise<IConfiguracionCobrosDigitales> {
        return this.configuracionRepository.obtener(parqueaderoId);
    }

    async actualizar(parqueaderoId: number, datos: IActualizarConfiguracionCobrosDTO): Promise<IConfiguracionCobrosDigitales> {
        this.validar(datos);
        return this.configuracionRepository.actualizar(parqueaderoId, datos);
    }

    private validar(datos: IActualizarConfiguracionCobrosDTO): void {
        if (datos.activo !== undefined && typeof datos.activo !== 'boolean') {
            throw new TypeError('El campo activo debe ser un booleano.');
        }
        if (datos.mensajePie !== undefined && String(datos.mensajePie).trim().length > 255) {
            throw new TypeError('El mensaje final no puede superar 255 caracteres.');
        }
    }
}