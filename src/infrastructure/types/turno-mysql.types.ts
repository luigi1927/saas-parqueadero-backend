import type { RowDataPacket } from 'mysql2';

export interface TurnoCajaRow extends RowDataPacket {
    id: number;
    parqueadero_id: number;
    usuario_id: number;
    monto_inicial_base: number;
    monto_efectivo_declarado: number | null;
    monto_efectivo_esperado: number | null;
    total_egresos_caja: number;
    diferencia_cuadre: number | null;
    fecha_apertura: Date;
    fecha_cierre: Date | null;
    estado: 'ABIERTO' | 'CERRADO';
}

export interface VentasTurnoRow extends RowDataPacket {
    totalEfectivo: number | null;
    totalOtros: number | null;
    totalTickets: number;
}

export interface TurnoHistorialRow extends RowDataPacket {
    id: number;
    monto_inicial_base: number;
    total_egresos_caja: number;
    monto_efectivo_declarado: number | null;
    monto_efectivo_esperado: number | null;
    diferencia_cuadre: number | null;
    fecha_apertura: Date;
    fecha_cierre: Date | null;
    estado: 'ABIERTO' | 'CERRADO';
    abierto_por: string | null;
    ventas_efectivo: number;
}