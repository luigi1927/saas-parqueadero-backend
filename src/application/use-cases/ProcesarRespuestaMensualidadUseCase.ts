import type { IConversacionMensualidadRepository } from '../../domain/repositories/IConversacionMensualidadRepository.js';
import type { ICalendarioHabilRepository } from '../../domain/repositories/ICalendarioHabilRepository.js';
import type { IConfiguracionMensualidadRepository } from '../../domain/repositories/IConfiguracionMensualidadRepository.js';
import type { IConfiguracionCobrosDigitalesRepository } from '../../domain/repositories/IConfiguracionCobrosDigitalesRepository.js';
import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type { IWhatsAppService } from '../../domain/services/IWhatsAppService.js';
import type { IPasarelaPagoService } from '../../domain/services/IPasarelaPagoService.js';
import type { MetodoPagoDigital } from '../../domain/types/clienteMensual.types.js';
import { generarReferenciaCobro } from '../../domain/services/GenerarReferenciaCobro.js';

export class ProcesarRespuestaMensualidadUseCase {
    constructor(
        private readonly conversacionRepository: IConversacionMensualidadRepository,
        private readonly configuracionRepository: IConfiguracionMensualidadRepository,
        private readonly calendarioHabilRepository: ICalendarioHabilRepository,
        private readonly whatsappService: IWhatsAppService,
        private readonly configuracionCobrosRepository: IConfiguracionCobrosDigitalesRepository,
        private readonly clienteRepository: IClienteMensualRepository,
        private readonly pasarelaService: IPasarelaPagoService
    ) { }

    async ejecutar(telefono: string, texto: string): Promise<boolean> {
        const respuesta = normalizarRespuesta(texto);
        if (respuesta === 'SI' || respuesta === 'NO') {
            const contexto = await this.conversacionRepository.registrarDecision(telefono, respuesta === 'SI');
            if (!contexto) {
                console.warn(`No hay una invitación de mensualidad vigente para la respuesta de ${telefono}.`);
                return false;
            }
            if (respuesta === 'SI') {
                const configuracionCobros = await this.configuracionCobrosRepository.obtener(contexto.parqueaderoId);
                const metodosDigitales = this.pasarelaService.metodosDisponibles(configuracionCobros);
                await this.whatsappService.enviarMenuRenovacionMensualidad({
                    telefono: contexto.telefono,
                    placa: contexto.placa,
                    metodosDigitales
                });
            } else {
                await this.whatsappService.enviarConfirmacionRechazoRenovacion(contexto.telefono, contexto.placa);
            }
            return true;
        }

        if (respuesta === 'EFECTIVO') {
            return this.procesarPagoPresencial(telefono);
        }

        if (respuesta === 'NEQUI' || respuesta === 'DAVIPLATA' || respuesta === 'WOMPI_BRE_B') {
            return this.procesarPagoDigital(telefono, respuesta);
        }

        if (respuesta === 'CANCELAR') {
            const contexto = await this.conversacionRepository.cancelarIntencion(telefono);
            if (!contexto) return false;
            await this.whatsappService.enviarConfirmacionCancelacionRenovacion(contexto.telefono, contexto.placa);
            return true;
        }

        return false;
    }

    private async procesarPagoPresencial(telefono: string): Promise<boolean> {
        const contextoPendiente = await this.conversacionRepository.obtenerContextoVigente(telefono);
        if (!contextoPendiente) {
            console.warn(`No hay una selección de renovación mensual vigente para ${telefono}.`);
            return false;
        }
        const configuracion = await this.configuracionRepository.obtener(contextoPendiente.parqueaderoId);
        const fechaLimite = await this.calendarioHabilRepository.calcularFechaPagoPresencial(
            contextoPendiente.parqueaderoId,
            new Date(),
            configuracion.horasPlazoPagoPresencial
        );
        const contexto = await this.conversacionRepository.reservarPagoPresencial(telefono, fechaLimite);
        if (!contexto) {
            console.warn(`No hay una selección de renovación mensual vigente para ${telefono}.`);
            return false;
        }
        await this.whatsappService.enviarInstruccionPagoPresencial({ ...contexto, fechaLimite });
        return true;
    }

    private async procesarPagoDigital(telefono: string, metodoPago: MetodoPagoDigital): Promise<boolean> {
        const contexto = await this.conversacionRepository.obtenerContextoVigente(telefono);
        if (!contexto) {
            console.warn(`No hay una selección de renovación mensual vigente para ${telefono}.`);
            return false;
        }
        const configuracionCobros = await this.configuracionCobrosRepository.obtener(contexto.parqueaderoId);
        if (!this.pasarelaService.metodosDisponibles(configuracionCobros).includes(metodoPago)) {
            await this.whatsappService.enviarConfirmacionCancelacionRenovacion(contexto.telefono, contexto.placa);
            return true;
        }

        const referenciaExterna = generarReferenciaCobro(contexto.clienteMensualId);
        const fechaExpiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.clienteRepository.crearIntencionDigital(
            contexto.parqueaderoId,
            contexto.clienteMensualId,
            contexto.monto,
            metodoPago,
            referenciaExterna,
            contexto.fechaVencimiento,
            fechaExpiracion
        );
        const instruccion = this.pasarelaService.construirInstruccion({
            monto: contexto.monto,
            referencia: referenciaExterna,
            configuracion: configuracionCobros,
            fechaExpiracion
        });
        await this.whatsappService.enviarInstruccionPagoDigital({
            telefono: contexto.telefono,
            nombreCliente: contexto.nombreCliente,
            tratamiento: contexto.tratamiento,
            placa: contexto.placa,
            textoInstruccion: instruccion.texto
        });
        return true;
    }
}

const normalizarRespuesta = (texto: string): 'SI' | 'NO' | 'EFECTIVO' | 'NEQUI' | 'DAVIPLATA' | 'WOMPI_BRE_B' | 'CANCELAR' | 'OTRA' => {
    const valor = texto.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (valor === 'si' || valor === 's') return 'SI';
    if (valor === 'no' || valor === 'n') return 'NO';
    if (valor === '1' || valor === 'efectivo') return 'EFECTIVO';
    if (valor === '2' || valor === 'nequi') return 'NEQUI';
    if (valor === '3' || valor === 'daviplata') return 'DAVIPLATA';
    if (valor === '4' || valor === 'breve' || valor === 'breb' || valor === 'llave') return 'WOMPI_BRE_B';
    if (valor === '0' || valor === 'cancelar') return 'CANCELAR';
    return 'OTRA';
};