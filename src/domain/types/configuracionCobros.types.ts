export interface IConfiguracionCobrosDigitales {
    parqueaderoId: number;
    nequiNumero?: string | undefined;
    nequiAlias?: string | undefined;
    daviplataNumero?: string | undefined;
    daviplataAlias?: string | undefined;
    breveNumero?: string | undefined;
    breveAlias?: string | undefined;
    mensajePie?: string | undefined;
    activo: boolean;
}

export interface IActualizarConfiguracionCobrosDTO {
    nequiNumero?: string | undefined;
    nequiAlias?: string | undefined;
    daviplataNumero?: string | undefined;
    daviplataAlias?: string | undefined;
    breveNumero?: string | undefined;
    breveAlias?: string | undefined;
    mensajePie?: string | undefined;
    activo?: boolean | undefined;
}