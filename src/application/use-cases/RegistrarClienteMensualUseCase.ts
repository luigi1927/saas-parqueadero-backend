import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type { ITurnoRepository } from '../../domain/repositories/ITurnoRepository.js';
import type { ITarifaRepository } from '../../domain/repositories/ITarifaRepository.js';
import type { ICrearClienteMensualDTO } from '../../domain/types/clienteMensual.types.js';
import type { IWhatsAppService } from '../../domain/services/IWhatsAppService.js';
import { calcularPrimerPeriodoMensualidad } from '../../domain/services/CalcularPeriodoMensualidad.js';

export class RegistrarClienteMensualUseCase {
    constructor(
        private readonly clienteRepository: IClienteMensualRepository,
        private readonly turnoRepository: ITurnoRepository,
        private readonly tarifaRepository: ITarifaRepository,
        private readonly whatsappService: IWhatsAppService
    ) { }

    async ejecutar(usuarioId: number, dto: ICrearClienteMensualDTO) {
        if (!dto.placa?.trim() || !dto.nombreCliente?.trim() || !dto.telefono?.trim()) {
            throw new Error('La placa, el nombre y el teléfono de WhatsApp son requeridos.');
        }
        if (!['SR', 'SRA', 'NEUTRO'].includes(dto.tratamiento)) {
            throw new TypeError('El tratamiento debe ser SR, SRA o NEUTRO.');
        }
        const metodosPagoValidos = ['EFECTIVO', 'WOMPI_PSE', 'WOMPI_TARJETA', 'NEQUI', 'DAVIPLATA', 'OTRO'];
        if (!metodosPagoValidos.includes(dto.metodoPagoInicial)) {
            throw new TypeError('El método de pago inicial no es válido.');
        }

        const clienteExistente = await this.clienteRepository.buscarPorPlaca(dto.placa, dto.parqueaderoId);
        if (clienteExistente) {
            throw new Error(`Ya existe un cliente mensual activo asignado a la placa ${dto.placa.toUpperCase()}.`);
        }

        const turno = await this.turnoRepository.buscarTurnoAbiertoPorUsuario(dto.parqueaderoId, usuarioId);
        if (!turno) {
            throw new Error('Debes tener un turno de caja abierto para registrar una mensualidad.');
        }
        const tarifa = await this.tarifaRepository.buscarActivaPorParqueadero(dto.parqueaderoId);
        if (!tarifa) {
            throw new Error('No existe una tarifa mensual activa para este parqueadero.');
        }

        const fechaInicio = dto.fechaInicioContrato ? new Date(`${dto.fechaInicioContrato}T00:00:00`) : new Date();
        if (Number.isNaN(fechaInicio.getTime())) {
            throw new TypeError('La fecha de inicio de contrato no es válida.');
        }
        const diaPago = dto.diaPagoMensual ?? fechaInicio.getDate();
        const periodo = calcularPrimerPeriodoMensualidad(fechaInicio, diaPago);
        const nombreParqueadero = await this.clienteRepository.obtenerNombreParqueadero(dto.parqueaderoId);

        const cliente = await this.clienteRepository.registrarClienteConPago(
            { ...dto, diaPagoMensual: diaPago },
            usuarioId,
            turno.id,
            tarifa.precioMensualidad,
            periodo
        );

        try {
            await this.whatsappService.enviarBienvenidaMensualidad({
                telefono: cliente.telefono ?? dto.telefono,
                nombreCliente: cliente.nombreCliente,
                tratamiento: cliente.tratamiento,
                placa: cliente.placa,
                nombreParqueadero,
                fechaPago: new Date(),
                monto: tarifa.precioMensualidad,
                diaPagoMensual: diaPago,
                fechaVencimiento: periodo.fechaVencimiento,
                codigoQr: cliente.codigoQr ?? ''
            });
        } catch (error: unknown) {
            console.error('No fue posible enviar la bienvenida de mensualidad.', error);
        }

        return cliente;
    }
}