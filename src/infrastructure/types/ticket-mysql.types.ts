import type { RowDataPacket } from 'mysql2';

export interface TurnoActivoRow extends RowDataPacket {
    id: number;
}

export interface TarifaActivaRow extends RowDataPacket {
    id: number;
    precio_base_hora: number;
    minutos_gracia: number;
}

export interface TicketConsultaRow extends RowDataPacket {
    id: number;
    parqueadero_id: number;
    codigoQr: string;
    placa: string;
    telefono_whatsapp: string | null;
    tipo_vehiculo: 'OCASIONAL' | 'MENSUAL';
    observaciones_danos: string | null;
    fecha_entrada: Date;
    fecha_salida: Date | null;
    subtotal_base: number;
    recargo_nocturno_aplicado: number;
    aplico_nocturno: number; // 0 o 1 en MySQL
    total_pagado: number;
    metodo_pago: 'EFECTIVO' | 'WOMPI_PSE' | 'WOMPI_TARJETA' | 'WOMPI_BRE_B' | 'NEQUI' | 'DAVIPLATA' | 'OTRO' | null;
    estado: 'ACTIVO' | 'FINALIZADO' | 'ANULADO';
    turno_ingreso_id: number;
    turno_salida_id: number | null;

    // Datos tarifa
    precio_base_hora: number;
    minutos_gracia: number;
    hora_inicio_nocturna: string;
    hora_fin_nocturna: string;
    tipo_recargo_nocturno: 'PORCENTAJE' | 'VALOR_FIJO' | 'TARIFA_PLANA_PERNOCTA';
    valor_recargo_nocturno: number;
}