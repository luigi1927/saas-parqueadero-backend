import type { IConfiguracionCobrosDigitales } from '../types/configuracionCobros.types.js';
import type { IInstruccionPagoDigital, MetodoPagoDigital } from '../types/clienteMensual.types.js';

export interface IConstruirInstruccionCobroDTO {
    monto: number;
    referencia: string;
    configuracion: IConfiguracionCobrosDigitales;
    fechaExpiracion?: Date | undefined;
}

/**
 * Contrato de pasarela de cobro digital. Hoy se implementa con "cobro por
 * referencia" ($0: el cliente paga a un número/llave de Nequi/Daviplata/Breve
 * desde su app y el cajero confirma). Si mañana se integra una pasarela real
 * (p.ej. WOMPI QR o ePayco), se implementa esta misma interfaz sin tocar el
 * dominio.
 */
export interface IPasarelaPagoService {
    construirInstruccion(datos: IConstruirInstruccionCobroDTO): IInstruccionPagoDigital;
    metodosDisponibles(configuracion: IConfiguracionCobrosDigitales): MetodoPagoDigital[];
}