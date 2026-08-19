import type { RowDataPacket } from 'mysql2';

export interface TarifaRow extends RowDataPacket {
    id: number;
    parqueadero_id: number;
    nombre: string;
    precio_base_hora: number;
    minutos_gracia: number;
    hora_inicio_nocturna: string;
    hora_fin_nocturna: string;
    tipo_recargo_nocturno: 'PORCENTAJE' | 'VALOR_FIJO' | 'TARIFA_PLANA_PERNOCTA';
    valor_recargo_nocturno: number;
    precio_mensualidad: number;
    activo: number | boolean;
    actualizado_en: Date;
}