export interface ITicket {
    id?: number;
    parqueaderoId: number;
    codigoQr: string;
    placa: string;
    telefonoWhatsapp?: string | undefined;
    tipoVehiculo?: 'OCASIONAL' | 'MENSUAL' | undefined;
    observacionesDanos?: string | undefined;
    fechaEntrada?: Date | undefined;
    estado?: 'ACTIVO' | 'FINALIZADO' | 'ANULADO' | undefined;
    turnoIngresoId: number;
}

export interface IRegistroEntradaDTO {
    parqueaderoId: number;
    usuarioIngresoId: number;
    placa: string;
    telefonoWhatsapp?: string;
    observacionesDanos?: string;
}

export interface ITicketDetalle {
    id: number;
    parqueaderoId: number;
    codigoQr: string;
    placa: string;
    telefonoWhatsapp?: string | undefined;
    tipoVehiculo: 'OCASIONAL' | 'MENSUAL';
    observacionesDanos?: string | undefined;
    fechaEntrada: Date;
    fechaSalida?: Date | undefined;
    subtotalBase: number;
    recargoNocturnoAplicado: number;
    aplicoNocturno: boolean;
    totalPagado: number;
    metodoPago?: 'EFECTIVO' | 'WOMPI_PSE' | 'WOMPI_TARJETA' | 'WOMPI_BRE_B' | 'NEQUI' | 'DAVIPLATA' | 'OTRO' | undefined;
    estado: 'ACTIVO' | 'FINALIZADO' | 'ANULADO';
    turnoIngresoId: number;
    turnoSalidaId?: number | undefined;

    // Datos de la Tarifa para el cálculo
    tarifa: {
        precioBaseHora: number;
        minutosGracia: number;
        horaInicioNocturna: string;
        horaFinNocturna: string;
        tipoRecargoNocturno: 'PORCENTAJE' | 'VALOR_FIJO' | 'TARIFA_PLANA_PERNOCTA';
        valorRecargoNocturno: number;
    };
}

export interface IRegistrarSalidaDTO {
    ticketId: number;
    parqueaderoId: number;
    usuarioSalidaId: number;
    metodoPago: 'EFECTIVO' | 'WOMPI_PSE' | 'WOMPI_TARJETA' | 'WOMPI_BRE_B' | 'NEQUI' | 'DAVIPLATA' | 'OTRO';
}

export interface IAnularTicketDTO {
    ticketId: number;
    parqueaderoId: number;
    usuarioId: number;
    motivo: string;
}

export interface ITicketRepository {
    buscarTurnoAbierto(parqueaderoId: number, usuarioId: number): Promise<number | null>;
    buscarTicketActivoPorPlaca(parqueaderoId: number, placa: string): Promise<ITicket | null>;
    buscarTicketActivoPorTelefono(telefonoWhatsapp: string): Promise<ITicket | null>;
    buscarTicketPorQr(codigoQr: string): Promise<ITicketDetalle | null>;
    buscarTicketPorId(ticketId: number, parqueaderoId: number): Promise<ITicketDetalle | null>;
    obtenerTarifaVigente(parqueaderoId: number): Promise<number | null>;
    crearTicket(ticket: ITicket): Promise<number>;
    finalizarTicket(datos: {
        ticketId: number;
        subtotalBase: number;
        recargoNocturnoAplicado: number;
        aplicoNocturno: boolean;
        totalPagado: number;
        metodoPago: string;
        turnoSalidaId: number;
    }): Promise<void>;
    anularTicket(datos: IAnularTicketDTO): Promise<void>;
}