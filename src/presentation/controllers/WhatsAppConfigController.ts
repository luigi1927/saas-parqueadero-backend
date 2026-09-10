import type { Request, Response } from 'express';
import { whatsappService } from '../../infrastructure/services/whatsappInstance.js';

export class WhatsAppConfigController {
    /**
     * GET /api/v1/whatsapp/qr
     * Obtiene el código QR actual para sincronizar WhatsApp
     * Solo accesible para ADMIN_PARQUEADERO
     */
    static async obtenerQr(req: Request, res: Response): Promise<void> {
        try {
            const qrBase64 = whatsappService.obtenerQr();
            res.status(200).json({
                data: {
                    qr: qrBase64,
                    conectado: whatsappService.estaConectado()
                }
            });
        } catch (error: unknown) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Error al obtener el QR'
            });
        }
    }

    /**
     * POST /api/v1/whatsapp/desvincular
     * Cierra la sesión de WhatsApp, borra las credenciales locales
     * y reinicia la conexión para mostrar un código QR nuevo.
     */
    static async desvincular(_req: Request, res: Response): Promise<void> {
        try {
            await whatsappService.desvincular();
            res.status(200).json({ data: { ok: true } });
        } catch (error: unknown) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'No fue posible desvincular WhatsApp'
            });
        }
    }
}
