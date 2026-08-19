import type { RowDataPacket } from 'mysql2';

export interface EgresoRow extends RowDataPacket {
    id: number;
    turno_caja_id: number;
    usuario_id: number;
    monto: number;
    motivo: string;
    fecha_registro: Date;
}
