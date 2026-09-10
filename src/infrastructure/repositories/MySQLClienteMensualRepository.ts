import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type {
    IClienteMensual,
    IPagoMensualidad,
    ICrearClienteMensualDTO,
    IRegistrarPagoMensualidadDTO,
    IActualizarClienteMensualDTO,
    IListarMensualidadesDTO,
    IPaginaMensualidades,
    IResumenMensualidades,
    IReciboMensualidad,
    IClienteMensualDetalle,
    IClienteMensualQr
} from '../../domain/types/clienteMensual.types.js';
import { dbPool } from '../database/mysql.config.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import type { ClienteRow, PagoRow } from '../types/mensual-mysql.types.js';
import type { IPeriodoMensualidad } from '../../domain/services/CalcularPeriodoMensualidad.js';
import { v4 as uuidv4 } from 'uuid';

export class MySQLClienteMensualRepository implements IClienteMensualRepository {

    async crearCliente(datos: ICrearClienteMensualDTO): Promise<IClienteMensual> {
        const query = `
      INSERT INTO clientes_mensuales (
                parqueadero_id, placa, codigo_qr, nombre_propietario, tratamiento, telefono_whatsapp,
        documento_identidad, dia_pago_mensual, fecha_inicio, fecha_vencimiento, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AL_DIA')
    `;

        const fechaInicio = datos.fechaInicioContrato ? new Date(datos.fechaInicioContrato) : new Date();
        // Por defecto, sumamos 1 mes a la fecha de inicio para establecer el vencimiento
        const fechaVencimiento = new Date(fechaInicio);
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);

        const [result] = await dbPool.execute<ResultSetHeader>(query, [
            datos.parqueaderoId,
            datos.placa.toUpperCase().trim(),
            uuidv4(),
            datos.nombreCliente.trim(),
            datos.tratamiento,
            datos.telefono ?? '',
            datos.documentoIdentidad ?? null,
            datos.diaPagoMensual ?? fechaInicio.getDate(),
            fechaInicio,
            fechaVencimiento
        ]);

        const cliente = await this.buscarPorId(result.insertId, datos.parqueaderoId);
        return cliente!;
    }

    async buscarPorId(id: number, parqueaderoId: number): Promise<IClienteMensual | null> {
        const query = `
    SELECT id, parqueadero_id, usuario_id, placa, codigo_qr, nombre_propietario, tratamiento,
             telefono_whatsapp, documento_identidad, dia_pago_mensual, fecha_inicio, fecha_vencimiento, estado, creado_en
      FROM clientes_mensuales
      WHERE id = ? AND parqueadero_id = ?
      LIMIT 1
    `;
        const [rows] = await dbPool.execute<ClienteRow[]>(query, [id, parqueaderoId]);
        if (!rows[0]) return null;
        return this.mapearCliente(rows[0]);
    }

    async buscarPorUsuarioId(usuarioId: number): Promise<IClienteMensual | null> {
        const query = `
    SELECT id, parqueadero_id, usuario_id, placa, codigo_qr, nombre_propietario, tratamiento,
             telefono_whatsapp, documento_identidad, dia_pago_mensual, fecha_inicio, fecha_vencimiento, estado, creado_en
      FROM clientes_mensuales
      WHERE usuario_id = ?
      LIMIT 1
    `;
        const [rows] = await dbPool.execute<ClienteRow[]>(query, [usuarioId]);
        if (!rows[0]) return null;
        return this.mapearCliente(rows[0]);
    }

    async obtenerDetalle(id: number, parqueaderoId: number): Promise<IClienteMensualDetalle | null> {
        const [rows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT cliente.id, cliente.parqueadero_id, cliente.placa, cliente.codigo_qr, cliente.nombre_propietario,
                   cliente.tratamiento, cliente.telefono_whatsapp, cliente.documento_identidad,
                   cliente.dia_pago_mensual, cliente.fecha_inicio, cliente.fecha_vencimiento,
                   cliente.estado, cliente.creado_en, parqueadero.nombre_comercial,
                   usuario.id AS usuario_registro_id, usuario.nombre AS usuario_registro_nombre,
                   usuario.documento_id AS usuario_registro_documento
            FROM clientes_mensuales cliente
            INNER JOIN parqueaderos parqueadero ON parqueadero.id = cliente.parqueadero_id
            LEFT JOIN usuarios usuario ON usuario.id = cliente.usuario_id
            WHERE cliente.id = ? AND cliente.parqueadero_id = ?
            LIMIT 1
        `, [id, parqueaderoId]);
        const row = rows[0];
        if (!row) return null;

        const cliente = this.mapearCliente(row as ClienteRow);
        const pagos = await this.listarPagosPorCliente(id, parqueaderoId);
        return {
            ...cliente,
            nombreParqueadero: row.nombre_comercial,
            usuarioRegistro: row.usuario_registro_id ? {
                id: row.usuario_registro_id,
                nombre: row.usuario_registro_nombre,
                documentoId: row.usuario_registro_documento
            } : undefined,
            pagos
        };
    }

    async buscarPorPlaca(placa: string, parqueaderoId: number): Promise<IClienteMensual | null> {
        const query = `
    SELECT id, parqueadero_id, usuario_id, placa, codigo_qr, nombre_propietario, tratamiento,
             telefono_whatsapp, documento_identidad, dia_pago_mensual, fecha_inicio, fecha_vencimiento, estado, creado_en
      FROM clientes_mensuales
      WHERE placa = ? AND parqueadero_id = ?
      LIMIT 1
    `;
        const [rows] = await dbPool.execute<ClienteRow[]>(query, [placa.toUpperCase().trim(), parqueaderoId]);
        if (!rows[0]) return null;
        return this.mapearCliente(rows[0]);
    }

    async buscarPorCodigoQr(codigoQr: string): Promise<IClienteMensualQr | null> {
        const [rows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT cliente.id, cliente.parqueadero_id, cliente.placa, cliente.nombre_propietario,
                   cliente.tratamiento, cliente.fecha_vencimiento, cliente.estado,
                   parqueadero.nombre_comercial
            FROM clientes_mensuales cliente
            INNER JOIN parqueaderos parqueadero ON parqueadero.id = cliente.parqueadero_id
            WHERE cliente.codigo_qr = ?
            LIMIT 1
        `, [codigoQr.trim()]);
        const fila = rows[0];
        if (!fila) return null;
        return {
            id: fila.id,
            parqueaderoId: fila.parqueadero_id,
            placa: fila.placa,
            nombreCliente: fila.nombre_propietario,
            tratamiento: fila.tratamiento ?? undefined,
            fechaVencimiento: new Date(fila.fecha_vencimiento),
            estado: fila.estado,
            nombreParqueadero: fila.nombre_comercial
        };
    }

    async obtenerNombreParqueadero(parqueaderoId: number): Promise<string> {
        const [rows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT nombre_comercial
            FROM parqueaderos
            WHERE id = ?
            LIMIT 1
        `, [parqueaderoId]);
        const nombre = rows[0]?.nombre_comercial;
        if (typeof nombre !== 'string' || !nombre.trim()) {
            throw new Error('No fue posible obtener el nombre del parqueadero.');
        }
        return nombre;
    }

    async tieneAccesoMensual(placa: string, parqueaderoId: number): Promise<boolean> {
        const [rows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT id
                        FROM clientes_mensuales cliente
                        LEFT JOIN configuracion_mensualidades configuracion
                                ON configuracion.parqueadero_id = cliente.parqueadero_id
                        WHERE cliente.parqueadero_id = ? AND cliente.placa = ?
                            AND cliente.estado != 'CANCELADA'
                            AND CURDATE() <= DATE_ADD(cliente.fecha_vencimiento, INTERVAL COALESCE(configuracion.dias_gracia, 3) DAY)
            LIMIT 1
        `, [parqueaderoId, placa.toUpperCase().trim()]);
        return rows[0] !== undefined;
    }

    async actualizarCliente(id: number, parqueaderoId: number, usuarioId: number, datos: IActualizarClienteMensualDTO): Promise<IClienteMensual> {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.execute<ResultSetHeader>(`
                UPDATE clientes_mensuales
                SET nombre_propietario = ?, tratamiento = ?, telefono_whatsapp = ?,
                    documento_identidad = ?, dia_pago_mensual = ?
                WHERE id = ? AND parqueadero_id = ? AND estado != 'CANCELADA'
            `, [datos.nombreCliente.trim(), datos.tratamiento, datos.telefono.trim(), datos.documentoIdentidad ?? null, datos.diaPagoMensual, id, parqueaderoId]);
            if (result.affectedRows !== 1) throw new Error('La mensualidad no existe o está cancelada.');
            await this.registrarAuditoria(connection, parqueaderoId, usuarioId, 'ACTUALIZACION_MENSUALIDAD', id);
            await connection.commit();
        } catch (error: unknown) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        return this.obtenerClienteActualizado(id, parqueaderoId);
    }

    async cambiarPlaca(id: number, parqueaderoId: number, usuarioId: number, placaNueva: string): Promise<IClienteMensual> {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.execute<ResultSetHeader>(`
                UPDATE clientes_mensuales
                SET placa = ?
                WHERE id = ? AND parqueadero_id = ? AND estado != 'CANCELADA'
            `, [placaNueva.toUpperCase().trim(), id, parqueaderoId]);
            if (result.affectedRows !== 1) throw new Error('La mensualidad no existe o está cancelada.');
            await this.registrarAuditoria(connection, parqueaderoId, usuarioId, 'CAMBIO_PLACA_MENSUALIDAD', id);
            await connection.commit();
        } catch (error: unknown) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        return this.obtenerClienteActualizado(id, parqueaderoId);
    }

    async cambiarEstado(
        id: number,
        parqueaderoId: number,
        estado: 'CANCELADA' | 'AL_DIA' | 'POR_VENCER' | 'VENCIDO',
        usuarioId: number,
        motivo: string
    ): Promise<IClienteMensual> {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.execute<ResultSetHeader>(`
                UPDATE clientes_mensuales
                SET estado = ?
                WHERE id = ? AND parqueadero_id = ?
            `, [estado, id, parqueaderoId]);
            if (result.affectedRows !== 1) {
                throw new Error('La mensualidad no existe.');
            }
            await connection.execute(`
                INSERT INTO auditoria_eventos (parqueadero_id, usuario_id, tipo_accion, motivo, detalles)
                VALUES (?, ?, ?, ?, JSON_OBJECT('clienteMensualId', ?, 'estado', ?))
            `, [parqueaderoId, usuarioId, estado === 'CANCELADA' ? 'CANCELACION_MENSUALIDAD' : 'REACTIVACION_MENSUALIDAD', motivo, id, estado]);
            await connection.commit();
        } catch (error: unknown) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        return this.obtenerClienteActualizado(id, parqueaderoId);
    }

    private async obtenerClienteActualizado(id: number, parqueaderoId: number): Promise<IClienteMensual> {
        const cliente = await this.buscarPorId(id, parqueaderoId);
        if (!cliente) {
            throw new Error('No fue posible recuperar la mensualidad actualizada.');
        }
        return cliente;
    }

    private async registrarAuditoria(connection: PoolConnection, parqueaderoId: number, usuarioId: number, tipoAccion: string, clienteMensualId: number): Promise<void> {
        await connection.execute(`
            INSERT INTO auditoria_eventos (parqueadero_id, usuario_id, tipo_accion, detalles)
            VALUES (?, ?, ?, JSON_OBJECT('clienteMensualId', ?))
        `, [parqueaderoId, usuarioId, tipoAccion, clienteMensualId]);
    }

    async listarPorParqueadero(parqueaderoId: number): Promise<IClienteMensual[]> {
        const query = `
    SELECT id, parqueadero_id, usuario_id, placa, codigo_qr, nombre_propietario, tratamiento,
             telefono_whatsapp, documento_identidad, dia_pago_mensual, fecha_inicio, fecha_vencimiento, estado, creado_en
      FROM clientes_mensuales
      WHERE parqueadero_id = ?
      ORDER BY nombre_propietario ASC
    `;
        const [rows] = await dbPool.execute<ClienteRow[]>(query, [parqueaderoId]);
        return rows.map((fila) => this.mapearCliente(fila));
    }

    async listarAdministrativo(parqueaderoId: number, filtros: IListarMensualidadesDTO): Promise<IPaginaMensualidades> {
        const pagina = Number.isInteger(filtros.pagina) && filtros.pagina > 0 ? filtros.pagina : 1;
        const limite = Number.isInteger(filtros.limite) && filtros.limite > 0 ? Math.min(filtros.limite, 100) : 20;
        const desplazamiento = (pagina - 1) * limite;
        const busqueda = filtros.busqueda?.trim() ?? '';
        const estado = filtros.estado ?? null;
        const condicion = `
            parqueadero_id = ?
            AND (? = '' OR placa LIKE CONCAT('%', ?, '%') OR nombre_propietario LIKE CONCAT('%', ?, '%'))
            AND (? IS NULL OR estado = ?)
        `;
        const [rows] = await dbPool.execute<ClienteRow[]>(`
            SELECT id, parqueadero_id, usuario_id, placa, codigo_qr, nombre_propietario, tratamiento,
                   telefono_whatsapp, documento_identidad, dia_pago_mensual, fecha_inicio, fecha_vencimiento, estado, creado_en
            FROM clientes_mensuales
            WHERE ${condicion}
            ORDER BY fecha_vencimiento ASC, nombre_propietario ASC
            LIMIT ${limite} OFFSET ${desplazamiento}
        `, [parqueaderoId, busqueda, busqueda, busqueda, estado, estado]);
        const [conteoRows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) AS total
            FROM clientes_mensuales
            WHERE ${condicion}
        `, [parqueaderoId, busqueda, busqueda, busqueda, estado, estado]);

        return {
            items: rows.map((row) => this.mapearCliente(row)),
            total: Number(conteoRows[0]?.total ?? 0),
            pagina,
            limite
        };
    }

    async obtenerResumenAdministrativo(parqueaderoId: number): Promise<IResumenMensualidades> {
        const [rows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT
                SUM(estado = 'AL_DIA') AS al_dia,
                SUM(estado = 'POR_VENCER') AS por_vencer,
                SUM(estado = 'VENCIDO') AS vencidas,
                SUM(estado = 'CANCELADA') AS canceladas,
                (
                    SELECT COUNT(*)
                    FROM intenciones_pago_mensualidades
                    WHERE parqueadero_id = ? AND estado = 'PENDIENTE_PAGO_PRESENCIAL'
                ) AS pagos_presenciales_pendientes,
                (
                    SELECT COUNT(*)
                    FROM notificaciones_mensualidades
                    WHERE parqueadero_id = ? AND estado_envio = 'FALLIDO'
                ) AS notificaciones_fallidas
            FROM clientes_mensuales
            WHERE parqueadero_id = ?
        `, [parqueaderoId, parqueaderoId, parqueaderoId]);
        const row = rows[0];
        return {
            alDia: Number(row?.al_dia ?? 0),
            porVencer: Number(row?.por_vencer ?? 0),
            vencidas: Number(row?.vencidas ?? 0),
            canceladas: Number(row?.canceladas ?? 0),
            pagosPresencialesPendientes: Number(row?.pagos_presenciales_pendientes ?? 0),
            notificacionesFallidas: Number(row?.notificaciones_fallidas ?? 0)
        };
    }

    async obtenerReciboPago(pagoId: number, parqueaderoId: number): Promise<IReciboMensualidad | null> {
        const [rows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT pago.id, pago.fecha_pago, pago.monto, pago.metodo_pago, pago.canal,
                   pago.periodo_pagado_inicio, pago.periodo_pagado_fin, pago.turno_caja_id,
                   cliente.placa, cliente.nombre_propietario, cliente.tratamiento, cliente.telefono_whatsapp,
                   parqueadero.nombre_comercial
            FROM pagos_mensualidades pago
            INNER JOIN clientes_mensuales cliente ON cliente.id = pago.cliente_id
            INNER JOIN parqueaderos parqueadero ON parqueadero.id = pago.parqueadero_id
            WHERE pago.id = ? AND pago.parqueadero_id = ?
            LIMIT 1
        `, [pagoId, parqueaderoId]);
        const row = rows[0];
        if (!row) return null;
        return {
            pagoId: row.id,
            fechaPago: new Date(row.fecha_pago),
            monto: Number(row.monto),
            metodoPago: row.metodo_pago,
            canal: row.canal,
            periodoInicio: new Date(row.periodo_pagado_inicio),
            periodoFin: new Date(row.periodo_pagado_fin),
            placa: row.placa,
            nombreCliente: row.nombre_propietario,
            tratamiento: row.tratamiento ?? undefined,
            telefono: row.telefono_whatsapp,
            nombreParqueadero: row.nombre_comercial,
            turnoCajaId: row.turno_caja_id ?? undefined
        };
    }

    async registrarPago(datos: IRegistrarPagoMensualidadDTO): Promise<IPagoMensualidad> {
        const connection = await dbPool.getConnection();
        try {
            return await this.insertarPago(connection, datos);
        } finally {
            connection.release();
        }
    }

    async registrarClienteConPago(datos: ICrearClienteMensualDTO, usuarioId: number, turnoCajaId: number, monto: number, periodo: IPeriodoMensualidad): Promise<IClienteMensual> {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            const queryCliente = `
          INSERT INTO clientes_mensuales (
                    parqueadero_id, usuario_id, placa, codigo_qr, nombre_propietario, tratamiento, telefono_whatsapp,
                documento_identidad, dia_pago_mensual, fecha_inicio, fecha_vencimiento, estado
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AL_DIA')
        `;
            const [result] = await connection.execute<ResultSetHeader>(queryCliente, [
                datos.parqueaderoId,
                usuarioId,
                datos.placa.toUpperCase().trim(),
                uuidv4(),
                datos.nombreCliente.trim(),
                datos.tratamiento,
                datos.telefono ?? '',
                datos.documentoIdentidad ?? null,
                datos.diaPagoMensual ?? periodo.fechaVencimiento.getDate(),
                periodo.fechaInicio,
                periodo.fechaVencimiento
            ]);

            await this.insertarPago(connection, {
                clienteMensualId: result.insertId,
                parqueaderoId: datos.parqueaderoId,
                turnoCajaId,
                monto,
                metodoPago: datos.metodoPagoInicial,
                canal: 'FISICO',
                idempotencyKey: `alta-${result.insertId}`,
                periodoPagadoInicio: periodo.fechaInicio,
                periodoPagadoFin: periodo.fechaVencimiento,
                cicloRenovado: periodo.fechaVencimiento
            });
            await connection.commit();

            const cliente = await this.buscarPorId(result.insertId, datos.parqueaderoId);
            if (!cliente) {
                throw new Error('No fue posible recuperar la mensualidad registrada.');
            }
            return cliente;
        } catch (error: unknown) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async renovarConPago(datos: IRegistrarPagoMensualidadDTO, periodo: IPeriodoMensualidad): Promise<IPagoMensualidad> {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute<RowDataPacket[]>(`
                SELECT id
                FROM clientes_mensuales
                WHERE id = ? AND parqueadero_id = ?
                FOR UPDATE
            `, [datos.clienteMensualId, datos.parqueaderoId]);
            const pagoExistente = await this.buscarPagoPorIdempotencia(connection, datos.idempotencyKey);
            if (pagoExistente) {
                await connection.commit();
                return pagoExistente;
            }
            const pago = await this.insertarPago(connection, datos);
            const queryActualizarCliente = `
          UPDATE clientes_mensuales
          SET fecha_inicio = ?, fecha_vencimiento = ?, estado = 'AL_DIA'
          WHERE id = ? AND parqueadero_id = ?
        `;
            const [result] = await connection.execute<ResultSetHeader>(queryActualizarCliente, [
                periodo.fechaInicio,
                periodo.fechaVencimiento,
                datos.clienteMensualId,
                datos.parqueaderoId
            ]);
            if (result.affectedRows !== 1) {
                throw new Error('No fue posible actualizar la vigencia de la mensualidad.');
            }
            await this.marcarIntencionPagada(connection, datos, pago.id);
            await this.insertarNotificacionRenovada(connection, datos.parqueaderoId, datos.clienteMensualId, periodo.fechaVencimiento);
            await connection.commit();
            return pago;
        } catch (error: unknown) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    private async insertarPago(connection: PoolConnection, datos: IRegistrarPagoMensualidadDTO): Promise<IPagoMensualidad> {
        if (!datos.periodoPagadoInicio || !datos.periodoPagadoFin) {
            throw new TypeError('El período pagado es requerido para registrar una mensualidad.');
        }
        const query = `
        INSERT INTO pagos_mensualidades (
            parqueadero_id, cliente_id, monto, metodo_pago, turno_caja_id, canal, transaccion_id,
            idempotency_key, periodo_pagado_inicio, periodo_pagado_fin, fecha_pago
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
      `;
        const [result] = await connection.execute<ResultSetHeader>(query, [
            datos.parqueaderoId,
            datos.clienteMensualId,
            datos.monto,
            datos.metodoPago,
            datos.turnoCajaId || null,
            datos.canal,
            datos.referenciaExterna ?? null,
            datos.idempotencyKey,
            datos.periodoPagadoInicio,
            datos.periodoPagadoFin
        ]);
        const queryBusqueda = `
          SELECT id, parqueadero_id, cliente_id, monto, metodo_pago,
              transaccion_id, turno_caja_id, periodo_pagado_inicio, periodo_pagado_fin, fecha_pago
      FROM pagos_mensualidades
      WHERE id = ?
      LIMIT 1
    `;
        const [rows] = await connection.execute<PagoRow[]>(queryBusqueda, [result.insertId]);
        if (!rows[0]) {
            throw new Error('No fue posible recuperar el pago de mensualidad registrado.');
        }
        return this.mapearPago(rows[0]!);
    }

    private async buscarPagoPorIdempotencia(connection: PoolConnection, idempotencyKey: string): Promise<IPagoMensualidad | null> {
        const [rows] = await connection.execute<PagoRow[]>(`
            SELECT id, parqueadero_id, cliente_id, monto, metodo_pago,
                   transaccion_id, turno_caja_id, periodo_pagado_inicio, periodo_pagado_fin, fecha_pago
            FROM pagos_mensualidades
            WHERE idempotency_key = ?
            LIMIT 1
        `, [idempotencyKey]);
        return rows[0] ? this.mapearPago(rows[0]) : null;
    }

    private async marcarIntencionPagada(connection: PoolConnection, datos: IRegistrarPagoMensualidadDTO, pagoId: number): Promise<void> {
        if (datos.canal !== 'FISICO' || !datos.cicloRenovado) {
            return;
        }
        await connection.execute(`
            UPDATE intenciones_pago_mensualidades
            SET estado = 'PAGADA', pago_mensualidad_id = ?
            WHERE cliente_id = ? AND fecha_vencimiento_ciclo = ? AND canal = 'WHATSAPP'
              AND estado = 'PENDIENTE_PAGO_PRESENCIAL'
        `, [pagoId, datos.clienteMensualId, datos.cicloRenovado]);
    }

    private async insertarNotificacionRenovada(
        connection: PoolConnection,
        parqueaderoId: number,
        clienteMensualId: number,
        fechaVencimiento: Date
    ): Promise<void> {
        await connection.execute(`
          INSERT IGNORE INTO notificaciones_mensualidades
            (parqueadero_id, cliente_id, fecha_vencimiento_ciclo, tipo)
          VALUES (?, ?, ?, 'RENOVADA')
        `, [parqueaderoId, clienteMensualId, fechaVencimiento]);
    }

    async listarPagosPorCliente(clienteMensualId: number, parqueaderoId: number): Promise<IPagoMensualidad[]> {
        const query = `
          SELECT id, parqueadero_id, cliente_id, monto, metodo_pago,
              transaccion_id, turno_caja_id, periodo_pagado_inicio, periodo_pagado_fin, fecha_pago
      FROM pagos_mensualidades
      WHERE cliente_id = ? AND parqueadero_id = ?
      ORDER BY fecha_pago DESC
    `;
        const [rows] = await dbPool.execute<PagoRow[]>(query, [clienteMensualId, parqueaderoId]);
        return rows.map((fila) => this.mapearPago(fila));
    }

    async calcularRecaudoMensualidadesTurno(turnoId: number): Promise<{ totalEfectivo: number; totalOtros: number }> {
        const query = `
      SELECT 
        SUM(CASE WHEN metodo_pago = 'EFECTIVO' THEN monto ELSE 0 END) AS totalEfectivo,
        SUM(CASE WHEN metodo_pago != 'EFECTIVO' THEN monto ELSE 0 END) AS totalOtros
      FROM pagos_mensualidades
      WHERE turno_caja_id = ?
    `;
        const [rows] = await dbPool.execute<RowDataPacket[]>(query, [turnoId]);
        const fila = rows[0];

        return {
            totalEfectivo: Number(fila?.totalEfectivo ?? 0),
            totalOtros: Number(fila?.totalOtros ?? 0)
        };
    }

    private mapearCliente(fila: ClienteRow): IClienteMensual {
        return {
            id: fila.id,
            parqueaderoId: fila.parqueadero_id,
            placa: fila.placa,
            codigoQr: fila.codigo_qr ?? undefined,
            nombreCliente: fila.nombre_propietario,
            tratamiento: fila.tratamiento ?? undefined,
            telefono: fila.telefono_whatsapp,
            documentoIdentidad: fila.documento_identidad ?? undefined,
            fechaInicioContrato: new Date(fila.fecha_inicio),
            fechaVencimiento: new Date(fila.fecha_vencimiento),
            diaPagoMensual: fila.dia_pago_mensual,
            activo: fila.estado !== 'VENCIDO' && fila.estado !== 'CANCELADA',
            estado: fila.estado,
            creadoEn: new Date(fila.creado_en)
        };
    }

    private mapearPago(fila: PagoRow): IPagoMensualidad {
        return {
            id: fila.id,
            clienteMensualId: fila.cliente_id,
            parqueaderoId: fila.parqueadero_id,
            turnoCajaId: fila.turno_caja_id ?? undefined,
            monto: Number(fila.monto),
            metodoPago: fila.metodo_pago,
            periodoPagadoInicio: new Date(fila.periodo_pagado_inicio),
            periodoPagadoFin: new Date(fila.periodo_pagado_fin),
            fechaPago: new Date(fila.fecha_pago)
        };
    }
}