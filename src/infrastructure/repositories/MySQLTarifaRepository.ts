import type { ITarifaRepository } from '../../domain/repositories/ITarifaRepository.js';
import type { ITarifa, ICrearTarifaDTO, IActualizarTarifaDTO } from '../../domain/types/tarifa.types.js';
import { dbPool } from '../database/mysql.config.js';
import type { ResultSetHeader } from 'mysql2';
import type { TarifaRow } from '../types/tarifa-mysql.types.js';



export class MySQLTarifaRepository implements ITarifaRepository {

    async buscarActivaPorParqueadero(parqueaderoId: number): Promise<ITarifa | null> {
        const query = `
      SELECT id, parqueadero_id, nombre, precio_base_hora, minutos_gracia,
             hora_inicio_nocturna, hora_fin_nocturna, tipo_recargo_nocturno,
             valor_recargo_nocturno, precio_mensualidad, activo, actualizado_en
      FROM tarifas
      WHERE parqueadero_id = ? AND activo = TRUE
      LIMIT 1
    `;
        const [rows] = await dbPool.execute<TarifaRow[]>(query, [parqueaderoId]);
        if (!rows[0]) return null;
        return this.mapearTarifa(rows[0]);
    }

    async buscarPorId(id: number, parqueaderoId: number): Promise<ITarifa | null> {
        const query = `
      SELECT id, parqueadero_id, nombre, precio_base_hora, minutos_gracia,
             hora_inicio_nocturna, hora_fin_nocturna, tipo_recargo_nocturno,
             valor_recargo_nocturno, precio_mensualidad, activo, actualizado_en
      FROM tarifas
      WHERE id = ? AND parqueadero_id = ?
      LIMIT 1
    `;
        const [rows] = await dbPool.execute<TarifaRow[]>(query, [id, parqueaderoId]);
        if (!rows[0]) return null;
        return this.mapearTarifa(rows[0]);
    }

    async crear(datos: ICrearTarifaDTO): Promise<ITarifa> {
        const query = `
      INSERT INTO tarifas (
        parqueadero_id, nombre, precio_base_hora, minutos_gracia,
        hora_inicio_nocturna, hora_fin_nocturna, tipo_recargo_nocturno,
        valor_recargo_nocturno, precio_mensualidad, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `;

        const [result] = await dbPool.execute<ResultSetHeader>(query, [
            datos.parqueaderoId,
            datos.nombre ?? 'Tarifa Principal Motos',
            datos.precioBaseHora,
            datos.minutosGracia ?? 5,
            datos.horaInicioNocturna ?? '22:00:00',
            datos.horaFinNocturna ?? '06:00:00',
            datos.tipoRecargoNocturno ?? 'VALOR_FIJO',
            datos.valorRecargoNocturno ?? 3000.00,
            datos.precioMensualidad
        ]);

        const tarifaCreada = await this.buscarPorId(result.insertId, datos.parqueaderoId);
        return tarifaCreada!;
    }

    async actualizar(id: number, parqueaderoId: number, datos: IActualizarTarifaDTO): Promise<ITarifa> {
        const campos: string[] = [];
        const valores: any[] = [];

        if (datos.nombre !== undefined) { campos.push('nombre = ?'); valores.push(datos.nombre); }
        if (datos.precioBaseHora !== undefined) { campos.push('precio_base_hora = ?'); valores.push(datos.precioBaseHora); }
        if (datos.minutosGracia !== undefined) { campos.push('minutos_gracia = ?'); valores.push(datos.minutosGracia); }
        if (datos.horaInicioNocturna !== undefined) { campos.push('hora_inicio_nocturna = ?'); valores.push(datos.horaInicioNocturna); }
        if (datos.horaFinNocturna !== undefined) { campos.push('hora_fin_nocturna = ?'); valores.push(datos.horaFinNocturna); }
        if (datos.tipoRecargoNocturno !== undefined) { campos.push('tipo_recargo_nocturno = ?'); valores.push(datos.tipoRecargoNocturno); }
        if (datos.valorRecargoNocturno !== undefined) { campos.push('valor_recargo_nocturno = ?'); valores.push(datos.valorRecargoNocturno); }
        if (datos.precioMensualidad !== undefined) { campos.push('precio_mensualidad = ?'); valores.push(datos.precioMensualidad); }
        if (datos.activo !== undefined) { campos.push('activo = ?'); valores.push(datos.activo); }

        if (campos.length === 0) {
            const actual = await this.buscarPorId(id, parqueaderoId);
            return actual!;
        }

        const query = `UPDATE tarifas SET ${campos.join(', ')} WHERE id = ? AND parqueadero_id = ?`;
        valores.push(id, parqueaderoId);

        await dbPool.execute(query, valores);
        const tarifaActualizada = await this.buscarPorId(id, parqueaderoId);
        return tarifaActualizada!;
    }

    private mapearTarifa(fila: TarifaRow): ITarifa {
        return {
            id: fila.id,
            parqueaderoId: fila.parqueadero_id,
            nombre: fila.nombre,
            precioBaseHora: Number(fila.precio_base_hora),
            minutosGracia: fila.minutos_gracia,
            horaInicioNocturna: fila.hora_inicio_nocturna,
            horaFinNocturna: fila.hora_fin_nocturna,
            tipoRecargoNocturno: fila.tipo_recargo_nocturno,
            valorRecargoNocturno: Number(fila.valor_recargo_nocturno),
            precioMensualidad: Number(fila.precio_mensualidad),
            activo: Boolean(fila.activo),
            actualizadoEn: new Date(fila.actualizado_en)
        };
    }
}