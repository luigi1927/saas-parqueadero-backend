import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { dbPool } from '../database/mysql.config.js';
import type { IPlanParqueaderoAcceso, IPlanSaasRepository } from '../../domain/repositories/IPlanSaasRepository.js';
import type { GemaPlanSaas, IActualizarPlanSaasDTO, ICrearPlanSaasDTO, IPlanSaas } from '../../domain/types/planSaas.types.js';

interface PlanSaasRow extends RowDataPacket {
    id: number;
    nombre: string;
    gema: GemaPlanSaas;
    precio_mensual: number;
    limite_motos: number;
    soporta_whatsapp: number;
    soporta_pagos_digitales: number;
    soporta_ver_reportes: number;
    soporta_descargar_reportes: number;
    recordatorios_whatsapp: number;
}

interface PlanParqueaderoRow extends PlanSaasRow {
    estado_parqueadero: 'PRUEBA_GRATUITA' | 'ACTIVO' | 'VENCIDO' | 'SUSPENDIDO';
    suscripcion_id: number | null;
    suscripcion_estado_pago: 'APROBADO' | 'PENDIENTE' | 'RECHAZADO' | null;
    suscripcion_fecha_vencimiento: string | Date | null;
    suscripcion_vigente: number;
}

export class MySQLPlanSaasRepository implements IPlanSaasRepository {
    private readonly columnas = 'id, nombre, gema, precio_mensual, limite_motos, soporta_whatsapp, soporta_pagos_digitales, soporta_ver_reportes, soporta_descargar_reportes, recordatorios_whatsapp';

    async listar(): Promise<IPlanSaas[]> {
        const [rows] = await dbPool.execute<PlanSaasRow[]>(`
            SELECT ${this.columnas}
            FROM planes_saas
            ORDER BY FIELD(gema, 'BRONCE', 'PLATA', 'ORO', 'DIAMANTE') ASC, precio_mensual ASC
        `);
        return rows.map((row) => this.mapear(row));
    }

    async crear(datos: ICrearPlanSaasDTO, gema: GemaPlanSaas): Promise<IPlanSaas> {
        const [result] = await dbPool.execute<ResultSetHeader>(`
            INSERT INTO planes_saas (nombre, gema, precio_mensual, limite_motos, soporta_whatsapp, soporta_pagos_digitales, soporta_ver_reportes, soporta_descargar_reportes, recordatorios_whatsapp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [datos.nombre.trim(), gema, datos.precioMensual, datos.limiteMotos, datos.soportaWhatsapp ? 1 : 0, datos.soportaPagosDigitales ? 1 : 0, datos.soportaVerReportes ? 1 : 0, datos.soportaDescargarReportes ? 1 : 0, datos.recordatoriosWhatsapp ? 1 : 0]);
        return this.obtenerPorId(result.insertId);
    }

    async actualizar(id: number, datos: IActualizarPlanSaasDTO, gema: GemaPlanSaas): Promise<IPlanSaas> {
        const [result] = await dbPool.execute<ResultSetHeader>(`
            UPDATE planes_saas
            SET nombre = ?, gema = ?, precio_mensual = ?, limite_motos = ?, soporta_whatsapp = ?, soporta_pagos_digitales = ?, soporta_ver_reportes = ?, soporta_descargar_reportes = ?, recordatorios_whatsapp = ?
            WHERE id = ?
        `, [datos.nombre.trim(), gema, datos.precioMensual, datos.limiteMotos, datos.soportaWhatsapp ? 1 : 0, datos.soportaPagosDigitales ? 1 : 0, datos.soportaVerReportes ? 1 : 0, datos.soportaDescargarReportes ? 1 : 0, datos.recordatoriosWhatsapp ? 1 : 0, id]);
        if (result.affectedRows !== 1) throw new Error('El plan no existe.');
        return this.obtenerPorId(id);
    }

    async eliminar(id: number): Promise<void> {
        try {
            const [result] = await dbPool.execute<ResultSetHeader>(`DELETE FROM planes_saas WHERE id = ?`, [id]);
            if (result.affectedRows !== 1) throw new Error('El plan no existe.');
        } catch (error: unknown) {
            const code = (error as { code?: string }).code;
            if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_ROW_IS_REFERENCED') {
                throw new Error('El plan no puede eliminarse porque está asociado a una suscripción activa o histórica.');
            }
            throw error;
        }
    }

    async obtenerVigenteYEstado(parqueaderoId: number): Promise<IPlanParqueaderoAcceso> {
        const [rows] = await dbPool.execute<PlanParqueaderoRow[]>(`
            SELECT parqueadero.estado AS estado_parqueadero,
                   suscripcion.id AS suscripcion_id,
                   suscripcion.estado_pago AS suscripcion_estado_pago,
                   suscripcion.fecha_vencimiento AS suscripcion_fecha_vencimiento,
                   -- La suscripcion es vigente durante todo el dia de su fecha_vencimiento (dia inclusivo),
                   -- coherente con requireParqueaderoOperativo y el filtro de recordatorios (CURDATE()).
                   CASE WHEN suscripcion.estado_pago = 'APROBADO'
                         AND DATE(suscripcion.fecha_vencimiento) >= CURDATE()
                        THEN 1 ELSE 0 END AS suscripcion_vigente,
                   plan.id, plan.nombre, plan.gema, plan.precio_mensual, plan.limite_motos,
                   plan.soporta_whatsapp, plan.soporta_pagos_digitales, plan.soporta_ver_reportes,
                   plan.soporta_descargar_reportes, plan.recordatorios_whatsapp
            FROM parqueaderos parqueadero
            LEFT JOIN suscripciones_parqueadero suscripcion
                ON suscripcion.parqueadero_id = parqueadero.id
               AND suscripcion.id = (
                   -- El plan vigente es el de la suscripción PAGADA más reciente.
                   -- Una suscripción PENDIENTE (pago por confirmar) NO desbloquea ni degrada
                   -- las funciones ya pagadas: se usa el último pago confirmado vigente.
                   SELECT MAX(ultima.id)
                   FROM suscripciones_parqueadero ultima
                   WHERE ultima.parqueadero_id = parqueadero.id
                     AND ultima.estado_pago = 'APROBADO'
                     AND DATE(ultima.fecha_vencimiento) >= CURDATE()
               )
            LEFT JOIN planes_saas plan ON plan.id = suscripcion.plan_id
            WHERE parqueadero.id = ?
            LIMIT 1
        `, [parqueaderoId]);

        const row = rows[0];
        if (!row || !row.id) {
            return { estadoParqueadero: row?.estado_parqueadero ?? null, plan: null };
        }

        return {
            estadoParqueadero: row.estado_parqueadero,
            plan: row.suscripcion_vigente === 1 ? this.mapear(row) : null
        };
    }

    private async obtenerPorId(id: number): Promise<IPlanSaas> {
        const [rows] = await dbPool.execute<PlanSaasRow[]>(`
            SELECT ${this.columnas}
            FROM planes_saas WHERE id = ? LIMIT 1
        `, [id]);
        const row = rows[0];
        if (!row) throw new Error('No fue posible recuperar el plan.');
        return this.mapear(row);
    }

    private mapear(row: PlanSaasRow): IPlanSaas {
        return {
            id: row.id,
            nombre: row.nombre,
            gema: row.gema,
            precioMensual: Number(row.precio_mensual),
            limiteMotos: row.limite_motos,
            soportaWhatsapp: row.soporta_whatsapp === 1,
            soportaPagosDigitales: row.soporta_pagos_digitales === 1,
            soportaVerReportes: row.soporta_ver_reportes === 1,
            soportaDescargarReportes: row.soporta_descargar_reportes === 1,
            recordatoriosWhatsapp: row.recordatorios_whatsapp === 1
        };
    }
}