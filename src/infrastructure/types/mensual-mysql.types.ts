import type { RowDataPacket } from 'mysql2';

export interface ClienteRow extends RowDataPacket {
    id: number;
    parqueadero_id: number;
    usuario_id: number | null;
    placa: string;
    codigo_qr: string | null;
    nombre_propietario: string;
    tratamiento: 'SR' | 'SRA' | 'NEUTRO' | null;
    telefono_whatsapp: string;
    documento_identidad: string | null;
    dia_pago_mensual: number;
    fecha_inicio: Date;
    fecha_vencimiento: Date;
    estado: 'AL_DIA' | 'POR_VENCER' | 'VENCIDO' | 'CANCELADA';
    creado_en: Date;
}

export interface PagoRow extends RowDataPacket {
    id: number;
    parqueadero_id: number;
    cliente_id: number;
    monto: number;
    metodo_pago: 'EFECTIVO' | 'WOMPI_PSE' | 'WOMPI_TARJETA' | 'WOMPI_BRE_B' | 'NEQUI' | 'DAVIPLATA' | 'OTRO';
    transaccion_id: string | null;
    turno_caja_id: number | null;
    periodo_pagado_inicio: Date;
    periodo_pagado_fin: Date;
    fecha_pago: Date;
}