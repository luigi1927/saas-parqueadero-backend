import type { IEgresoRepository } from '../../domain/repositories/IEgresoRepository.js';
import type { IEgresoCaja, IRegistrarEgresoDTO } from '../../domain/types/egreso.types.js';
import { dbPool } from '../database/mysql.config.js';
import type { ResultSetHeader } from 'mysql2';
import type { EgresoRow } from '../types/egreso-mysql.types.js';


export class MySQLEgresoRepository implements IEgresoRepository {

    async registrar(datos: IRegistrarEgresoDTO): Promise<IEgresoCaja> {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Insertar el registro en egresos_caja_menor
            const queryEgreso = `
        INSERT INTO egresos_caja_menor (turno_caja_id, usuario_id, monto, motivo, fecha_registro)
        VALUES (?, ?, ?, ?, NOW())
      `;
            const [result] = await connection.execute<ResultSetHeader>(queryEgreso, [
                datos.turnoCajaId,
                datos.usuarioId,
                datos.monto,
                datos.motivo
            ]);

            // 2. Actualizar el acumulado en turnos_caja
            const queryTurno = `
        UPDATE turnos_caja
        SET total_egresos_caja = total_egresos_caja + ?
        WHERE id = ?
      `;
            await connection.execute(queryTurno, [datos.monto, datos.turnoCajaId]);

            await connection.commit();

            return {
                id: result.insertId,
                turnoCajaId: datos.turnoCajaId,
                usuarioId: datos.usuarioId,
                monto: datos.monto,
                motivo: datos.motivo,
                fechaRegistro: new Date()
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async listarPorTurno(turnoCajaId: number): Promise<IEgresoCaja[]> {
        const query = `
      SELECT id, turno_caja_id, usuario_id, monto, motivo, fecha_registro
      FROM egresos_caja_menor
      WHERE turno_caja_id = ?
      ORDER BY fecha_registro DESC
    `;
        const [rows] = await dbPool.execute<EgresoRow[]>(query, [turnoCajaId]);

        return rows.map(fila => ({
            id: fila.id,
            turnoCajaId: fila.turno_caja_id,
            usuarioId: fila.usuario_id,
            monto: Number(fila.monto),
            motivo: fila.motivo,
            fechaRegistro: new Date(fila.fecha_registro)
        }));
    }
}