import type { RowDataPacket } from 'mysql2';
import { dbPool } from '../database/mysql.config.js';
import type { IActualizarConfiguracionCobrosDTO, IConfiguracionCobrosDigitales } from '../../domain/types/configuracionCobros.types.js';
import type { IConfiguracionCobrosDigitalesRepository } from '../../domain/repositories/IConfiguracionCobrosDigitalesRepository.js';

interface FilaCobrosDigitales extends RowDataPacket {
    parqueadero_id: number;
    nequi_numero: string | null;
    nequi_alias: string | null;
    daviplata_numero: string | null;
    daviplata_alias: string | null;
    breve_numero: string | null;
    breve_alias: string | null;
    mensaje_pie: string | null;
    activo: number;
}

export class MySQLConfiguracionCobrosDigitalesRepository implements IConfiguracionCobrosDigitalesRepository {
    async obtener(parqueaderoId: number): Promise<IConfiguracionCobrosDigitales> {
        const [filas] = await dbPool.execute<FilaCobrosDigitales[]>(`
            SELECT parqueadero_id, nequi_numero, nequi_alias, daviplata_numero, daviplata_alias,
                   breve_numero, breve_alias, mensaje_pie, activo
            FROM configuracion_cobros_digitales
            WHERE parqueadero_id = ?
        `, [parqueaderoId]);
        const fila = filas[0];
        if (!fila) {
            return {
                parqueaderoId,
                activo: true
            };
        }
        return this.mapear(fila);
    }

    async actualizar(parqueaderoId: number, datos: IActualizarConfiguracionCobrosDTO): Promise<IConfiguracionCobrosDigitales> {
        this.validar(datos);
        const nequiNumero = datos.nequiNumero?.trim() || null;
        const daviplataNumero = datos.daviplataNumero?.trim() || null;
        const breveNumero = datos.breveNumero?.trim() || null;
        if (!nequiNumero && !daviplataNumero && !breveNumero) {
            throw new TypeError('Debes configurar al menos un número o llave de cobro (Nequi, Daviplata o Breve).');
        }
        await dbPool.execute(`
            INSERT INTO configuracion_cobros_digitales
                (parqueadero_id, nequi_numero, nequi_alias, daviplata_numero, daviplata_alias,
                 breve_numero, breve_alias, mensaje_pie, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                nequi_numero = VALUES(nequi_numero),
                nequi_alias = VALUES(nequi_alias),
                daviplata_numero = VALUES(daviplata_numero),
                daviplata_alias = VALUES(daviplata_alias),
                breve_numero = VALUES(breve_numero),
                breve_alias = VALUES(breve_alias),
                mensaje_pie = VALUES(mensaje_pie),
                activo = VALUES(activo)
        `, [
            parqueaderoId,
            nequiNumero,
            datos.nequiAlias?.trim() || null,
            daviplataNumero,
            datos.daviplataAlias?.trim() || null,
            breveNumero,
            datos.breveAlias?.trim() || null,
            datos.mensajePie?.trim() || null,
            datos.activo === false ? 0 : 1
        ]);
        return this.obtener(parqueaderoId);
    }

    private validar(datos: IActualizarConfiguracionCobrosDTO): void {
        const numeros = [datos.nequiNumero, datos.daviplataNumero, datos.breveNumero].filter((v): v is string => !!v?.trim());
        for (const numero of numeros) {
            const limpio = numero.replace(/[^\d]/g, '');
            if (!/^3\d{9}$/.test(limpio) && !/^\d{7,15}$/.test(limpio)) {
                throw new TypeError(`El número de cobro "${numero}" no es válido. Usa un celular 3XXXXXXXXX o una llave numérica.`);
            }
        }
    }

    private mapear(fila: FilaCobrosDigitales): IConfiguracionCobrosDigitales {
        return {
            parqueaderoId: fila.parqueadero_id,
            nequiNumero: fila.nequi_numero ?? undefined,
            nequiAlias: fila.nequi_alias ?? undefined,
            daviplataNumero: fila.daviplata_numero ?? undefined,
            daviplataAlias: fila.daviplata_alias ?? undefined,
            breveNumero: fila.breve_numero ?? undefined,
            breveAlias: fila.breve_alias ?? undefined,
            mensajePie: fila.mensaje_pie ?? undefined,
            activo: fila.activo === 1
        };
    }
}