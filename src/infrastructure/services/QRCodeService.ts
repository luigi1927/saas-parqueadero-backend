import QRCode from 'qrcode';
import type { IQRService } from '../../domain/services/IQRService.js';

export class QRCodeService implements IQRService {
    async generarQRBuffer(contenido: string): Promise<Buffer> {
        return QRCode.toBuffer(contenido, {
            type: 'png',
            width: 350,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
    }
}