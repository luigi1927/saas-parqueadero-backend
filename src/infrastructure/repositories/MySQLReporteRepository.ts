import type { RowDataPacket } from 'mysql2';
import { dbPool } from '../database/mysql.config.js';
import type { IReporteRepository } from '../../domain/repositories/IReporteRepository.js';
import type {
    IRecaudoPorMetodo,
    IReporteRecaudo,
    IReporteRecaudoDTO,
    IRangoFechas,
    IReporteCuadreCaja,
    ICuadreTurno,
    IReporteEgresos,
    IMontosPorMotivo,
    IMontosPorTurno,
    IReporteOcupacion,
    IEntradasPorHora,
    IEntradasPorDia,
    IReporteMora,
    IMensualidadMora,
    IReporteRecaudoMensualidades,
    IRecaudoMensualidadPorMetodo,
    IRecaudoMensualidadMes,
    IReporteDesercion,
    IReporteAnulaciones,
    ITicketAnulado,
    IReporteActividadOperarios,
    IActividadOperario,
    IAccionAuditoria,
    IReporteRentabilidad,
    IRentabilidadParqueadero,
    IReporteSuscripciones,
    IReporteUsoPlataforma,
    IUsoPlataformaParqueadero,
    IMoraFiltros,
} from '../../domain/types/reporte.types.js';

interface RecaudoRow extends RowDataPacket {
    metodo_pago: IRecaudoPorMetodo['metodoPago'];
    total_ocasional: number;
    total_mensualidad: number;
}

interface RecaudoDiaRow extends RowDataPacket {
    dia: string;
    total_ocasional: number;
    total_mensualidad: number;
}

interface CuadreTurnoRow extends RowDataPacket {
    turnoId: number;
    cajero: string;
    fechaApertura: string;
    fechaCierre: string | null;
    montoInicial: number;
    ingresosOcasionales: number;
    ingresosMensualidades: number;
    egresos: number;
    declarado: number | null;
    estadoTurno: string;
}

interface MotivoRow extends RowDataPacket {
    motivo: string;
    cantidad: number;
    total: number;
}

interface PorTurnoRow extends RowDataPacket {
    turnoId: number;
    cajero: string;
    cantidad: number;
    total: number;
}

interface HoraRow extends RowDataPacket {
    hora: number;
    cantidad: number;
}

interface DiaRow extends RowDataPacket {
    dia: string;
    cantidad: number;
}

interface ConcurrenciaRow extends RowDataPacket {
    max_concurrentes: number;
}

interface MoraRow extends RowDataPacket {
    clienteId: number;
    placa: string;
    propietario: string;
    telefono: string;
    vencimiento: string;
    estado: string;
    dias: number;
}

interface RecaudoMensualidadMetodoRow extends RowDataPacket {
    metodo_pago: IRecaudoMensualidadPorMetodo['metodoPago'];
    cantidad: number;
    total: number;
}

interface RecaudoMensualidadMesRow extends RowDataPacket {
    mes: string;
    cantidad: number;
    total: number;
}

interface TicketAnuladoRow extends RowDataPacket {
    ticketId: number;
    placa: string;
    fecha_entrada: string;
    usuario: string;
    motivo: string | null;
    fecha_anulacion: string;
}

interface OperarioRow extends RowDataPacket {
    operarioId: number;
    operarioNombre: string;
    ingresosRegistrados: number;
    salidasRegistradas: number;
    anulaciones: number;
    recaudo: number;
}

interface AccionAuditoriaRow extends RowDataPacket {
    tipo_accion: string;
    cantidad: number;
}

interface RentabilidadRow extends RowDataPacket {
    parqueaderoId: number;
    nombreComercial: string;
    estado: string;
    planActual: string | null;
    costoPlan: number | null;
    ultimoPagoPlan: number | null;
    recaudoOcasional: number;
    recaudoMensualidades: number;
}

interface ConteoRow extends RowDataPacket {
    total: number;
}

interface SuscripcionRow extends RowDataPacket {
    parqueadero: string;
    plan: string;
    vencimiento: string;
}

interface PorPlanRow extends RowDataPacket {
    plan: string;
    cantidad: number;
}

interface UsoPlataformaRow extends RowDataPacket {
    parqueaderoId: number;
    nombre: string;
    estado: string;
    ticketsPeriodo: number;
    mensualesActivos: number;
    turnosCerradosPeriodo: number;
    operarios: number;
    pagosMensualidadPeriodo: number;
    montoRecaudadoPeriodo: number;
}

interface IndicadoresRow extends RowDataPacket {
    total_entradas: number;
    total_salidas: number;
    promedio_estadia: number;
    tarifa_hora: number;
    ticket_promedio: number;
}

export class MySQLReporteRepository implements IReporteRepository {
    async obtenerRecaudo(parqueaderoId: number, rango: IReporteRecaudoDTO): Promise<IReporteRecaudo> {
        const [rows] = await dbPool.execute<RecaudoRow[]>(`
            SELECT metodo_pago, SUM(total_ocasional) AS total_ocasional, SUM(total_mensualidad) AS total_mensualidad
            FROM (
                SELECT metodo_pago, total_pagado AS total_ocasional, 0 AS total_mensualidad
                FROM tickets
                WHERE parqueadero_id = ? AND estado = 'FINALIZADO'
                  AND DATE(fecha_salida) BETWEEN ? AND ? AND metodo_pago IS NOT NULL
                UNION ALL
                SELECT metodo_pago, 0 AS total_ocasional, monto AS total_mensualidad
                FROM pagos_mensualidades
                WHERE parqueadero_id = ? AND DATE(fecha_pago) BETWEEN ? AND ?
            ) recaudos
            GROUP BY metodo_pago
            ORDER BY metodo_pago ASC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin, parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const porMetodo = rows.map((row) => {
            const totalOcasional = Number(row.total_ocasional);
            const totalMensualidad = Number(row.total_mensualidad);
            return { metodoPago: row.metodo_pago, totalOcasional, totalMensualidad, total: totalOcasional + totalMensualidad };
        });
        const totalOcasional = porMetodo.reduce((total, row) => total + row.totalOcasional, 0);
        const totalMensualidades = porMetodo.reduce((total, row) => total + row.totalMensualidad, 0);
        const porDia = await this.obtenerRecaudoPorDia(parqueaderoId, rango);
        return {
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            totalOcasional,
            totalMensualidades,
            totalRecaudado: totalOcasional + totalMensualidades,
            porMetodo,
            porDia
        };
    }

    private async obtenerRecaudoPorDia(parqueaderoId: number, rango: IReporteRecaudoDTO) {
        const [rows] = await dbPool.execute<RecaudoDiaRow[]>(`
            SELECT dia, SUM(total_ocasional) AS total_ocasional, SUM(total_mensualidad) AS total_mensualidad
            FROM (
                SELECT DATE_FORMAT(fecha_salida, '%Y-%m-%d') AS dia, total_pagado AS total_ocasional, 0 AS total_mensualidad
                FROM tickets
                WHERE parqueadero_id = ? AND estado = 'FINALIZADO'
                  AND DATE(fecha_salida) BETWEEN ? AND ? AND metodo_pago IS NOT NULL
                UNION ALL
                SELECT DATE_FORMAT(fecha_pago, '%Y-%m-%d') AS dia, 0 AS total_ocasional, monto AS total_mensualidad
                FROM pagos_mensualidades
                WHERE parqueadero_id = ? AND DATE(fecha_pago) BETWEEN ? AND ?
            ) recaudos
            GROUP BY dia
            ORDER BY dia ASC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin, parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        return rows.map((row) => {
            const totalOcasional = Number(row.total_ocasional);
            const totalMensualidad = Number(row.total_mensualidad);
            return { dia: row.dia, totalOcasional, totalMensualidad, total: totalOcasional + totalMensualidad };
        });
    }

    async obtenerCuadreCaja(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteCuadreCaja> {
        const [rows] = await dbPool.execute<CuadreTurnoRow[]>(`
            SELECT turno.id AS turnoId, usuario.nombre AS cajero,
                   DATE_FORMAT(turno.fecha_apertura, '%Y-%m-%d %H:%i') AS fechaApertura,
                   DATE_FORMAT(turno.fecha_cierre, '%Y-%m-%d %H:%i') AS fechaCierre,
                   turno.monto_inicial_base AS montoInicial, turno.estado AS estadoTurno,
                   turno.monto_efectivo_declarado AS declarado,
                   (SELECT IFNULL(SUM(ticket.total_pagado), 0) FROM tickets ticket
                    WHERE ticket.turno_salida_id = turno.id AND ticket.estado = 'FINALIZADO') AS ingresosOcasionales,
                   (SELECT IFNULL(SUM(pago.monto), 0) FROM pagos_mensualidades pago
                    WHERE pago.turno_caja_id = turno.id) AS ingresosMensualidades,
                   (SELECT IFNULL(SUM(egreso.monto), 0) FROM egresos_caja_menor egreso
                    WHERE egreso.turno_caja_id = turno.id) AS egresos
            FROM turnos_caja turno
            INNER JOIN usuarios usuario ON usuario.id = turno.usuario_id
            WHERE turno.parqueadero_id = ?
              AND DATE(COALESCE(turno.fecha_cierre, turno.fecha_apertura)) BETWEEN ? AND ?
            ORDER BY turno.fecha_apertura DESC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);

        const turnos: ICuadreTurno[] = rows.map((row) => {
            const ingresosOcasionales = Number(row.ingresosOcasionales);
            const ingresosMensualidades = Number(row.ingresosMensualidades);
            const ingresos = ingresosOcasionales + ingresosMensualidades;
            const egresos = Number(row.egresos);
            const esperado = Number(row.montoInicial) + ingresos - egresos;
            const declarado = row.declarado != null ? Number(row.declarado) : null;
            return {
                turnoId: row.turnoId,
                cajero: row.cajero,
                fechaApertura: row.fechaApertura,
                fechaCierre: row.fechaCierre,
                montoInicial: Number(row.montoInicial),
                ingresosOcasionales,
                ingresosMensualidades,
                ingresos,
                egresos,
                esperado,
                declarado,
                diferencia: declarado != null ? declarado - esperado : null
            };
        });

        const totalIngresos = turnos.reduce((t, row) => t + row.ingresos, 0);
        const totalEgresos = turnos.reduce((t, row) => t + row.egresos, 0);
        const totalEsperado = turnos.reduce((t, row) => t + row.esperado, 0);
        const conDeclarado = turnos.filter((turno) => turno.declarado != null);
        const totalDeclarado = conDeclarado.length > 0 ? conDeclarado.reduce((t, row) => t + (row.declarado ?? 0), 0) : null;
        const totalDiferencia = totalDeclarado != null ? totalDeclarado - totalEsperado : null;

        return {
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            turnosCerrados: turnos.filter((turno) => turno.fechaCierre != null).length,
            turnosAbiertos: turnos.filter((turno) => turno.fechaCierre == null).length,
            totalIngresos,
            totalEgresos,
            totalEsperado,
            totalDeclarado,
            totalDiferencia,
            turnos
        };
    }

    async obtenerEgresos(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteEgresos> {
        const [porMotivo] = await dbPool.execute<MotivoRow[]>(`
            SELECT egreso.motivo AS motivo, COUNT(*) AS cantidad, IFNULL(SUM(egreso.monto), 0) AS total
            FROM egresos_caja_menor egreso
            INNER JOIN turnos_caja turno ON turno.id = egreso.turno_caja_id
            WHERE turno.parqueadero_id = ? AND DATE(egreso.fecha_registro) BETWEEN ? AND ?
            GROUP BY egreso.motivo
            ORDER BY total DESC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const [porTurno] = await dbPool.execute<PorTurnoRow[]>(`
            SELECT egreso.turno_caja_id AS turnoId, usuario.nombre AS cajero,
                   COUNT(*) AS cantidad, IFNULL(SUM(egreso.monto), 0) AS total
            FROM egresos_caja_menor egreso
            INNER JOIN turnos_caja turno ON turno.id = egreso.turno_caja_id
            INNER JOIN usuarios usuario ON usuario.id = turno.usuario_id
            WHERE turno.parqueadero_id = ? AND DATE(egreso.fecha_registro) BETWEEN ? AND ?
            GROUP BY egreso.turno_caja_id, usuario.nombre
            ORDER BY total DESC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const totalEgresos = porMotivo.reduce((t, row) => t + Number(row.total), 0);
        const cantidadEgresos = porMotivo.reduce((t, row) => t + Number(row.cantidad), 0);
        return {
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            totalEgresos,
            cantidadEgresos,
            porMotivo: porMotivo.map((row) => ({ motivo: row.motivo, cantidad: Number(row.cantidad), total: Number(row.total) })),
            porTurno: porTurno.map((row) => ({ turnoId: row.turnoId, cajero: row.cajero, cantidad: Number(row.cantidad), total: Number(row.total) }))
        };
    }

    async obtenerOcupacion(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteOcupacion> {
        const [indicadores] = await dbPool.execute<IndicadoresRow[]>(`
            SELECT
                (SELECT COUNT(*) FROM tickets
                 WHERE parqueadero_id = ? AND DATE(fecha_entrada) BETWEEN ? AND ?) AS total_entradas,
                (SELECT COUNT(*) FROM tickets
                 WHERE parqueadero_id = ? AND estado = 'FINALIZADO' AND DATE(fecha_salida) BETWEEN ? AND ?) AS total_salidas,
                (SELECT IFNULL(AVG(TIMESTAMPDIFF(MINUTE, fecha_entrada, fecha_salida)), 0) FROM tickets
                 WHERE parqueadero_id = ? AND estado = 'FINALIZADO' AND fecha_salida IS NOT NULL
                   AND DATE(fecha_salida) BETWEEN ? AND ?) AS promedio_estadia,
                (SELECT IFNULL(SUM(total_pagado) / NULLIF(SUM(TIMESTAMPDIFF(HOUR, fecha_entrada, fecha_salida)), 0), 0) FROM tickets
                 WHERE parqueadero_id = ? AND estado = 'FINALIZADO' AND fecha_salida IS NOT NULL
                   AND DATE(fecha_salida) BETWEEN ? AND ?) AS tarifa_hora,
                (SELECT IFNULL(AVG(total_pagado), 0) FROM tickets
                 WHERE parqueadero_id = ? AND estado = 'FINALIZADO' AND DATE(fecha_salida) BETWEEN ? AND ?) AS ticket_promedio
        `, [
            parqueaderoId, rango.fechaInicio, rango.fechaFin,
            parqueaderoId, rango.fechaInicio, rango.fechaFin,
            parqueaderoId, rango.fechaInicio, rango.fechaFin,
            parqueaderoId, rango.fechaInicio, rango.fechaFin,
            parqueaderoId, rango.fechaInicio, rango.fechaFin
        ]);
        const [activosActuales] = await dbPool.execute<ConteoRow[]>(`
            SELECT COUNT(*) AS total FROM tickets WHERE parqueadero_id = ? AND estado = 'ACTIVO'
        `, [parqueaderoId]);
        const [horas] = await dbPool.execute<HoraRow[]>(`
            SELECT HOUR(fecha_entrada) AS hora, COUNT(*) AS cantidad
            FROM tickets WHERE parqueadero_id = ? AND DATE(fecha_entrada) BETWEEN ? AND ?
            GROUP BY HOUR(fecha_entrada)
            ORDER BY hora ASC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const [dias] = await dbPool.execute<DiaRow[]>(`
            SELECT DATE_FORMAT(fecha_entrada, '%Y-%m-%d') AS dia, COUNT(*) AS cantidad
            FROM tickets WHERE parqueadero_id = ? AND DATE(fecha_entrada) BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(fecha_entrada, '%Y-%m-%d')
            ORDER BY dia ASC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const [concurrencia] = await dbPool.execute<ConcurrenciaRow[]>(`
            WITH eventos AS (
                SELECT fecha_entrada AS momento, 1 AS delta FROM tickets
                WHERE parqueadero_id = ? AND DATE(fecha_entrada) BETWEEN ? AND ?
                UNION ALL
                SELECT DATE_ADD(fecha_salida, INTERVAL 1 SECOND) AS momento, -1 AS delta FROM tickets
                WHERE parqueadero_id = ? AND estado IN ('FINALIZADO', 'ANULADO') AND fecha_salida IS NOT NULL
                  AND DATE(fecha_salida) BETWEEN ? AND ?
            )
            SELECT IFNULL(MAX(acumulado), 0) AS max_concurrentes FROM (
                SELECT SUM(delta) OVER (ORDER BY momento, delta) AS acumulado FROM eventos
            ) t
        `, [
            parqueaderoId, rango.fechaInicio, rango.fechaFin,
            parqueaderoId, rango.fechaInicio, rango.fechaFin
        ]);

        const totalEntradas = Number(indicadores[0]?.total_entradas ?? 0);
        const totalSalidas = Number(indicadores[0]?.total_salidas ?? 0);
        const promedioEstadiaMinutos = Number(indicadores[0]?.promedio_estadia ?? 0);
        const tarifaEfectivaHora = Number(indicadores[0]?.tarifa_hora ?? 0);
        const ticketPromedio = Number(indicadores[0]?.ticket_promedio ?? 0);

        const minutosEnRango = Math.max(1, Math.round((new Date(`${rango.fechaFin}T23:59:59`).getTime() - new Date(`${rango.fechaInicio}T00:00:00`).getTime()) / 60000));
        const promedioConcurrentes = Number((promedioEstadiaMinutos * totalSalidas / minutosEnRango).toFixed(2));

        const entradasPorHora: IEntradasPorHora[] = horas.map((row) => ({ hora: Number(row.hora), cantidad: Number(row.cantidad) }));
        const entradasPorDia: IEntradasPorDia[] = dias.map((row) => ({ dia: row.dia, cantidad: Number(row.cantidad) }));
        const horaPico = entradasPorHora.reduce<IEntradasPorHora | null>((pico, current) => !pico || current.cantidad > pico.cantidad ? current : pico, null);

        return {
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            totalEntradas,
            totalSalidas,
            activosActuales: Number(activosActuales[0]?.total ?? 0),
            promedioEstadiaMinutos: Math.round(promedioEstadiaMinutos),
            maxConcurrentes: Number(concurrencia[0]?.max_concurrentes ?? 0),
            promedioConcurrentes,
            horaPico: horaPico?.hora ?? null,
            tarifaEfectivaHora: Math.round(tarifaEfectivaHora * 100) / 100,
            ticketPromedio: Math.round(ticketPromedio * 100) / 100,
            entradasPorHora,
            entradasPorDia
        };
    }

    async obtenerMora(parqueaderoId: number, filtros: IMoraFiltros): Promise<IReporteMora> {
        const estado = filtros.estado ?? '';
        const pagina = typeof filtros.pagina === 'number' && Number.isInteger(filtros.pagina) && filtros.pagina > 0 ? filtros.pagina : 1;
        const limite = typeof filtros.limite === 'number' && Number.isInteger(filtros.limite) && filtros.limite > 0 ? Math.min(filtros.limite, 100) : 20;
        const desplazamiento = (pagina - 1) * limite;

        const condicionRangoResumen = filtros.fechaInicio ? 'AND fecha_vencimiento >= ?' : '';
        const condicionRangoLista = filtros.fechaInicio ? 'AND cliente.fecha_vencimiento >= ?' : '';
        const paramsRango = filtros.fechaInicio ? [filtros.fechaInicio] : [];

        const [resumenRows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT
                SUM(estado = 'CANCELADA') AS canceladas,
                SUM(estado != 'CANCELADA' AND DATEDIFF(CURDATE(), fecha_vencimiento) > 0) AS vencido,
                SUM(estado != 'CANCELADA' AND DATEDIFF(CURDATE(), fecha_vencimiento) <= 0 AND DATEDIFF(CURDATE(), fecha_vencimiento) > -5) AS porVencer,
                SUM(estado != 'CANCELADA' AND DATEDIFF(CURDATE(), fecha_vencimiento) <= -5) AS alDia,
                SUM(CASE WHEN estado != 'CANCELADA' AND DATEDIFF(CURDATE(), fecha_vencimiento) > 0
                         THEN CEIL(DATEDIFF(CURDATE(), fecha_vencimiento) / 30) ELSE 0 END) AS mesesAdeudados
            FROM clientes_mensuales
            WHERE parqueadero_id = ? ${condicionRangoResumen}
        `, [parqueaderoId, ...paramsRango]);
        const resumen: Record<string, number | null> = (resumenRows[0] ?? {}) as Record<string, number | null>;

        // El reporte clasifica cada cliente según los días transcurridos desde su vencimiento:
        //  > 0 → VENCIDO, entre -4 y 0 → POR_VENCER, <= -5 → AL_DIA.
        const condicionTipo = `
            (? = '' OR
             (DATEDIFF(CURDATE(), fecha_vencimiento) > 0 AND ? = 'VENCIDO') OR
             (DATEDIFF(CURDATE(), fecha_vencimiento) <= 0 AND DATEDIFF(CURDATE(), fecha_vencimiento) > -5 AND ? = 'POR_VENCER') OR
             (DATEDIFF(CURDATE(), fecha_vencimiento) <= -5 AND ? = 'AL_DIA'))`;

        const [rows] = await dbPool.execute<MoraRow[]>(`
            SELECT cliente.id AS clienteId, cliente.placa, cliente.nombre_propietario AS propietario,
                   cliente.telefono_whatsapp AS telefono, cliente.fecha_vencimiento AS vencimiento, cliente.estado,
                   DATEDIFF(CURDATE(), cliente.fecha_vencimiento) AS dias
            FROM clientes_mensuales cliente
            WHERE cliente.parqueadero_id = ? AND cliente.estado != 'CANCELADA'
              ${condicionRangoLista}
              AND ${condicionTipo}
            ORDER BY cliente.fecha_vencimiento ASC
            LIMIT ${limite} OFFSET ${desplazamiento}
        `, [parqueaderoId, ...paramsRango, estado, estado, estado, estado]);

        const [conteoRows] = await dbPool.execute<RowDataPacket[]>(`
            SELECT COUNT(*) AS total
            FROM clientes_mensuales
            WHERE parqueadero_id = ? AND estado != 'CANCELADA'
              ${condicionRangoResumen}
              AND ${condicionTipo}
        `, [parqueaderoId, ...paramsRango, estado, estado, estado, estado]);

        const clientes: IMensualidadMora[] = rows.map((row) => {
            const dias = row.dias;
            const tipo = dias > 0 ? 'VENCIDO' : dias > -5 ? 'POR_VENCER' : 'AL_DIA';
            return this.mapearMora(row, tipo, tipo === 'VENCIDO' ? dias : 0, tipo === 'VENCIDO' ? Math.ceil(dias / 30) : 0);
        });

        return {
            alDia: Number(resumen.alDia ?? 0),
            porVencer: Number(resumen.porVencer ?? 0),
            vencido: Number(resumen.vencido ?? 0),
            canceladas: Number(resumen.canceladas ?? 0),
            mesesAdeudados: Number(resumen.mesesAdeudados ?? 0),
            clientes: { items: clientes, total: Number(conteoRows[0]?.total ?? 0), pagina, limite }
        };
    }

    private mapearMora(row: MoraRow, tipo: IMensualidadMora['tipo'], diasVencido: number, mesesAdeudados: number): IMensualidadMora {
        return {
            clienteId: row.clienteId,
            placa: row.placa,
            propietario: row.propietario,
            telefono: row.telefono,
            vencimiento: row.vencimiento,
            estado: row.estado,
            tipo,
            diasVencido: tipo === 'VENCIDO' ? diasVencido : null,
            mesesAdeudados
        };
    }

    async obtenerRecaudoMensualidades(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteRecaudoMensualidades> {
        const [porMetodo] = await dbPool.execute<RecaudoMensualidadMetodoRow[]>(`
            SELECT metodo_pago, COUNT(*) AS cantidad, IFNULL(SUM(monto), 0) AS total
            FROM pagos_mensualidades
            WHERE parqueadero_id = ? AND DATE(fecha_pago) BETWEEN ? AND ?
            GROUP BY metodo_pago
            ORDER BY total DESC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const [porMes] = await dbPool.execute<RecaudoMensualidadMesRow[]>(`
            SELECT DATE_FORMAT(fecha_pago, '%Y-%m') AS mes, COUNT(*) AS cantidad, IFNULL(SUM(monto), 0) AS total
            FROM pagos_mensualidades
            WHERE parqueadero_id = ? AND DATE(fecha_pago) BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(fecha_pago, '%Y-%m')
            ORDER BY mes ASC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const cantidadPagos = porMetodo.reduce((t, row) => t + Number(row.cantidad), 0);
        const totalPagado = porMetodo.reduce((t, row) => t + Number(row.total), 0);
        return {
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            totalPagado,
            cantidadPagos,
            porMetodo: porMetodo.map((row) => ({ metodoPago: row.metodo_pago, cantidad: Number(row.cantidad), total: Number(row.total) })),
            porMes: porMes.map((row) => ({ mes: row.mes, cantidad: Number(row.cantidad), total: Number(row.total) }))
        };
    }

    async obtenerDesercion(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteDesercion> {
        const [activas] = await dbPool.execute<ConteoRow[]>(`
            SELECT COUNT(*) AS total FROM clientes_mensuales
            WHERE parqueadero_id = ? AND estado != 'CANCELADA'
        `, [parqueaderoId]);
        const [nuevas] = await dbPool.execute<ConteoRow[]>(`
            SELECT COUNT(*) AS total FROM clientes_mensuales
            WHERE parqueadero_id = ? AND DATE(creado_en) BETWEEN ? AND ?
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const [renovaciones] = await dbPool.execute<ConteoRow[]>(`
            SELECT COUNT(*) AS total FROM pagos_mensualidades
            WHERE parqueadero_id = ? AND DATE(fecha_pago) BETWEEN ? AND ?
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const [canceladas] = await dbPool.execute<ConteoRow[]>(`
            SELECT COUNT(*) AS total FROM auditoria_eventos
            WHERE parqueadero_id = ? AND tipo_accion = 'CANCELACION_MENSUALIDAD' AND DATE(fecha) BETWEEN ? AND ?
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const [porMotivo] = await dbPool.execute<MotivoRow[]>(`
            SELECT motivo, COUNT(*) AS cantidad, COUNT(*) AS total
            FROM auditoria_eventos
            WHERE parqueadero_id = ? AND tipo_accion = 'CANCELACION_MENSUALIDAD' AND DATE(fecha) BETWEEN ? AND ?
            GROUP BY motivo
            ORDER BY cantidad DESC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);

        const totalActivas = Number(activas[0]?.total ?? 0);
        const canceladasPeriodo = Number(canceladas[0]?.total ?? 0);
        const retencion = totalActivas + canceladasPeriodo > 0
            ? Math.round((totalActivas / (totalActivas + canceladasPeriodo)) * 1000) / 10
            : 100;

        return {
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            activas: totalActivas,
            nuevas: Number(nuevas[0]?.total ?? 0),
            renovacionesEnPeriodo: Number(renovaciones[0]?.total ?? 0),
            canceladasEnPeriodo: canceladasPeriodo,
            tasaRetencionPorCiento: retencion,
            porMotivo: porMotivo.map((row) => ({ motivo: row.motivo, cantidad: Number(row.cantidad), total: Number(row.cantidad) }))
        };
    }

    async obtenerAnulaciones(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteAnulaciones> {
        const [tickets] = await dbPool.execute<TicketAnuladoRow[]>(`
            SELECT ticket.id AS ticketId, ticket.placa, DATE_FORMAT(ticket.fecha_entrada, '%Y-%m-%d %H:%i') AS fecha_entrada,
                   usuario.nombre AS usuario, auditoria.motivo AS motivo,
                   DATE_FORMAT(auditoria.fecha, '%Y-%m-%d %H:%i') AS fecha_anulacion
            FROM auditoria_eventos auditoria
            INNER JOIN usuarios usuario ON usuario.id = auditoria.usuario_id
            INNER JOIN tickets ticket ON ticket.id = CAST(JSON_EXTRACT(auditoria.detalles, '$.ticketId') AS UNSIGNED)
            WHERE auditoria.parqueadero_id = ? AND auditoria.tipo_accion = 'ANULACION_TICKET'
              AND DATE(auditoria.fecha) BETWEEN ? AND ?
            ORDER BY auditoria.fecha DESC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const [porMotivo] = await dbPool.execute<MotivoRow[]>(`
            SELECT motivo, COUNT(*) AS cantidad, COUNT(*) AS total
            FROM auditoria_eventos
            WHERE parqueadero_id = ? AND tipo_accion = 'ANULACION_TICKET' AND DATE(fecha) BETWEEN ? AND ?
            GROUP BY motivo
            ORDER BY cantidad DESC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const [cancelaciones] = await dbPool.execute<ConteoRow[]>(`
            SELECT COUNT(*) AS total FROM auditoria_eventos
            WHERE parqueadero_id = ? AND tipo_accion = 'CANCELACION_MENSUALIDAD' AND DATE(fecha) BETWEEN ? AND ?
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);
        const [cancelacionesPorMotivo] = await dbPool.execute<MotivoRow[]>(`
            SELECT motivo, COUNT(*) AS cantidad, COUNT(*) AS total
            FROM auditoria_eventos
            WHERE parqueadero_id = ? AND tipo_accion = 'CANCELACION_MENSUALIDAD' AND DATE(fecha) BETWEEN ? AND ?
            GROUP BY motivo
            ORDER BY cantidad DESC
        `, [parqueaderoId, rango.fechaInicio, rango.fechaFin]);

        return {
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            totalAnulados: tickets.length,
            porMotivo: porMotivo.map((row) => ({ motivo: row.motivo, cantidad: Number(row.cantidad), total: Number(row.cantidad) })),
            tickets: tickets.map((row) => ({
                ticketId: row.ticketId,
                placa: row.placa,
                fechaEntrada: row.fecha_entrada,
                usuario: row.usuario,
                motivo: row.motivo,
                fechaAnulacion: row.fecha_anulacion
            })),
            mensualidadesCanceladas: Number(cancelaciones[0]?.total ?? 0),
            cancelacionesPorMotivo: cancelacionesPorMotivo.map((row) => ({ motivo: row.motivo, cantidad: Number(row.cantidad), total: Number(row.cantidad) }))
        };
    }

    async obtenerActividadOperarios(parqueaderoId: number, rango: IRangoFechas): Promise<IReporteActividadOperarios> {
        const [operarios] = await dbPool.execute<OperarioRow[]>(`
            SELECT usuario.id AS operarioId, usuario.nombre AS operarioNombre,
                   (SELECT COUNT(*) FROM tickets ticket
                    INNER JOIN turnos_caja turnoIngreso ON turnoIngreso.id = ticket.turno_ingreso_id
                    WHERE turnoIngreso.usuario_id = usuario.id AND DATE(ticket.fecha_entrada) BETWEEN ? AND ?) AS ingresosRegistrados,
                   (SELECT COUNT(*) FROM tickets ticket
                    INNER JOIN turnos_caja turnoSalida ON turnoSalida.id = ticket.turno_salida_id
                    WHERE turnoSalida.usuario_id = usuario.id AND DATE(ticket.fecha_salida) BETWEEN ? AND ?) AS salidasRegistradas,
                   (SELECT COUNT(*) FROM tickets ticket
                    INNER JOIN turnos_caja turnoIngreso ON turnoIngreso.id = ticket.turno_ingreso_id
                    WHERE turnoIngreso.usuario_id = usuario.id AND ticket.estado = 'ANULADO' AND DATE(ticket.fecha_entrada) BETWEEN ? AND ?) AS anulaciones,
                   (SELECT IFNULL(SUM(ticket.total_pagado), 0) FROM tickets ticket
                    INNER JOIN turnos_caja turnoSalida ON turnoSalida.id = ticket.turno_salida_id
                    WHERE turnoSalida.usuario_id = usuario.id AND ticket.estado = 'FINALIZADO' AND DATE(ticket.fecha_salida) BETWEEN ? AND ?) AS recaudo
            FROM usuarios usuario
            INNER JOIN roles rol ON rol.id = usuario.rol_id
            WHERE usuario.parqueadero_id = ? AND rol.nombre IN ('OPERARIO', 'ADMIN_PARQUEADERO')
            ORDER BY usuario.nombre ASC
        `, [
            parqueaderoId, rango.fechaInicio, rango.fechaFin,
            parqueaderoId, rango.fechaInicio, rango.fechaFin,
            parqueaderoId, rango.fechaInicio, rango.fechaFin,
            parqueaderoId, rango.fechaInicio, rango.fechaFin,
            parqueaderoId
        ]);

        const resultado: IActividadOperario[] = [];
        for (const operario of operarios) {
            const [acciones] = await dbPool.execute<AccionAuditoriaRow[]>(`
                SELECT tipo_accion, COUNT(*) AS cantidad
                FROM auditoria_eventos
                WHERE usuario_id = ? AND parqueadero_id = ? AND DATE(fecha) BETWEEN ? AND ?
                GROUP BY tipo_accion
                ORDER BY cantidad DESC
            `, [operario.operarioId, parqueaderoId, rango.fechaInicio, rango.fechaFin]);
            resultado.push({
                operarioId: operario.operarioId,
                nombre: operario.operarioNombre,
                ingresosRegistrados: Number(operario.ingresosRegistrados),
                salidasRegistradas: Number(operario.salidasRegistradas),
                anulaciones: Number(operario.anulaciones),
                recaudo: Number(operario.recaudo),
                accionesAuditoria: acciones.map((row): IAccionAuditoria => ({ tipoAccion: row.tipo_accion, cantidad: Number(row.cantidad) }))
            });
        }

        return { fechaInicio: rango.fechaInicio, fechaFin: rango.fechaFin, operarios: resultado };
    }

    async obtenerRentabilidad(rango: IRangoFechas): Promise<IReporteRentabilidad> {
        const [rows] = await dbPool.execute<RentabilidadRow[]>(`
            SELECT parqueadero.id AS parqueaderoId, parqueadero.nombre_comercial AS nombreComercial,
                   parqueadero.estado AS estado,
                   (SELECT plan.nombre FROM suscripciones_parqueadero sus
                    INNER JOIN planes_saas plan ON plan.id = sus.plan_id
                    WHERE sus.parqueadero_id = parqueadero.id AND sus.estado_pago = 'APROBADO'
                    ORDER BY sus.id DESC LIMIT 1) AS planActual,
                   (SELECT plan.precio_mensual FROM suscripciones_parqueadero sus
                    INNER JOIN planes_saas plan ON plan.id = sus.plan_id
                    WHERE sus.parqueadero_id = parqueadero.id AND sus.estado_pago = 'APROBADO'
                    ORDER BY sus.id DESC LIMIT 1) AS costoPlan,
                   (SELECT sus.monto_pagado FROM suscripciones_parqueadero sus
                    WHERE sus.parqueadero_id = parqueadero.id AND sus.estado_pago = 'APROBADO'
                    ORDER BY sus.id DESC LIMIT 1) AS ultimoPagoPlan,
                   (SELECT IFNULL(SUM(ticket.total_pagado), 0) FROM tickets ticket
                    WHERE ticket.parqueadero_id = parqueadero.id AND ticket.estado = 'FINALIZADO'
                      AND DATE(ticket.fecha_salida) BETWEEN ? AND ?) AS recaudoOcasional,
                   (SELECT IFNULL(SUM(pago.monto), 0) FROM pagos_mensualidades pago
                    WHERE pago.parqueadero_id = parqueadero.id AND DATE(pago.fecha_pago) BETWEEN ? AND ?) AS recaudoMensualidades
            FROM parqueaderos parqueadero
            ORDER BY parqueadero.nombre_comercial ASC
        `, [rango.fechaInicio, rango.fechaFin, rango.fechaInicio, rango.fechaFin]);

        let totalRecaudado = 0;
        const parqueaderos: IRentabilidadParqueadero[] = rows.map((row) => {
            const recaudoOcasional = Number(row.recaudoOcasional);
            const recaudoMensualidades = Number(row.recaudoMensualidades);
            const recaudoTotal = recaudoOcasional + recaudoMensualidades;
            const costoPlanMensual = row.costoPlan != null ? Number(row.costoPlan) : null;
            totalRecaudado += recaudoTotal;
            return {
                parqueaderoId: row.parqueaderoId,
                nombre: row.nombreComercial,
                estado: row.estado,
                planActual: row.planActual,
                costoPlanMensual,
                ultimoPagoPlan: row.ultimoPagoPlan != null ? Number(row.ultimoPagoPlan) : null,
                recaudoOcasional,
                recaudoMensualidades,
                recaudoTotal,
                margenAproximado: costoPlanMensual != null ? Math.round((recaudoTotal - costoPlanMensual) * 100) / 100 : null
            };
        });
        const totalCostoPlanesMensual = parqueaderos.reduce((t, p) => t + (p.costoPlanMensual ?? 0), 0);

        return {
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            totalRecaudado,
            totalCostoPlanesMensual,
            parqueaderos
        };
    }

    async obtenerSuscripciones(rango: IRangoFechas): Promise<IReporteSuscripciones> {
        const [conteos] = await dbPool.execute<RowDataPacket[]>(`
            SELECT
              (SELECT COUNT(DISTINCT sus.parqueadero_id) FROM suscripciones_parqueadero sus
               WHERE sus.estado_pago = 'APROBADO' AND sus.fecha_vencimiento >= CURDATE()) AS vigentes,
              (SELECT COUNT(DISTINCT sus.parqueadero_id) FROM suscripciones_parqueadero sus
               WHERE sus.estado_pago = 'APROBADO' AND sus.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)) AS por_vencer,
              (SELECT COUNT(DISTINCT sus.parqueadero_id) FROM suscripciones_parqueadero sus
               WHERE sus.estado_pago = 'APROBADO' AND sus.fecha_vencimiento < CURDATE()) AS vencidas,
              (SELECT COUNT(*) FROM parqueaderos parqueadero
               WHERE NOT EXISTS (SELECT 1 FROM suscripciones_parqueadero sus WHERE sus.parqueadero_id = parqueadero.id AND sus.estado_pago = 'APROBADO' AND sus.fecha_vencimiento >= CURDATE())) AS sin_suscripcion
        `);
        const [recaudoConteo] = await dbPool.execute<ConteoRow[]>(`
            SELECT IFNULL(SUM(monto_pagado), 0) AS total FROM suscripciones_parqueadero
            WHERE estado_pago = 'APROBADO' AND DATE(creado_en) BETWEEN ? AND ?
        `, [rango.fechaInicio, rango.fechaFin]);
        const [porPlan] = await dbPool.execute<PorPlanRow[]>(`
            SELECT plan.nombre AS plan, COUNT(*) AS cantidad
            FROM suscripciones_parqueadero sus
            INNER JOIN planes_saas plan ON plan.id = sus.plan_id
            WHERE sus.estado_pago = 'APROBADO'
            GROUP BY plan.nombre
            ORDER BY cantidad DESC
        `);
        const [proximas] = await dbPool.execute<SuscripcionRow[]>(`
            SELECT parqueadero.nombre_comercial AS parqueadero, plan.nombre AS plan,
                   DATE_FORMAT(sus.fecha_vencimiento, '%Y-%m-%d') AS vencimiento
            FROM suscripciones_parqueadero sus
            INNER JOIN parqueaderos parqueadero ON parqueadero.id = sus.parqueadero_id
            INNER JOIN planes_saas plan ON plan.id = sus.plan_id
            WHERE sus.estado_pago = 'APROBADO' AND sus.fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
            ORDER BY sus.fecha_vencimiento ASC
            LIMIT 20
        `);

        return {
            fechaInicio: rango.fechaInicio,
            fechaFin: rango.fechaFin,
            vigentes: Number(conteos[0]?.vigentes ?? 0),
            porVencer: Number(conteos[0]?.por_vencer ?? 0),
            vencidas: Number(conteos[0]?.vencidas ?? 0),
            sinSuscripcion: Number(conteos[0]?.sin_suscripcion ?? 0),
            recaudadoPeriodo: Number(recaudoConteo[0]?.total ?? 0),
            porPlan: porPlan.map((row) => ({ plan: row.plan, cantidad: Number(row.cantidad) })),
            proximasAVencer: proximas.map((row) => ({ parqueadero: row.parqueadero, plan: row.plan, vencimiento: row.vencimiento }))
        };
    }

    async obtenerUsoPlataforma(rango: IRangoFechas): Promise<IReporteUsoPlataforma> {
        const [rows] = await dbPool.execute<UsoPlataformaRow[]>(`
            SELECT parqueadero.id AS parqueaderoId, parqueadero.nombre_comercial AS nombre, parqueadero.estado AS estado,
                   (SELECT COUNT(*) FROM tickets ticket WHERE ticket.parqueadero_id = parqueadero.id AND DATE(ticket.fecha_entrada) BETWEEN ? AND ?) AS ticketsPeriodo,
                   (SELECT COUNT(*) FROM clientes_mensuales cliente WHERE cliente.parqueadero_id = parqueadero.id AND cliente.estado != 'CANCELADA') AS mensualesActivos,
                   (SELECT COUNT(*) FROM turnos_caja turno WHERE turno.parqueadero_id = parqueadero.id AND turno.estado = 'CERRADO' AND DATE(turno.fecha_cierre) BETWEEN ? AND ?) AS turnosCerradosPeriodo,
                   (SELECT COUNT(*) FROM usuarios usuario INNER JOIN roles rol ON rol.id = usuario.rol_id WHERE usuario.parqueadero_id = parqueadero.id AND rol.nombre = 'OPERARIO') AS operarios,
                   (SELECT COUNT(*) FROM pagos_mensualidades pago WHERE pago.parqueadero_id = parqueadero.id AND DATE(pago.fecha_pago) BETWEEN ? AND ?) AS pagosMensualidadPeriodo,
                   (SELECT IFNULL(SUM(ticket.total_pagado), 0) FROM tickets ticket
                    WHERE ticket.parqueadero_id = parqueadero.id AND ticket.estado = 'FINALIZADO' AND DATE(ticket.fecha_salida) BETWEEN ? AND ?) AS montoRecaudadoPeriodo
            FROM parqueaderos parqueadero
            ORDER BY ticketsPeriodo DESC
        `, [
            rango.fechaInicio, rango.fechaFin,
            rango.fechaInicio, rango.fechaFin,
            rango.fechaInicio, rango.fechaFin,
            rango.fechaInicio, rango.fechaFin
        ]);
        const parqueaderos: IUsoPlataformaParqueadero[] = rows.map((row) => ({
            parqueaderoId: row.parqueaderoId,
            nombre: row.nombre,
            estado: row.estado,
            ticketsPeriodo: Number(row.ticketsPeriodo),
            mensualesActivos: Number(row.mensualesActivos),
            turnosCerradosPeriodo: Number(row.turnosCerradosPeriodo),
            operarios: Number(row.operarios),
            pagosMensualidadPeriodo: Number(row.pagosMensualidadPeriodo),
            montoRecaudadoPeriodo: Number(row.montoRecaudadoPeriodo)
        }));
        return { fechaInicio: rango.fechaInicio, fechaFin: rango.fechaFin, parqueaderos };
    }
}