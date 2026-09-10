import type { IUsuarioRepository, IUsuario, IRegistrarOperarioDTO, IActualizarAdministradorPropioDTO } from '../../domain/repositories/IUsuarioRepository.js';
import type { PoolConnection } from 'mysql2/promise';
import { dbPool } from '../database/mysql.config.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

export class MySQLUsuarioRepository implements IUsuarioRepository {
  async listarPorParqueadero(parqueaderoId: number): Promise<IUsuario[]> {
    const [rows] = await dbPool.execute<RowDataPacket[]>(`
      SELECT usuario.id, usuario.parqueadero_id AS parqueaderoId, usuario.rol_id AS rolId,
           rol.nombre AS rolNombre, usuario.nombre, usuario.documento_id AS documentoId,
           usuario.telefono, usuario.email, usuario.password_hash AS passwordHash,
           usuario.pin_hash AS pinHash, usuario.intentos_fallidos_pin AS intentosFallidosPin,
           usuario.bloqueado_hasta AS bloqueadoHasta, usuario.estado
      FROM usuarios usuario
      INNER JOIN roles rol ON rol.id = usuario.rol_id
      WHERE usuario.parqueadero_id = ? AND rol.nombre = 'OPERARIO'
      ORDER BY usuario.nombre ASC
    `, [parqueaderoId]);
    return rows as IUsuario[];
  }

  async registrarOperario(parqueaderoId: number, administradorId: number, datos: IRegistrarOperarioDTO): Promise<IUsuario> {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const rolId = await this.obtenerRolOperario(connection);
      const [result] = await connection.execute<ResultSetHeader>(`
        INSERT INTO usuarios (parqueadero_id, rol_id, nombre, documento_id, telefono, email, pin_hash, creado_por, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')
      `, [parqueaderoId, rolId, datos.nombre.trim(), datos.documentoId.trim(), datos.telefono.trim(), datos.email?.trim() ?? null, datos.pinHash, administradorId]);
      await this.registrarAuditoria(connection, parqueaderoId, administradorId, 'REGISTRO_OPERARIO', `Operario ${result.insertId}`);
      await connection.commit();
      const usuario = await this.buscarPorId(result.insertId);
      if (!usuario) throw new Error('No fue posible recuperar el operario creado.');
      return usuario;
    } catch (error: unknown) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async cambiarEstadoOperario(parqueaderoId: number, operarioId: number, administradorId: number, estado: 'ACTIVO' | 'INACTIVO', motivo: string): Promise<void> {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<ResultSetHeader>(`
        UPDATE usuarios usuario
        INNER JOIN roles rol ON rol.id = usuario.rol_id
        SET usuario.estado = ?
        WHERE usuario.id = ? AND usuario.parqueadero_id = ? AND rol.nombre = 'OPERARIO'
      `, [estado, operarioId, parqueaderoId]);
      if (result.affectedRows !== 1) throw new Error('El operario no existe en este parqueadero.');
      await this.registrarAuditoria(connection, parqueaderoId, administradorId, `${estado}_OPERARIO`, motivo);
      await connection.commit();
    } catch (error: unknown) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

    async actualizarOperario(parqueaderoId: number, operarioId: number, administradorId: number, datos: import('../../domain/repositories/IUsuarioRepository.js').IActualizarOperarioDTO): Promise<void> {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<ResultSetHeader>(`
        UPDATE usuarios usuario
        INNER JOIN roles rol ON rol.id = usuario.rol_id
        SET usuario.nombre = ?, usuario.telefono = ?, usuario.email = ?
        WHERE usuario.id = ? AND usuario.parqueadero_id = ? AND rol.nombre = 'OPERARIO'
      `, [datos.nombre.trim(), datos.telefono.trim(), datos.email?.trim() || null, operarioId, parqueaderoId]);
      if (result.affectedRows !== 1) throw new Error('El operario no existe en este parqueadero.');
      await this.registrarAuditoria(connection, parqueaderoId, administradorId, 'ACTUALIZAR_OPERARIO', `Operario ${operarioId}`);
      await connection.commit();
    } catch (error: unknown) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async resetearPinOperario(parqueaderoId: number, operarioId: number, administradorId: number, pinHash: string): Promise<void> {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute<ResultSetHeader>(`
        UPDATE usuarios usuario
        INNER JOIN roles rol ON rol.id = usuario.rol_id
        SET usuario.pin_hash = ?, usuario.intentos_fallidos_pin = 0, usuario.bloqueado_hasta = NULL
        WHERE usuario.id = ? AND usuario.parqueadero_id = ? AND rol.nombre = 'OPERARIO'
      `, [pinHash, operarioId, parqueaderoId]);
      if (result.affectedRows !== 1) throw new Error('El operario no existe en este parqueadero.');
      await this.registrarAuditoria(connection, parqueaderoId, administradorId, 'RESETEAR_PIN_OPERARIO', `Operario ${operarioId}`);
      await connection.commit();
    } catch (error: unknown) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

    async buscarPorDocumento(parqueaderoId: number | null, documentoId: string): Promise<IUsuario | null> {
        // Consulta usando el índice directo `uk_parqueadero_documento`
        const query = `
      SELECT 
        usuarios.id, 
        usuarios.parqueadero_id AS parqueaderoId,
        usuarios.rol_id AS rolId,
        rol.nombre AS rolNombre,
        usuarios.nombre,
        usuarios.documento_id AS documentoId,
        usuarios.telefono,
        usuarios.email,
        usuarios.password_hash AS passwordHash,
        usuarios.pin_hash AS pinHash,
        usuarios.intentos_fallidos_pin AS intentosFallidosPin,
        usuarios.bloqueado_hasta AS bloqueadoHasta,
        usuarios.estado
      FROM usuarios
      INNER JOIN roles rol ON rol.id = usuarios.rol_id
      WHERE (usuarios.parqueadero_id = ? OR (? IS NULL AND usuarios.parqueadero_id IS NULL))
        AND usuarios.documento_id = ?
      LIMIT 1
    `;

        const [rows] = await dbPool.execute<RowDataPacket[]>(query, [parqueaderoId, parqueaderoId, documentoId]);

        if (rows.length === 0) return null;

        return rows[0] as IUsuario;
    }

    async buscarCuentasActivasPorDocumento(documentoId: string): Promise<IUsuario[]> {
      const [rows] = await dbPool.execute<RowDataPacket[]>(`
        SELECT usuarios.id, usuarios.parqueadero_id AS parqueaderoId, usuarios.rol_id AS rolId,
             rol.nombre AS rolNombre, usuarios.nombre, usuarios.documento_id AS documentoId,
             usuarios.telefono, usuarios.email, usuarios.password_hash AS passwordHash,
             usuarios.pin_hash AS pinHash, usuarios.intentos_fallidos_pin AS intentosFallidosPin,
             usuarios.bloqueado_hasta AS bloqueadoHasta, usuarios.estado,
             parqueadero.nombre_comercial AS nombreParqueadero
        FROM usuarios
        INNER JOIN roles rol ON rol.id = usuarios.rol_id
        INNER JOIN parqueaderos parqueadero ON parqueadero.id = usuarios.parqueadero_id
        WHERE usuarios.documento_id = ?
      `, [documentoId]);
      return rows as IUsuario[];
    }

    async buscarSuperAdminPorDocumento(documentoId: string): Promise<IUsuario | null> {
      const [rows] = await dbPool.execute<RowDataPacket[]>(`
        SELECT usuario.id, usuario.parqueadero_id AS parqueaderoId, usuario.rol_id AS rolId,
             rol.nombre AS rolNombre, usuario.nombre, usuario.documento_id AS documentoId,
             usuario.telefono, usuario.email, usuario.password_hash AS passwordHash,
             usuario.pin_hash AS pinHash, usuario.intentos_fallidos_pin AS intentosFallidosPin,
             usuario.bloqueado_hasta AS bloqueadoHasta, usuario.estado
        FROM usuarios usuario
        INNER JOIN roles rol ON rol.id = usuario.rol_id
        WHERE usuario.parqueadero_id IS NULL AND usuario.documento_id = ? AND rol.nombre = 'SUPER_ADMIN'
        LIMIT 1
      `, [documentoId]);
      return rows[0] ? rows[0] as IUsuario : null;
    }

    async buscarPorId(id: number): Promise<IUsuario | null> {
        const query = `
      SELECT 
        usuario.id, usuario.parqueadero_id AS parqueaderoId, usuario.rol_id AS rolId, rol.nombre AS rolNombre, usuario.nombre,
        documento_id AS documentoId, telefono, email, password_hash AS passwordHash,
        pin_hash AS pinHash, intentos_fallidos_pin AS intentosFallidosPin,
        bloqueado_hasta AS bloqueadoHasta, estado
      FROM usuarios usuario INNER JOIN roles rol ON rol.id = usuario.rol_id WHERE usuario.id = ? LIMIT 1
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

    async registrarCodigoRecuperacion(usuarioId: number, codigoHash: string, expiraEn: Date, ip?: string | null): Promise<number> {
        const [result] = await dbPool.execute<ResultSetHeader>(`
            INSERT INTO codigos_recuperacion (usuario_id, codigo_hash, expiracion, ip)
            VALUES (?, ?, ?, ?)
        `, [usuarioId, codigoHash, expiraEn, ip ?? null]);
        return result.insertId;
    }

    async leerCodigoRecuperacionActivo(usuarioId: number): Promise<{ id: number; codigoHash: string; expiracion: Date; consumido: number } | null> {
        const query = `
            SELECT id, codigo_hash AS codigoHash, expiracion, consumido
            FROM codigos_recuperacion
            WHERE usuario_id = ?
            ORDER BY id DESC
            LIMIT 1
        `;
        const [rows] = await dbPool.execute<RowDataPacket[]>(query, [usuarioId]);
        const fila = rows[0];
        if (!fila) return null;
        return {
            id: fila.id,
            codigoHash: fila.codigoHash,
            expiracion: new Date(fila.expiracion),
            consumido: fila.consumido
        };
    }

    async eliminarCodigosExpirados(usuarioId: number): Promise<void> {
        await dbPool.execute<ResultSetHeader>(`
            DELETE FROM codigos_recuperacion WHERE usuario_id = ? AND expiracion <= NOW()
        `, [usuarioId]);
    }

    async marcarCodigoConsumido(codigoId: number): Promise<void> {
        await dbPool.execute<ResultSetHeader>(`
            UPDATE codigos_recuperacion SET consumido = 1, usado_en = NOW() WHERE id = ?
        `, [codigoId]);
    }

    async restablecerPin(usuarioId: number, pinHash: string): Promise<void> {
        await dbPool.execute<ResultSetHeader>(`
            UPDATE usuarios SET pin_hash = ?, intentos_fallidos_pin = 0, bloqueado_hasta = NULL, estado = 'ACTIVO'
            WHERE id = ?
        `, [pinHash, usuarioId]);
    }

    private async obtenerRolOperario(connection: PoolConnection): Promise<number> {
      const [rows] = await connection.execute<RowDataPacket[]>(`SELECT id FROM roles WHERE nombre = 'OPERARIO' LIMIT 1`);
      const row = rows[0];
      if (!row) throw new Error('No existe el rol OPERARIO.');
      return row.id as number;
    }

    private async registrarAuditoria(connection: PoolConnection, parqueaderoId: number, usuarioId: number, tipoAccion: string, motivo: string): Promise<void> {
      await connection.execute(`
        INSERT INTO auditoria_eventos (parqueadero_id, usuario_id, tipo_accion, motivo)
        VALUES (?, ?, ?, ?)
      `, [parqueaderoId, usuarioId, tipoAccion, motivo]);
    }

    async actualizarDatosPropios(usuarioId: number, parqueaderoId: number, datos: IActualizarAdministradorPropioDTO): Promise<void> {
        const [result] = await dbPool.execute<ResultSetHeader>(`
            UPDATE usuarios usuario
            INNER JOIN roles rol ON rol.id = usuario.rol_id
            SET usuario.nombre = ?, usuario.telefono = ?, usuario.email = ?
            WHERE usuario.id = ? AND usuario.parqueadero_id = ? AND rol.nombre = 'ADMIN_PARQUEADERO'
        `, [datos.nombre.trim(), datos.telefono.trim(), datos.email?.trim() || null, usuarioId, parqueaderoId]);
        if (result.affectedRows !== 1) throw new Error('No fue posible actualizar los datos del administrador.');
    }
}