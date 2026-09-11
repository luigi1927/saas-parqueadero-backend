import type { INotificacionMensualidadRepository } from '../../domain/repositories/INotificacionMensualidadRepository.js';
import type { IWhatsAppService } from '../../domain/services/IWhatsAppService.js';

export class EnviarNotificacionesMensualidadUseCase {
    constructor(
        private readonly notificacionRepository: INotificacionMensualidadRepository,
        private readonly whatsappService: IWhatsAppService
    ) { }

    async ejecutar(): Promise<void> {
        // Interruptor de seguridad: si WhatsApp no está conectado no se reclaman
        // notificaciones ni se intenta enviar, evitando esperas prolongadas y
        // presión innecesaria sobre la base de datos.
        if (!this.whatsappService.estaConectado()) {
            return;
        }

        await this.notificacionRepository.crearNotificacionesDelDia();
        const notificaciones = await this.notificacionRepository.obtenerPendientes(50);

        for (const notificacion of notificaciones) {
            if (!this.whatsappService.estaConectado()) {
                break;
            }
            const reclamada = await this.notificacionRepository.reclamarParaEnvio(notificacion.id);
            if (!reclamada) {
                continue;
            }

            try {
                const enviado = await this.whatsappService.enviarNotificacionMensualidad({
                    telefono: notificacion.telefono,
                    nombreCliente: notificacion.nombreCliente,
                    tratamiento: notificacion.tratamiento,
                    placa: notificacion.placa,
                    nombreParqueadero: notificacion.nombreParqueadero,
                    fechaVencimiento: notificacion.fechaVencimiento,
                    tipo: notificacion.tipo
                });
                if (!enviado) {
                    throw new Error('WhatsApp no confirmó el envío del mensaje.');
                }
                await this.notificacionRepository.registrarEnvioExitoso(notificacion.id);
            } catch (error: unknown) {
                const mensaje = error instanceof Error ? error.message : 'Error desconocido al enviar por WhatsApp.';
                await this.notificacionRepository.registrarFalloEnvio(notificacion.id, mensaje);
            }
        }
    }
}