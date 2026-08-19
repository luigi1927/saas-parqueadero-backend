import type { ITicketRepository, ITicket, ITicketDetalle, IAnularTicketDTO } from '../../domain/repositories/ITicketRepository.js';
import { dbPool } from '../database/mysql.config.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { TurnoActivoRow, TarifaActivaRow, TicketConsultaRow } from '../types/ticket-mysql.types.js';

export class MySQLTicketRepository implements ITicketRepository {

  async buscarTurnoAbierto(parqueaderoId: number, usuarioId: number): Promise<number | null> {
    const query = `
      SELECT id FROM turnos_caja 
      WHERE parqueadero_id = ? AND usuario_id = ? AND estado = 'ABIERTO' 
      ORDER BY id DESC LIMIT 1
    `;
    const [rows] = await dbPool.execute<TurnoActivoRow[]>(query, [parqueaderoId, usuarioId]);
    const turno = rows[0];
    return turno ? turno.id : null;
  }

  async buscarTicketActivoPorPlaca(parqueaderoId: number, placa: string): Promise<ITicket | null> {
    const query = `
      SELECT id, parqueadero_id AS parqueaderoId, BIN_TO_UUID(codigo_qr) AS codigoQr, 
             placa, fecha_entrada AS fechaEntrada, estado, turno_ingreso_id AS turnoIngresoId
      FROM tickets
      WHERE parqueadero_id = ? AND placa = ? AND estado = 'ACTIVO'
      LIMIT 1
    `;
    const [rows] = await dbPool.execute<RowDataPacket[]>(query, [parqueaderoId, placa]);
    const fila = rows[0];
    if (!fila) return null;

    return {
      id: fila.id,
      parqueaderoId: fila.parqueaderoId,
      codigoQr: fila.codigoQr,
      placa: fila.placa,
      fechaEntrada: fila.fechaEntrada,
      estado: fila.estado,
      turnoIngresoId: fila.turnoIngresoId
    };
  }

  async buscarTicketPorQr(codigoQr: string): Promise<ITicketDetalle | null> {
    const query = `
      SELECT 
        t.id, t.parqueadero_id, BIN_TO_UUID(t.codigo_qr) AS codigoQr, t.placa, 
        t.telefono_whatsapp, t.tipo_vehiculo, t.observaciones_danos, t.fecha_entrada, 
        t.fecha_salida, t.subtotal_base, t.recargo_nocturno_aplicado, t.aplico_nocturno, 
        t.total_pagado, t.metodo_pago, t.estado, t.turno_ingreso_id, t.turno_salida_id,
        tf.precio_base_hora, tf.minutos_gracia, tf.hora_inicio_nocturna, 
        tf.hora_fin_nocturna, tf.tipo_recargo_nocturno, tf.valor_recargo_nocturno
      FROM tickets t
      INNER JOIN tarifas tf ON t.parqueadero_id = tf.parqueadero_id AND tf.activo = TRUE
      WHERE t.codigo_qr = UUID_TO_BIN(?)
      LIMIT 1
    `;
    const [rows] = await dbPool.execute<TicketConsultaRow[]>(query, [codigoQr]);
    const fila = rows[0];
    if (!fila) return null;

    return this.mapearTicketDetalle(fila);
  }

  async buscarTicketPorId(ticketId: number, parqueaderoId: number): Promise<ITicketDetalle | null> {
    const query = `
      SELECT 
        t.id, t.parqueadero_id, BIN_TO_UUID(t.codigo_qr) AS codigoQr, t.placa, 
        t.telefono_whatsapp, t.tipo_vehiculo, t.observaciones_danos, t.fecha_entrada, 
        t.fecha_salida, t.subtotal_base, t.recargo_nocturno_aplicado, t.aplico_nocturno, 
        t.total_pagado, t.metodo_pago, t.estado, t.turno_ingreso_id, t.turno_salida_id,
        tf.precio_base_hora, tf.minutos_gracia, tf.hora_inicio_nocturna, 
        tf.hora_fin_nocturna, tf.tipo_recargo_nocturno, tf.valor_recargo_nocturno
      FROM tickets t
      INNER JOIN tarifas tf ON t.parqueadero_id = tf.parqueadero_id AND tf.activo = TRUE
      WHERE t.id = ? AND t.parqueadero_id = ?
      LIMIT 1
    `;
    const [rows] = await dbPool.execute<TicketConsultaRow[]>(query, [ticketId, parqueaderoId]);
    const fila = rows[0];
    if (!fila) return null;

    return this.mapearTicketDetalle(fila);
  }

  async obtenerTarifaVigente(parqueaderoId: number): Promise<number | null> {
    const query = `
      SELECT id FROM tarifas 
      WHERE parqueadero_id = ? AND activo = TRUE 
      LIMIT 1
    `;
    const [rows] = await dbPool.execute<TarifaActivaRow[]>(query, [parqueaderoId]);
    const tarifa = rows[0];
    return tarifa ? tarifa.id : null;
  }

  async crearTicket(ticket: ITicket): Promise<number> {
    const query = `
      INSERT INTO tickets (
        parqueadero_id, codigo_qr, placa, telefono_whatsapp, 
        tipo_vehiculo, observaciones_danos, fecha_entrada, estado, turno_ingreso_id
      )
      VALUES (?, UUID_TO_BIN(?), ?, ?, 'OCASIONAL', ?, NOW(), 'ACTIVO', ?)
    `;

    const values = [
      ticket.parqueaderoId,
      ticket.codigoQr,
      ticket.placa,
      ticket.telefonoWhatsapp ?? null,
      ticket.observacionesDanos ?? null,
      ticket.turnoIngresoId
    ];

    const [result] = await dbPool.execute<ResultSetHeader>(query, values);
    return result.insertId;
  }

  async finalizarTicket(datos: {
    ticketId: number;
    subtotalBase: number;
    recargoNocturnoAplicado: number;
    aplicoNocturno: boolean;
    totalPagado: number;
    metodoPago: string;
    turnoSalidaId: number;
  }): Promise<void> {
    const query = `
      UPDATE tickets
      SET fecha_salida = NOW(),
          subtotal_base = ?,
          recargo_nocturno_aplicado = ?,
          aplico_nocturno = ?,
          total_pagado = ?,
          metodo_pago = ?,
          turno_salida_id = ?,
          estado = 'FINALIZADO'
      WHERE id = ? AND estado = 'ACTIVO'
    `;

    await dbPool.execute(query, [
      datos.subtotalBase,
      datos.recargoNocturnoAplicado,
      datos.aplicoNocturno ? 1 : 0,
      datos.totalPagado,
      datos.metodoPago,
      datos.turnoSalidaId,
      datos.ticketId
    ]);
  }

  async anularTicket(datos: IAnularTicketDTO): Promise<void> {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Marcar ticket como ANULADO
      const queryTicket = `UPDATE tickets SET estado = 'ANULADO' WHERE id = ? AND parqueadero_id = ?`;
      await connection.execute(queryTicket, [datos.ticketId, datos.parqueaderoId]);

      // 2. Registrar evento en auditoría
      const queryAuditoria = `
        INSERT INTO auditoria_eventos (parqueadero_id, usuario_id, tipo_accion, motivo, detalles)
        VALUES (?, ?, 'ANULACION_TICKET', ?, ?)
      `;
      const detalles = JSON.stringify({ ticketId: datos.ticketId, fechaAnulacion: new Date() });
      await connection.execute(queryAuditoria, [datos.parqueaderoId, datos.usuarioId, datos.motivo, detalles]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private mapearTicketDetalle(fila: TicketConsultaRow): ITicketDetalle {
    return {
      id: fila.id,
      parqueaderoId: fila.parqueadero_id,
      codigoQr: fila.codigoQr,
      placa: fila.placa,
      telefonoWhatsapp: fila.telefono_whatsapp ?? undefined,
      tipoVehiculo: fila.tipo_vehiculo,
      observacionesDanos: fila.observaciones_danos ?? undefined,
      fechaEntrada: new Date(fila.fecha_entrada),
      fechaSalida: fila.fecha_salida ? new Date(fila.fecha_salida) : undefined,
      subtotalBase: Number(fila.subtotal_base),
      recargoNocturnoAplicado: Number(fila.recargo_nocturno_aplicado),
      aplicoNocturno: Boolean(fila.aplico_nocturno),
      totalPagado: Number(fila.total_pagado),
      metodoPago: fila.metodo_pago ?? undefined,
      estado: fila.estado,
      turnoIngresoId: fila.turno_ingreso_id,
      turnoSalidaId: fila.turno_salida_id ?? undefined,
      tarifa: {
        precioBaseHora: Number(fila.precio_base_hora),
        minutosGracia: fila.minutos_gracia,
        horaInicioNocturna: fila.hora_inicio_nocturna,
        horaFinNocturna: fila.hora_fin_nocturna,
        tipoRecargoNocturno: fila.tipo_recargo_nocturno,
        valorRecargoNocturno: Number(fila.valor_recargo_nocturno)
      }
    };
  }
}