export interface IQRService {
    /**
     * Genera un Buffer PNG con el código QR codificado
     */
    generarQRBuffer(contenido: string): Promise<Buffer>;
}