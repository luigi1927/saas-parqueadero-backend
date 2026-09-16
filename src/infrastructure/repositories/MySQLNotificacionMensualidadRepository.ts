import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { dbPool } from '../database/mysql.config.js';
import type { INotificacionMensualidadRepository } from '../../domain/repositories/INotificacionMensualidadRepository.js';
import type { INotificacionMensualidadPendiente, TipoNotificacionMensualidad, TratamientoCliente } from '../../domain/types/clienteMensual.types.js';

interface NotificacionMensualidadRow extends RowDataPacket {
    id: number;
    cliente_id: number;
    parqueadero_id: number;
    nombre_propietario: string;
    tratamiento: TratamientoCliente | null;
    telefono_whatsapp: string;
    placa: string;
    nombre_comercial: string;
    fecha_vencimiento_ciclo: Date;
    tipo: TipoNotificacionMensualidad;
}

export class MySQLNotificacionMensualidadRepository implements INotificacionMensualidadRepository {
    async crearNotificacionesDelDia(): Promise<void> {
        await dbPool.execute(`
            UPDATE clientes_mensuales cliente
            LEFT JOIN configuracion_mensualidades configuracion
                ON configuracion.parqueadero_id = cliente.parqueadero_id
            SET estado = CASE
                WHEN CURDATE() > cliente.fecha_vencimiento THEN 'VENCIDO'
                WHEN DATEDIFF(cliente.fecha_vencimiento, CURDATE()) BETWEEN 1 AND COALESCE(configuracion.dias_aviso_previo, 3) THEN 'POR_VENCER'
                ELSE 'AL_DIA'
            END
            WHERE cliente.estado != 'CANCELADA'
        `);

        await dbPool.execute(`
            UPDATE intenciones_pago_mensualidades
            SET estado = 'EXPIRADA'
            WHERE estado = 'PENDIENTE_PAGO_PRESENCIAL'
              AND fecha_expiracion < NOW()
        `);

        await dbPool.execute(`
                        UPDATE notificaciones_mensualidades
                        SET estado_envio = 'FALLIDO', ultimo_error = 'El envío anterior quedó interrumpido.', bloqueado_en = NULL
                        WHERE estado_envio = 'PROCESANDO'
                            AND bloqueado_en < DATE_SUB(NOW(), INTERVAL 10 MINUTE)
                `);

        await dbPool.execute(`
            INSERT IGNORE INTO notificaciones_mensualidades (parqueadero_id, cliente_id, fecha_vencimiento_ciclo, tipo)
            SELECT cliente.parqueadero_id, cliente.id, cliente.fecha_vencimiento,
                CASE DATEDIFF(cliente.fecha_vencimiento, CURDATE())
                    WHEN 3 THEN 'POR_VENCER_3_DIAS'
                    WHEN 2 THEN 'POR_VENCER_2_DIAS'
                    WHEN 1 THEN 'POR_VENCER_1_DIA'
                END
                        FROM clientes_mensuales cliente
                        LEFT JOIN configuracion_mensualidades configuracion
                                ON configuracion.parqueadero_id = cliente.parqueadero_id
                        WHERE DATEDIFF(cliente.fecha_vencimiento, CURDATE()) BETWEEN 1 AND COALESCE(configuracion.dias_aviso_previo, 3)
                            AND cliente.estado != 'CANCELADA'
                            AND COALESCE(configuracion.whatsapp_habilitado, TRUE) = TRUE
                            AND CURTIME() >= COALESCE(configuracion.hora_envio_whatsapp, '09:00:00')
                            AND ${this.planHabilitaRecordatorios('cliente.parqueadero_id')}
        `);

        await dbPool.execute(`
            INSERT IGNORE INTO notificaciones_mensualidades (parqueadero_id, cliente_id, fecha_vencimiento_ciclo, tipo)
            SELECT cliente.parqueadero_id, cliente.id, cliente.fecha_vencimiento,
                CASE DATEDIFF(CURDATE(), cliente.fecha_vencimiento)
                    WHEN 1 THEN 'VENCIDA_DIA_1'
                    WHEN 2 THEN 'VENCIDA_DIA_2'
                    WHEN 3 THEN 'VENCIDA_DIA_3'
                    WHEN 4 THEN 'VENCIDA_DIA_4'
                    WHEN 5 THEN 'VENCIDA_DIA_5'
                END
            FROM clientes_mensuales cliente
                        LEFT JOIN configuracion_mensualidades configuracion
                                ON configuracion.parqueadero_id = cliente.parqueadero_id
                        WHERE DATEDIFF(CURDATE(), cliente.fecha_vencimiento) BETWEEN 1 AND COALESCE(configuracion.dias_aviso_vencido, 5)
                            AND cliente.estado != 'CANCELADA'
                            AND COALESCE(configuracion.whatsapp_habilitado, TRUE) = TRUE
                            AND CURTIME() >= COALESCE(configuracion.hora_envio_whatsapp, '09:00:00')
                            AND ${this.planHabilitaRecordatorios('cliente.parqueadero_id')}
              AND NOT EXISTS (
                  SELECT 1
                  FROM intenciones_pago_mensualidades intencion
                  WHERE intencion.cliente_id = cliente.id
                    AND intencion.fecha_vencimiento_ciclo = cliente.fecha_vencimiento
                    AND intencion.estado = 'RECHAZADA'
              )
        `);
    }

    async obtenerPendientes(limite: number): Promise<INotificacionMensualidadPendiente[]> {
        if (!Number.isInteger(limite) || limite <= 0) {
            throw new TypeError('El límite de notificaciones debe ser un entero positivo.');
        }
        const limiteSeguro = Math.min(limite, 100);
        const [rows] = await dbPool.execute<NotificacionMensualidadRow[]>(`
            SELECT notificacion.id, notificacion.cliente_id, notificacion.parqueadero_id,
                   cliente.nombre_propietario, cliente.tratamiento, cliente.telefono_whatsapp, cliente.placa, parqueadero.nombre_comercial,
                   notificacion.fecha_vencimiento_ciclo, notificacion.tipo
            FROM notificaciones_mensualidades notificacion
            INNER JOIN clientes_mensuales cliente ON cliente.id = notificacion.cliente_id
            INNER JOIN parqueaderos parqueadero ON parqueadero.id = notificacion.parqueadero_id
                        LEFT JOIN configuracion_mensualidades configuracion
                                ON configuracion.parqueadero_id = notificacion.parqueadero_id
            WHERE notificacion.estado_envio IN ('PENDIENTE', 'FALLIDO')
              AND notificacion.intentos < 5
                            AND cliente.estado != 'CANCELADA'
                                                        AND notificacion.fecha_vencimiento_ciclo = cliente.fecha_vencimiento
                            AND COALESCE(configuracion.whatsapp_habilitado, TRUE) = TRUE
                            AND CURTIME() >= COALESCE(configuracion.hora_envio_whatsapp, '09:00:00')
                            AND ${this.planHabilitaRecordatorios('notificacion.parqueadero_id')}
            ORDER BY notificacion.creado_en ASC
                        LIMIT ${limiteSeguro}
                `);

        return rows.map((row) => ({
            id: row.id,
            clienteMensualId: row.cliente_id,
            parqueaderoId: row.parqueadero_id,
            nombreCliente: row.nombre_propietario,
            tratamiento: row.tratamiento ?? undefined,
            telefono: row.telefono_whatsapp,
            placa: row.placa,
            nombreParqueadero: row.nombre_comercial,
            fechaVencimiento: new Date(row.fecha_vencimiento_ciclo),
            tipo: row.tipo
        }));
    }

    async reclamarParaEnvio(notificacionId: number): Promise<boolean> {
        const [result] = await dbPool.execute<ResultSetHeader>(`
            UPDATE notificaciones_mensualidades
            SET estado_envio = 'PROCESANDO', bloqueado_en = NOW()
            WHERE id = ? AND estado_envio IN ('PENDIENTE', 'FALLIDO') AND intentos < 5
        `, [notificacionId]);
        return result.affectedRows === 1;
    }

    async registrarEnvioExitoso(notificacionId: number): Promise<void> {
        await dbPool.execute<ResultSetHeader>(`
            UPDATE notificaciones_mensualidades
            SET estado_envio = 'ENVIADO', intentos = intentos + 1, enviado_en = NOW(), ultimo_error = NULL
            WHERE id = ? AND estado_envio = 'PROCESANDO'
        `, [notificacionId]);
    }

    async registrarFalloEnvio(notificacionId: number, mensajeError: string): Promise<void> {
        await dbPool.execute<ResultSetHeader>(`
            UPDATE notificaciones_mensualidades
            SET estado_envio = 'FALLIDO', intentos = intentos + 1, ultimo_error = ?
            WHERE id = ? AND estado_envio = 'PROCESANDO'
        `, [mensajeError.slice(0, 500), notificacionId]);
    }

    async reintentarFallo(notificacionId: number, parqueaderoId: number): Promise<boolean> {
        const [result] = await dbPool.execute<ResultSetHeader>(`
            UPDATE notificaciones_mensualidades
            SET estado_envio = 'PENDIENTE', bloqueado_en = NULL, ultimo_error = NULL
            WHERE id = ? AND parqueadero_id = ? AND estado_envio = 'FALLIDO'
        `, [notificacionId, parqueaderoId]);
        return result.affectedRows === 1;
    }

    private planHabilitaRecordatorios(columnaParqueaderoId: string): string {
        return `
            (
                EXISTS (
                    SELECT 1
                    FROM suscripciones_parqueadero suscripcion_plan
                    INNER JOIN planes_saas plan_activo ON plan_activo.id = suscripcion_plan.plan_id
                    WHERE suscripcion_plan.parqueadero_id = ${columnaParqueaderoId}
                      AND suscripcion_plan.id = (
                          SELECT MAX(suscripcion_ultima.id)
                          FROM suscripciones_parqueadero suscripcion_ultima
                          WHERE suscripcion_ultima.parqueadero_id = ${columnaParqueaderoId}
                      )
                      AND suscripcion_plan.estado_pago = 'APROBADO'
                      AND suscripcion_plan.fecha_vencimiento >= CURDATE()
                      AND plan_activo.recordatorios_whatsapp = 1
                )
                OR EXISTS (
                    SELECT 1
                    FROM parqueaderos parqueadero_prueba
                    WHERE parqueadero_prueba.id = ${columnaParqueaderoId}
                      AND parqueadero_prueba.estado = 'PRUEBA_GRATUITA'
                      AND parqueadero_prueba.fecha_fin_prueba >= CURDATE()
                )
            )
        `;
    }
}