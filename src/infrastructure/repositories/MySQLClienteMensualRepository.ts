import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type {
    IClienteMensual,
    IPagoMensualidad,
    ICrearClienteMensualDTO,
    IRegistrarPagoMensualidadDTO
} from '../../domain/types/clienteMensual.types.js';
import { dbPool } from '../database/mysql.config.js';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { ClienteRow, PagoRow } from '../types/mensual-mysql.types.js';

export class MySQLClienteMensualRepository implements IClienteMensualRepository {

    async crearCliente(datos: ICrearClienteMensualDTO): Promise<IClienteMensual> {
        const query = `
      INSERT INTO clientes_mensuales (
        parqueadero_id, placa, nombre_propietario, telefono_whatsapp,
        fecha_inicio, fecha_vencimiento, estado
      ) VALUES (?, ?, ?, ?, ?, ?, 'AL_DIA')
    `;

        const fechaInicio = datos.fechaInicioContrato ? new Date(datos.fechaInicioContrato) : new Date();
        // Por defecto, sumamos 1 mes a la fecha de inicio para establecer el vencimiento
        const fechaVencimiento = new Date(fechaInicio);
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);

        const [result] = await dbPool.execute<ResultSetHeader>(query, [
            datos.parqueaderoId,
            datos.placa.toUpperCase().trim(),
            datos.nombreCliente.trim(),
            datos.telefono ?? '',
            fechaInicio,
            fechaVencimiento
        ]);

        const cliente = await this.buscarPorId(result.insertId, datos.parqueaderoId);
        return cliente!;
    }

    async buscarPorId(id: number, parqueaderoId: number): Promise<IClienteMensual | null> {
        const query = `
      SELECT id, parqueadero_id, usuario_id, placa, nombre_propietario,
             telefono_whatsapp, fecha_inicio, fecha_vencimiento, estado, creado_en
      FROM clientes_mensuales
      WHERE id = ? AND parqueadero_id = ?
      LIMIT 1
    `;
        const [rows] = await dbPool.execute<ClienteRow[]>(query, [id, parqueaderoId]);
        if (!rows[0]) return null;
        return this.mapearCliente(rows[0]);
    }

    async buscarPorPlaca(placa: string, parqueaderoId: number): Promise<IClienteMensual | null> {
        const query = `
      SELECT id, parqueadero_id, usuario_id, placa, nombre_propietario,
             telefono_whatsapp, fecha_inicio, fecha_vencimiento, estado, creado_en
      FROM clientes_mensuales
      WHERE placa = ? AND parqueadero_id = ?
      LIMIT 1
    `;
        const [rows] = await dbPool.execute<ClienteRow[]>(query, [placa.toUpperCase().trim(), parqueaderoId]);
        if (!rows[0]) return null;
        return this.mapearCliente(rows[0]);
    }

    async listarPorParqueadero(parqueaderoId: number): Promise<IClienteMensual[]> {
        const query = `
      SELECT id, parqueadero_id, usuario_id, placa, nombre_propietario,
             telefono_whatsapp, fecha_inicio, fecha_vencimiento, estado, creado_en
      FROM clientes_mensuales
      WHERE parqueadero_id = ?
      ORDER BY nombre_propietario ASC
    `;
        const [rows] = await dbPool.execute<ClienteRow[]>(query, [parqueaderoId]);
        return rows.map((fila) => this.mapearCliente(fila));
    }

    async registrarPago(datos: IRegistrarPagoMensualidadDTO): Promise<IPagoMensualidad> {
        const query = `
      INSERT INTO pagos_mensualidades (
        parqueadero_id, cliente_id, monto, metodo_pago, turno_caja_id, fecha_pago
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `;

        const [result] = await dbPool.execute<ResultSetHeader>(query, [
            datos.parqueaderoId,
            datos.clienteMensualId,
            datos.monto,
            datos.metodoPago,
            datos.turnoCajaId
        ]);

        // Actualizamos la fecha de vencimiento del cliente mensual +1 mes
        const queryUpdateCliente = `
      UPDATE clientes_mensuales
      SET fecha_vencimiento = DATE_ADD(fecha_vencimiento, INTERVAL 1 MONTH),
          estado = 'AL_DIA'
      WHERE id = ? AND parqueadero_id = ?
    `;
        await dbPool.execute(queryUpdateCliente, [datos.clienteMensualId, datos.parqueaderoId]);

        const queryBusqueda = `
      SELECT id, parqueadero_id, cliente_id, monto, metodo_pago,
             transaccion_id, turno_caja_id, fecha_pago
      FROM pagos_mensualidades
      WHERE id = ?
      LIMIT 1
    `;
        const [rows] = await dbPool.execute<PagoRow[]>(queryBusqueda, [result.insertId]);
        return this.mapearPago(rows[0]!);
    }

    async listarPagosPorCliente(clienteMensualId: number, parqueaderoId: number): Promise<IPagoMensualidad[]> {
        const query = `
      SELECT id, parqueadero_id, cliente_id, monto, metodo_pago,
             transaccion_id, turno_caja_id, fecha_pago
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
            nombreCliente: fila.nombre_propietario,
            telefono: fila.telefono_whatsapp,
            fechaInicioContrato: new Date(fila.fecha_inicio),
            diaPagoMensual: new Date(fila.fecha_vencimiento).getDate(),
            activo: fila.estado !== 'VENCIDO',
            creadoEn: new Date(fila.creado_en)
        };
    }

    private mapearPago(fila: PagoRow): IPagoMensualidad {
        return {
            id: fila.id,
            clienteMensualId: fila.cliente_id,
            parqueaderoId: fila.parqueadero_id,
            turnoCajaId: fila.turno_caja_id,
            monto: Number(fila.monto),
            metodoPago: fila.metodo_pago === 'EFECTIVO' ? 'EFECTIVO' : 'TRANSFERENCIA',
            periodoPagadoInicio: new Date(fila.fecha_pago),
            periodoPagadoFin: new Date(fila.fecha_pago),
            fechaPago: new Date(fila.fecha_pago)
        };
    }
}