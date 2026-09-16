import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type { IConfiguracionCobrosDigitalesRepository } from '../../domain/repositories/IConfiguracionCobrosDigitalesRepository.js';
import type { ITarifaRepository } from '../../domain/repositories/ITarifaRepository.js';
import type { IPasarelaPagoService } from '../../domain/services/IPasarelaPagoService.js';
import type { ICobroDigitalGenerado, MetodoPagoDigital } from '../../domain/types/clienteMensual.types.js';
import { generarReferenciaCobro } from '../../domain/services/GenerarReferenciaCobro.js';

export class CrearCobroDigitalMensualidadUseCase {
    constructor(
        private readonly clienteRepository: IClienteMensualRepository,
        private readonly configuracionRepository: IConfiguracionCobrosDigitalesRepository,
        private readonly tarifaRepository: ITarifaRepository,
        private readonly pasarelaService: IPasarelaPagoService
    ) { }

    async ejecutar(parqueaderoId: number, clienteMensualId: number, metodoPago: MetodoPagoDigital): Promise<ICobroDigitalGenerado> {
        const cliente = await this.clienteRepository.buscarPorId(clienteMensualId, parqueaderoId);
        if (!cliente) {
            throw new Error('La mensualidad especificada no existe.');
        }
        if (!cliente.activo) {
            throw new Error('La mensualidad no está activa.');
        }

        const configuracion = await this.configuracionRepository.obtener(parqueaderoId);
        const metodos = this.pasarelaService.metodosDisponibles(configuracion);
        if (metodos.length === 0) {
            throw new Error('El parqueadero no tiene métodos de cobro digital configurados.');
        }
        if (!metodos.includes(metodoPago)) {
            throw new Error(`El método de pago seleccionado no está configurado para este parqueadero.`);
        }

        const tarifa = await this.tarifaRepository.buscarActivaPorParqueadero(parqueaderoId);
        if (!tarifa) {
            throw new Error('No existe una tarifa mensual activa para este parqueadero.');
        }
        const monto = Number(tarifa.precioMensualidad);

        const fechaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const referenciaExterna = generarReferenciaCobro(clienteMensualId);
        const intencion = await this.clienteRepository.crearIntencionDigital(
            parqueaderoId, clienteMensualId, monto, metodoPago, referenciaExterna, cliente.fechaVencimiento, fechaExpiracion
        );
        const instruccion = this.pasarelaService.construirInstruccion({
            monto,
            referencia: referenciaExterna,
            configuracion,
            fechaExpiracion
        });

        return {
            intencionId: intencion.id,
            clienteMensualId,
            parqueaderoId,
            metodoPago,
            monto,
            referenciaExterna,
            instruccion
        };
    }
}