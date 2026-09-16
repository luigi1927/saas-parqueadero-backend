import type { IConfiguracionCobrosDigitales } from '../../domain/types/configuracionCobros.types.js';
import type { IInstruccionPagoDigital, IMedioCobroDigital, MetodoPagoDigital } from '../../domain/types/clienteMensual.types.js';
import type { IConstruirInstruccionCobroDTO, IPasarelaPagoService } from '../../domain/services/IPasarelaPagoService.js';

const NOMBRES_METODOS: Record<MetodoPagoDigital, string> = {
    'NEQUI': 'Nequi',
    'DAVIPLATA': 'Daviplata',
    'WOMPI_BRE_B': 'Breve (llave)'
};

/**
 * Pasarela de "cobro por referencia" ($0): el cliente transfiere desde su app y
 * luego el cajero confirma en el sistema. No mueve plata por nosotros, por eso
 * no cobra comisión. Interfaz compatible con pasar a WOMPI QR / ePayco después.
 */
export class PasarelaCobroReferenciaService implements IPasarelaPagoService {
    metodosDisponibles(configuracion: IConfiguracionCobrosDigitales): MetodoPagoDigital[] {
        return this.mediosDisponibles(configuracion).map((medio) => medio.metodoPago);
    }

    mediosDisponibles(configuracion: IConfiguracionCobrosDigitales): IMedioCobroDigital[] {
        if (!configuracion.activo) return [];
        const medios: IMedioCobroDigital[] = [];
        if (configuracion.nequiNumero) medios.push(this.medioCobro('NEQUI', configuracion));
        if (configuracion.daviplataNumero) medios.push(this.medioCobro('DAVIPLATA', configuracion));
        if (configuracion.breveNumero) medios.push(this.medioCobro('WOMPI_BRE_B', configuracion));
        return medios;
    }

    construirInstruccion(datos: IConstruirInstruccionCobroDTO): IInstruccionPagoDigital {
        const metodos = this.mediosDisponibles(datos.configuracion);
        if (metodos.length === 0) {
            throw new TypeError('El parqueadero no tiene métodos de cobro digital configurados.');
        }
        const montoFormateado = `$${datos.monto.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        const lineasMetodos = metodos.map((medio, indice) => {
            const alias = medio.alias ? `\n   LLave/Alias: ${medio.alias}` : '';
            return `${indice + 1}) ${medio.nombre}\n   ${medio.numero}${alias}`;
        });
        const expiracion = datos.fechaExpiracion
            ? `\n\nVence: ${datos.fechaExpiracion.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
            : '';
        const pie = datos.configuracion.mensajePie ? `\n\n${datos.configuracion.mensajePie}` : '';
        const texto = [
            'Puedes pagar tu mensualidad desde tu aplicación:',
            '',
            `Monto: ${montoFormateado}`,
            `Referencia: ${datos.referencia}`,
            '',
            ...lineasMetodos,
            '',
            'Haz la transferencia y confirma en caja con la referencia.',
            expiracion,
            pie
        ].filter(Boolean).join('\n');

        return {
            monto: datos.monto,
            referencia: datos.referencia,
            metodos,
            texto,
            fechaExpiracion: datos.fechaExpiracion
        };
    }

    private medioCobro(metodoPago: MetodoPagoDigital, configuracion: IConfiguracionCobrosDigitales): IMedioCobroDigital {
        switch (metodoPago) {
            case 'NEQUI':
                return { metodoPago, nombre: NOMBRES_METODOS[metodoPago], numero: configuracion.nequiNumero!, alias: configuracion.nequiAlias };
            case 'DAVIPLATA':
                return { metodoPago, nombre: NOMBRES_METODOS[metodoPago], numero: configuracion.daviplataNumero!, alias: configuracion.daviplataAlias };
            case 'WOMPI_BRE_B':
                return { metodoPago, nombre: NOMBRES_METODOS[metodoPago], numero: configuracion.breveNumero!, alias: configuracion.breveAlias };
        }
    }
}