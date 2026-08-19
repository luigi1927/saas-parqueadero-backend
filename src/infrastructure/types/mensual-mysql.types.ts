import type { RowDataPacket } from 'mysql2';

export interface ClienteRow extends RowDataPacket {
    id: number;
    parqueadero_id: number;
    usuario_id: number | null;
    placa: string;
    nombre_propietario: string;
    telefono_whatsapp: string;
    fecha_inicio: Date;
    fecha_vencimiento: Date;
    estado: 'AL_DIA' | 'POR_VENCER' | 'VENCIDO';
    creado_en: Date;
}

export interface PagoRow extends RowDataPacket {
    id: number;
    parqueadero_id: number;
    cliente_id: number;
    monto: number;
    metodo_pago: 'EFECTIVO' | 'WOMPI_PSE' | 'WOMPI_TARJETA' | 'WOMPI_BRE_B' | 'NEQUI' | 'DAVIPLATA' | 'OTRO';
    transaccion_id: string | null;
    turno_caja_id: number;
    fecha_pago: Date;
}