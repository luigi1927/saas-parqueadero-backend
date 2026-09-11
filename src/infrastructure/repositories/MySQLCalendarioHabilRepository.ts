import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { dbPool } from '../database/mysql.config.js';
import type { ICalendarioHabilRepository, IDiaNoHabil } from '../../domain/repositories/ICalendarioHabilRepository.js';

interface DiaNoHabilRow extends RowDataPacket {
    id: number;
    fecha: Date;
    motivo: string;
}

export class MySQLCalendarioHabilRepository implements ICalendarioHabilRepository {
    async listar(parqueaderoId: number): Promise<IDiaNoHabil[]> {
        const [rows] = await dbPool.execute<DiaNoHabilRow[]>(`
            SELECT id, fecha, motivo FROM dias_no_habiles_parqueadero
            WHERE parqueadero_id = ? ORDER BY fecha ASC
        `, [parqueaderoId]);
        return rows.map((row) => ({ id: row.id, fecha: formatearFecha(row.fecha), motivo: row.motivo }));
    }

    async agregar(parqueaderoId: number, fecha: string, motivo: string): Promise<IDiaNoHabil> {
        const [result] = await dbPool.execute<ResultSetHeader>(`
            INSERT INTO dias_no_habiles_parqueadero (parqueadero_id, fecha, motivo) VALUES (?, ?, ?)
        `, [parqueaderoId, fecha, motivo.trim()]);
        return { id: result.insertId, fecha, motivo: motivo.trim() };
    }

    async eliminar(parqueaderoId: number, diaNoHabilId: number): Promise<void> {
        const [result] = await dbPool.execute<ResultSetHeader>(`
            DELETE FROM dias_no_habiles_parqueadero WHERE id = ? AND parqueadero_id = ?
        `, [diaNoHabilId, parqueaderoId]);
        if (result.affectedRows !== 1) throw new Error('El día no hábil no existe en este parqueadero.');
    }

    async calcularFechaPagoPresencial(parqueaderoId: number, fechaBase: Date, horasPlazo: number): Promise<Date> {
        const fechaCandidata = new Date(fechaBase.getTime() + horasPlazo * 3_600_000);
        const fechaInicial = new Date(fechaCandidata.getFullYear(), fechaCandidata.getMonth(), fechaCandidata.getDate());
        const [rows] = await dbPool.execute<DiaNoHabilRow[]>(`
            SELECT id, fecha, motivo FROM dias_no_habiles_parqueadero
            WHERE parqueadero_id = ? AND fecha >= ?
        `, [parqueaderoId, formatearFecha(fechaInicial)]);
        const fechasNoHabiles = new Set(rows.map((row) => formatearFecha(row.fecha)));
        const resultado = fechaInicial;
        while (resultado.getDay() === 0 || resultado.getDay() === 6 || fechasNoHabiles.has(formatearFecha(resultado))) {
            resultado.setDate(resultado.getDate() + 1);
        }
        resultado.setHours(23, 59, 59, 999);
        return resultado;
    }
}

const formatearFecha = (fecha: Date | string): string => {
    if (typeof fecha === 'string') {
        return fecha.slice(0, 10);
    }
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
};