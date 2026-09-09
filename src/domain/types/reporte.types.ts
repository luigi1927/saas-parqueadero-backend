import type { MetodoPagoMensualidad } from './clienteMensual.types.js';

export interface IRangoFechas {
    fechaInicio: string;
    fechaFin: string;
}

export interface IReporteRecaudoDTO {
    fechaInicio: string;
    fechaFin: string;
}

export interface IRecaudoPorMetodo {
    metodoPago: MetodoPagoMensualidad | null;
    totalOcasional: number;
    totalMensualidad: number;
    total: number;
}

export interface IRecaudoDia {
    dia: string;
    totalOcasional: number;
    totalMensualidad: number;
    total: number;
}

export interface IReporteRecaudo extends IRangoFechas {
    totalOcasional: number;
    totalMensualidades: number;
    totalRecaudado: number;
    porMetodo: IRecaudoPorMetodo[];
    porDia: IRecaudoDia[];
}

// ---------------------------------------------------------------------------
// Cuadre de caja
// ---------------------------------------------------------------------------

export interface ICuadreTurno {
    turnoId: number;
    cajero: string;
    fechaApertura: string;
    fechaCierre: string | null;
    montoInicial: number;
    ingresosOcasionales: number;
    ingresosMensualidades: number;
    ingresos: number;
    egresos: number;
    esperado: number;
    declarado: number | null;
    diferencia: number | null;
}

export interface IReporteCuadreCaja extends IRangoFechas {
    turnosCerrados: number;
    turnosAbiertos: number;
    totalIngresos: number;
    totalEgresos: number;
    totalEsperado: number;
    totalDeclarado: number | null;
    totalDiferencia: number | null;
    turnos: ICuadreTurno[];
}

// ---------------------------------------------------------------------------
// Egresos de caja menor
// ---------------------------------------------------------------------------

export interface IMontosPorMotivo {
    motivo: string;
    cantidad: number;
    total: number;
}

export interface IMontosPorTurno {
    turnoId: number;
    cajero: string;
    cantidad: number;
    total: number;
}

export interface IReporteEgresos extends IRangoFechas {
    totalEgresos: number;
    cantidadEgresos: number;
    porMotivo: IMontosPorMotivo[];
    porTurno: IMontosPorTurno[];
}

// ---------------------------------------------------------------------------
// Ocupación, rotación e indicadores
// ---------------------------------------------------------------------------

export interface IEntradasPorHora {
    hora: number;
    cantidad: number;
}

export interface IEntradasPorDia {
    dia: string;
    cantidad: number;
}

export interface IReporteOcupacion extends IRangoFechas {
    totalEntradas: number;
    totalSalidas: number;
    activosActuales: number;
    promedioEstadiaMinutos: number;
    maxConcurrentes: number;
    promedioConcurrentes: number;
    horaPico: number | null;
    tarifaEfectivaHora: number;
    ticketPromedio: number;
    entradasPorHora: IEntradasPorHora[];
    entradasPorDia: IEntradasPorDia[];
}

// ---------------------------------------------------------------------------
// Mora de mensualidades
// ---------------------------------------------------------------------------

export interface IMensualidadMora {
    clienteId: number;
    placa: string;
    propietario: string;
    telefono: string;
    vencimiento: string;
    estado: string;
    tipo: 'VENCIDO' | 'POR_VENCER' | 'AL_DIA';
    diasVencido: number | null;
    mesesAdeudados: number;
}

export interface IMoraFiltros {
    estado?: 'VENCIDO' | 'POR_VENCER' | 'AL_DIA' | undefined;
    fechaInicio?: string;
    pagina?: number;
    limite?: number;
}

export interface IPaginaMora {
    items: IMensualidadMora[];
    total: number;
    pagina: number;
    limite: number;
}

export interface IReporteMora {
    alDia: number;
    porVencer: number;
    vencido: number;
    canceladas: number;
    mesesAdeudados: number;
    clientes: IPaginaMora;
}

// ---------------------------------------------------------------------------
// Recaudo de mensualidades
// ---------------------------------------------------------------------------

export interface IRecaudoMensualidadPorMetodo {
    metodoPago: MetodoPagoMensualidad | null;
    cantidad: number;
    total: number;
}

export interface IRecaudoMensualidadMes {
    mes: string;
    cantidad: number;
    total: number;
}

export interface IReporteRecaudoMensualidades extends IRangoFechas {
    totalPagado: number;
    cantidadPagos: number;
    porMetodo: IRecaudoMensualidadPorMetodo[];
    porMes: IRecaudoMensualidadMes[];
}

// ---------------------------------------------------------------------------
// Deserción de mensualidades
// ---------------------------------------------------------------------------

export interface IReporteDesercion extends IRangoFechas {
    activas: number;
    nuevas: number;
    renovacionesEnPeriodo: number;
    canceladasEnPeriodo: number;
    tasaRetencionPorCiento: number;
    porMotivo: IMontosPorMotivo[];
}

// ---------------------------------------------------------------------------
// Anulaciones y cancelaciones
// ---------------------------------------------------------------------------

export interface ITicketAnulado {
    ticketId: number;
    placa: string;
    fechaEntrada: string;
    usuario: string;
    motivo: string | null;
    fechaAnulacion: string;
}

export interface IReporteAnulaciones extends IRangoFechas {
    totalAnulados: number;
    porMotivo: IMontosPorMotivo[];
    tickets: ITicketAnulado[];
    mensualidadesCanceladas: number;
    cancelacionesPorMotivo: IMontosPorMotivo[];
}

// ---------------------------------------------------------------------------
// Actividad por operario
// ---------------------------------------------------------------------------

export interface IAccionAuditoria {
    tipoAccion: string;
    cantidad: number;
}

export interface IActividadOperario {
    operarioId: number;
    nombre: string;
    ingresosRegistrados: number;
    salidasRegistradas: number;
    anulaciones: number;
    recaudo: number;
    accionesAuditoria: IAccionAuditoria[];
}

export interface IReporteActividadOperarios extends IRangoFechas {
    operarios: IActividadOperario[];
}

// ---------------------------------------------------------------------------
// Reportes SaaS (Super Admin)
// ---------------------------------------------------------------------------

export interface IRentabilidadParqueadero {
    parqueaderoId: number;
    nombre: string;
    estado: string;
    planActual: string | null;
    costoPlanMensual: number | null;
    ultimoPagoPlan: number | null;
    recaudoOcasional: number;
    recaudoMensualidades: number;
    recaudoTotal: number;
    margenAproximado: number | null;
}

export interface IReporteRentabilidad extends IRangoFechas {
    totalRecaudado: number;
    totalCostoPlanesMensual: number;
    parqueaderos: IRentabilidadParqueadero[];
}

export interface ISuscripcionProrxima {
    parqueadero: string;
    plan: string;
    vencimiento: string;
}

export interface IReporteSuscripciones extends IRangoFechas {
    vigentes: number;
    porVencer: number;
    vencidas: number;
    sinSuscripcion: number;
    recaudadoPeriodo: number;
    porPlan: { plan: string; cantidad: number }[];
    proximasAVencer: ISuscripcionProrxima[];
}

export interface IUsoPlataformaParqueadero {
    parqueaderoId: number;
    nombre: string;
    estado: string;
    ticketsPeriodo: number;
    mensualesActivos: number;
    turnosCerradosPeriodo: number;
    operarios: number;
    pagosMensualidadPeriodo: number;
    montoRecaudadoPeriodo: number;
}

export interface IReporteUsoPlataforma extends IRangoFechas {
    parqueaderos: IUsoPlataformaParqueadero[];
}