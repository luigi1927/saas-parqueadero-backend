import type { IUsuarioRepository, IUsuario } from '../../domain/repositories/IUsuarioRepository.js';
import { dbPool } from '../database/mysql.config.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export class MySQLUsuarioRepository implements IUsuarioRepository {

    async buscarPorDocumento(parqueaderoId: number | null, documentoId: string): Promise<IUsuario | null> {
        // Consulta usando el índice directo `uk_parqueadero_documento`
        const query = `
      SELECT 
        id, 
        parqueadero_id AS parqueaderoId,
        rol_id AS rolId,
        nombre,
        documento_id AS documentoId,
        telefono,
        email,
        password_hash AS passwordHash,
        pin_hash AS pinHash,
        intentos_fallidos_pin AS intentosFallidosPin,
        bloqueado_hasta AS bloqueadoHasta,
        estado
      FROM usuarios 
      WHERE (parqueadero_id = ? OR (? IS NULL AND parqueadero_id IS NULL))
        AND documento_id = ?
      LIMIT 1
    `;

        const [rows] = await dbPool.execute<RowDataPacket[]>(query, [parqueaderoId, parqueaderoId, documentoId]);

        if (rows.length === 0) return null;

        return rows[0] as IUsuario;
    }

    async buscarPorId(id: number): Promise<IUsuario | null> {
        const query = `
      SELECT 
        id, parqueadero_id AS parqueaderoId, rol_id AS rolId, nombre,
        documento_id AS documentoId, telefono, email, password_hash AS passwordHash,
        pin_hash AS pinHash, intentos_fallidos_pin AS intentosFallidosPin,
        bloqueado_hasta AS bloqueadoHasta, estado
      FROM usuarios WHERE id = ? LIMIT 1
    `;
        const [rows] = await dbPool.execute<RowDataPacket[]>(query, [id]);
        if (rows.length === 0) return null;
        return rows[0] as IUsuario;
    }

    async registrarIntentoFallido(usuarioId: number, nuevosIntentos: number): Promise<void> {
        const query = `UPDATE usuarios SET intentos_fallidos_pin = ? WHERE id = ?`;
        await dbPool.execute<ResultSetHeader>(query, [nuevosIntentos, usuarioId]);
    }

    async bloquearUsuario(usuarioId: number): Promise<void> {
        const query = `UPDATE usuarios SET estado = 'BLOQUEADO' WHERE id = ?`;
        await dbPool.execute<ResultSetHeader>(query, [usuarioId]);
    }

    async resetearIntentos(usuarioId: number): Promise<void> {
        const query = `UPDATE usuarios SET intentos_fallidos_pin = 0, bloqueado_hasta = NULL WHERE id = ?`;
        await dbPool.execute<ResultSetHeader>(query, [usuarioId]);
    }
}