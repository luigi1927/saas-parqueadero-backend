export interface IEgresoCaja {
    id: number;
    turnoCajaId: number;
    usuarioId: number;
    monto: number;
    motivo: string;
    fechaRegistro: Date;
}

export interface IRegistrarEgresoDTO {
    turnoCajaId: number;
    usuarioId: number;
    monto: number;
    motivo: string;
}