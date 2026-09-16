import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { dbPool } from '../database/mysql.config.js';
import type { IParqueaderoRepository } from '../../domain/repositories/IParqueaderoRepository.js';
import type { IParqueaderoAdministrativo, IParqueaderoDetalle, IParqueaderoRegistrado, IRegistrarParqueaderoDTO, IRenovarSuscripcionParqueaderoDTO } from '../../domain/types/parqueadero.types.js';
import type { IActualizarParqueaderoPropioDTO, ISuscripcionMembresia } from '../../domain/types/miPerfil.types.js';

interface PlanRow extends RowDataPacket {
    id: number;
    precio_mensual: number;
}

interface RolRow extends RowDataPacket {
    id: number;
}

export class MySQLParqueaderoRepository implements IParqueaderoRepository {
    async actualizarEstadosPorSuscripcion(): Promise<void> {
        await dbPool.execute(`
            UPDATE parqueaderos parqueadero
            LEFT JOIN suscripciones_parqueadero suscripcion
                ON suscripcion.id = (
                    SELECT ultima.id
                    FROM suscripciones_parqueadero ultima
                    WHERE ultima.parqueadero_id = parqueadero.id
                      AND ultima.estado_pago = 'APROBADO'
                    ORDER BY ultima.fecha_vencimiento DESC, ultima.id DESC
                    LIMIT 1
                )
            SET parqueadero.estado = 'VENCIDO'
                        WHERE (parqueadero.estado = 'ACTIVO'
                            AND (suscripcion.id IS NULL OR suscripcion.fecha_vencimiento < CURDATE()))
                             OR (parqueadero.estado = 'PRUEBA_GRATUITA'
                            AND parqueadero.fecha_fin_prueba < CURDATE())
        `);
    }

    async cambiarEstado(parqueaderoId: number, estado: 'ACTIVO' | 'SUSPENDIDO', usuarioId: number, motivo: string): Promise<void> {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.execute<ResultSetHeader>(`
                UPDATE parqueaderos SET estado = ? WHERE id = ?
            `, [estado, parqueaderoId]);
            if (result.affectedRows !== 1) throw new Error('El parqueadero no existe.');
            await this.registrarAuditoria(connection, parqueaderoId, usuarioId, `${estado}_PARQUEADERO`, motivo);
            await connection.commit();
        } catch (error: unknown) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async renovarSuscripcion(parqueaderoId: number, usuarioId: number, datos: IRenovarSuscripcionParqueaderoDTO, estadoPagoInicial: 'APROBADO' | 'PENDIENTE' = 'APROBADO'): Promise<number> {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            const [existentes] = await connection.execute<RowDataPacket[]>(`
                SELECT id FROM suscripciones_parqueadero WHERE transaccion_id = ? LIMIT 1
            `, [datos.transaccionId]);
            if (existentes[0]) {
                await connection.commit();
                return existentes[0].id as number;
            }
            const plan = await this.obtenerPlan(connection, datos.planId);
            const [parqueaderos] = await connection.execute<RowDataPacket[]>(`
                SELECT id FROM parqueaderos WHERE id = ? FOR UPDATE
            `, [parqueaderoId]);
            if (!parqueaderos[0]) throw new Error('El parqueadero no existe.');
            const [ultimas] = await connection.execute<RowDataPacket[]>(`
                SELECT fecha_vencimiento FROM suscripciones_parqueadero
                WHERE parqueadero_id = ? ORDER BY fecha_vencimiento DESC, id DESC LIMIT 1
            `, [parqueaderoId]);
            const fechaInicio = ultimas[0]?.fecha_vencimiento ?? new Date();
            const [suscripcion] = await connection.execute<ResultSetHeader>(`
                INSERT INTO suscripciones_parqueadero (
                    parqueadero_id, plan_id, fecha_inicio, fecha_vencimiento, monto_pagado,
                    metodo_pago, transaccion_id, estado_pago
                ) VALUES (?, ?, GREATEST(DATE(?), CURDATE()), DATE_ADD(GREATEST(DATE(?), CURDATE()), INTERVAL 1 MONTH), ?, ?, ?, ?)
            `, [parqueaderoId, plan.id, fechaInicio, fechaInicio, plan.precio_mensual, datos.metodoPago, datos.transaccionId.trim(), estadoPagoInicial]);
            if (estadoPagoInicial === 'APROBADO') {
                await connection.execute(`UPDATE parqueaderos SET estado = 'ACTIVO' WHERE id = ?`, [parqueaderoId]);
            }
            await this.registrarAuditoria(connection, parqueaderoId, usuarioId, 'RENOVACION_SUSCRIPCION_SAAS', `Suscripción ${suscripcion.insertId} (${estadoPagoInicial})`);
            await connection.commit();
            return suscripcion.insertId;
        } catch (error: unknown) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async listarAdministrativos(): Promise<IParqueaderoAdministrativo[]> {
        const [rows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT parqueadero.id, parqueadero.nombre_comercial, parqueadero.nit_documento,
                   parqueadero.ciudad, parqueadero.estado, plan.nombre AS plan_nombre,
                   suscripcion.fecha_vencimiento, suscripcion.estado_pago
            FROM parqueaderos parqueadero
            LEFT JOIN suscripciones_parqueadero suscripcion
                ON suscripcion.id = (
                    SELECT ultima.id
                    FROM suscripciones_parqueadero ultima
                    WHERE ultima.parqueadero_id = parqueadero.id
                    ORDER BY ultima.fecha_vencimiento DESC, ultima.id DESC
                    LIMIT 1
                )
            LEFT JOIN planes_saas plan ON plan.id = suscripcion.plan_id
            ORDER BY parqueadero.nombre_comercial ASC
        `);
        return rows.map((row) => ({
            id: row.id,
            nombreComercial: row.nombre_comercial,
            nitDocumento: row.nit_documento,
            ciudad: row.ciudad,
            estado: row.estado,
            planNombre: row.plan_nombre ?? undefined,
            suscripcionVence: row.fecha_vencimiento ? new Date(row.fecha_vencimiento) : undefined,
            estadoPago: row.estado_pago ?? undefined
        }));
    }

    async obtenerDetalle(parqueaderoId: number): Promise<IParqueaderoDetalle | null> {
        const [rows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT parqueadero.id, parqueadero.nombre_comercial, parqueadero.nit_documento,
                   parqueadero.ciudad, parqueadero.direccion, parqueadero.telefono_contacto,
                   parqueadero.fecha_fin_prueba, parqueadero.estado, parqueadero.creado_en,
                   administrador.id AS administrador_id, administrador.nombre AS administrador_nombre,
                   administrador.documento_id AS administrador_documento,
                   administrador.telefono AS administrador_telefono, administrador.email AS administrador_email,
                   administrador.estado AS administrador_estado,
                   suscripcion.id AS suscripcion_id, suscripcion.plan_id, plan.nombre AS plan_nombre,
                   suscripcion.fecha_inicio, suscripcion.fecha_vencimiento, suscripcion.monto_pagado,
                   suscripcion.metodo_pago, suscripcion.transaccion_id, suscripcion.estado_pago
            FROM parqueaderos parqueadero
            LEFT JOIN usuarios administrador
                ON administrador.id = (
                    SELECT usuario.id
                    FROM usuarios usuario
                    INNER JOIN roles rol ON rol.id = usuario.rol_id
                    WHERE usuario.parqueadero_id = parqueadero.id
                      AND rol.nombre = 'ADMIN_PARQUEADERO'
                    ORDER BY usuario.id ASC
                    LIMIT 1
                )
            LEFT JOIN suscripciones_parqueadero suscripcion
                ON suscripcion.id = (
                    SELECT ultima.id
                    FROM suscripciones_parqueadero ultima
                    WHERE ultima.parqueadero_id = parqueadero.id
                    ORDER BY ultima.fecha_vencimiento DESC, ultima.id DESC
                    LIMIT 1
                )
            LEFT JOIN planes_saas plan ON plan.id = suscripcion.plan_id
            WHERE parqueadero.id = ?
            LIMIT 1
        `, [parqueaderoId]);
        const row = rows[0];
        if (!row) return null;
        return {
            id: row.id,
            nombreComercial: row.nombre_comercial,
            nitDocumento: row.nit_documento,
            ciudad: row.ciudad,
            estado: row.estado,
            direccion: row.direccion,
            telefonoContacto: row.telefono_contacto,
            fechaFinPrueba: row.fecha_fin_prueba ? new Date(row.fecha_fin_prueba) : undefined,
            creadoEn: row.creado_en ? new Date(row.creado_en) : undefined,
            planNombre: row.plan_nombre ?? undefined,
            suscripcionVence: row.fecha_vencimiento ? new Date(row.fecha_vencimiento) : undefined,
            estadoPago: row.estado_pago ?? undefined,
            administrador: row.administrador_id ? {
                id: row.administrador_id,
                nombre: row.administrador_nombre,
                documentoId: row.administrador_documento,
                telefono: row.administrador_telefono,
                email: row.administrador_email ?? undefined,
                estado: row.administrador_estado
            } : undefined,
            suscripcion: row.suscripcion_id ? {
                id: row.suscripcion_id,
                planId: row.plan_id,
                planNombre: row.plan_nombre,
                fechaInicio: new Date(row.fecha_inicio),
                fechaVencimiento: new Date(row.fecha_vencimiento),
                montoPagado: Number(row.monto_pagado),
                metodoPago: row.metodo_pago,
                transaccionId: row.transaccion_id,
                estadoPago: row.estado_pago
            } : undefined
        };
    }

    async actualizarDatosPropios(parqueaderoId: number, datos: IActualizarParqueaderoPropioDTO): Promise<void> {
        const [result] = await dbPool.execute<ResultSetHeader>(`
            UPDATE parqueaderos
            SET nombre_comercial = ?, ciudad = ?, direccion = ?, telefono_contacto = ?
            WHERE id = ?
        `, [datos.nombreComercial, datos.ciudad, datos.direccion, datos.telefonoContacto, parqueaderoId]);
        if (result.affectedRows !== 1) throw new Error('El parqueadero no existe.');
    }

    async listarSuscripciones(parqueaderoId: number): Promise<ISuscripcionMembresia[]> {
        const [rows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT suscripcion.id, suscripcion.plan_id, plan.nombre AS plan_nombre,
                   suscripcion.fecha_inicio, suscripcion.fecha_vencimiento, suscripcion.monto_pagado,
                   suscripcion.metodo_pago, suscripcion.transaccion_id, suscripcion.estado_pago
            FROM suscripciones_parqueadero suscripcion
            INNER JOIN planes_saas plan ON plan.id = suscripcion.plan_id
            WHERE suscripcion.parqueadero_id = ?
            ORDER BY suscripcion.fecha_vencimiento DESC, suscripcion.id DESC
        `, [parqueaderoId]);
        return rows.map((row) => ({
            id: row.id,
            planId: row.plan_id,
            planNombre: row.plan_nombre,
            fechaInicio: new Date(row.fecha_inicio),
            fechaVencimiento: new Date(row.fecha_vencimiento),
            montoPagado: Number(row.monto_pagado),
            metodoPago: row.metodo_pago,
            transaccionId: row.transaccion_id,
            estadoPago: row.estado_pago
        }));
    }

    async confirmarSuscripcion(parqueaderoId: number, suscripcionId: number, usuarioId: number): Promise<number> {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            const [result] = await connection.execute<ResultSetHeader>(`
                UPDATE suscripciones_parqueadero
                SET estado_pago = 'APROBADO'
                WHERE id = ? AND parqueadero_id = ? AND estado_pago = 'PENDIENTE'
            `, [suscripcionId, parqueaderoId]);
            if (result.affectedRows !== 1) {
                await connection.rollback();
                throw new Error('La suscripción no existe o ya fue confirmada.');
            }
            await connection.execute(`UPDATE parqueaderos SET estado = 'ACTIVO' WHERE id = ?`, [parqueaderoId]);
            await this.registrarAuditoria(connection, parqueaderoId, usuarioId, 'CONFIRMACION_SUSCRIPCION_SAAS', `Suscripción ${suscripcionId} confirmada`);
            await connection.commit();
            return suscripcionId;
        } catch (error: unknown) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async registrarConConfiguracion(datos: IRegistrarParqueaderoDTO): Promise<IParqueaderoRegistrado> {
        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            const plan = await this.obtenerPlan(connection, datos.planId);
            const rolAdministrador = await this.obtenerRolAdministrador(connection);
            const [parqueadero] = await connection.execute<ResultSetHeader>(`
                INSERT INTO parqueaderos (nombre_comercial, nit_documento, ciudad, direccion, telefono_contacto, fecha_fin_prueba, estado)
                VALUES (?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'PRUEBA_GRATUITA')
            `, [datos.nombreComercial.trim(), datos.nitDocumento.trim(), datos.ciudad.trim(), datos.direccion.trim(), datos.telefonoContacto.trim()]);
            const parqueaderoId = parqueadero.insertId;

            await connection.execute(`INSERT INTO branding_parqueaderos (parqueadero_id) VALUES (?)`, [parqueaderoId]);
            await connection.execute(`INSERT INTO configuracion_mensualidades (parqueadero_id) VALUES (?)`, [parqueaderoId]);
            await connection.execute(`INSERT INTO tarifas (parqueadero_id) VALUES (?)`, [parqueaderoId]);
            const [administrador] = await connection.execute<ResultSetHeader>(`
                INSERT INTO usuarios (parqueadero_id, rol_id, nombre, documento_id, telefono, email, pin_hash, estado)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVO')
            `, [parqueaderoId, rolAdministrador.id, datos.nombreAdministrador.trim(), datos.documentoAdministrador.trim(), datos.telefonoAdministrador.trim(), datos.emailAdministrador?.trim() ?? null, datos.pinAdministradorHash]);
            const [suscripcion] = await connection.execute<ResultSetHeader>(`
                INSERT INTO suscripciones_parqueadero (
                    parqueadero_id, plan_id, fecha_inicio, fecha_vencimiento, monto_pagado,
                    metodo_pago, transaccion_id, estado_pago
                ) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, 'TRANSFERENCIA', ?, 'PENDIENTE')
            `, [parqueaderoId, plan.id, plan.precio_mensual, `REGISTRO-${parqueaderoId}`]);
            await connection.commit();
            return { parqueaderoId, administradorId: administrador.insertId, suscripcionId: suscripcion.insertId };
        } catch (error: unknown) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    private async obtenerPlan(connection: PoolConnection, planId: number): Promise<PlanRow> {
        const [rows] = await connection.execute<PlanRow[]>(`SELECT id, precio_mensual FROM planes_saas WHERE id = ? LIMIT 1`, [planId]);
        if (!rows[0]) throw new Error('El plan seleccionado no existe.');
        return rows[0];
    }

    private async obtenerRolAdministrador(connection: PoolConnection): Promise<RolRow> {
        const [rows] = await connection.execute<RolRow[]>(`SELECT id FROM roles WHERE nombre = 'ADMIN_PARQUEADERO' LIMIT 1`);
        if (!rows[0]) throw new Error('No existe el rol ADMIN_PARQUEADERO.');
        return rows[0];
    }

    private async registrarAuditoria(connection: PoolConnection, parqueaderoId: number, usuarioId: number, tipoAccion: string, motivo: string): Promise<void> {
        await connection.execute(`
            INSERT INTO auditoria_eventos (parqueadero_id, usuario_id, tipo_accion, motivo)
            VALUES (?, ?, ?, ?)
        `, [parqueaderoId, usuarioId, tipoAccion, motivo]);
    }
}