import type {
    IClienteMensual,
    IPagoMensualidad,
    ICrearClienteMensualDTO,
    IRegistrarPagoMensualidadDTO,
    IClienteMensualDetalle,
    IClienteMensualQr
} from '../types/clienteMensual.types.js';
import type { IPeriodoMensualidad } from '../services/CalcularPeriodoMensualidad.js';

export interface IClienteMensualRepository {
    crearCliente(datos: ICrearClienteMensualDTO): Promise<IClienteMensual>;
    buscarPorId(id: number, parqueaderoId: number): Promise<IClienteMensual | null>;
    buscarPorUsuarioId(usuarioId: number): Promise<IClienteMensual | null>;
    obtenerDetalle(id: number, parqueaderoId: number): Promise<IClienteMensualDetalle | null>;
    buscarPorPlaca(placa: string, parqueaderoId: number): Promise<IClienteMensual | null>;
    buscarPorCodigoQr(codigoQr: string): Promise<IClienteMensualQr | null>;
    obtenerNombreParqueadero(parqueaderoId: number): Promise<string>;
    tieneAccesoMensual(placa: string, parqueaderoId: number): Promise<boolean>;
    actualizarCliente(id: number, parqueaderoId: number, usuarioId: number, datos: import('../types/clienteMensual.types.js').IActualizarClienteMensualDTO): Promise<IClienteMensual>;
    cambiarPlaca(id: number, parqueaderoId: number, usuarioId: number, placaNueva: string): Promise<IClienteMensual>;
    cambiarEstado(id: number, parqueaderoId: number, estado: 'CANCELADA' | 'AL_DIA' | 'POR_VENCER' | 'VENCIDO', usuarioId: number, motivo: string): Promise<IClienteMensual>;
    listarPorParqueadero(parqueaderoId: number): Promise<IClienteMensual[]>;
    listarAdministrativo(parqueaderoId: number, filtros: import('../types/clienteMensual.types.js').IListarMensualidadesDTO): Promise<import('../types/clienteMensual.types.js').IPaginaMensualidades>;
    obtenerResumenAdministrativo(parqueaderoId: number): Promise<import('../types/clienteMensual.types.js').IResumenMensualidades>;
    obtenerReciboPago(pagoId: number, parqueaderoId: number): Promise<import('../types/clienteMensual.types.js').IReciboMensualidad | null>;
    registrarPago(datos: IRegistrarPagoMensualidadDTO): Promise<IPagoMensualidad>;
    registrarClienteConPago(datos: ICrearClienteMensualDTO, usuarioId: number, turnoCajaId: number, monto: number, periodo: IPeriodoMensualidad): Promise<IClienteMensual>;
    renovarConPago(datos: IRegistrarPagoMensualidadDTO, periodo: IPeriodoMensualidad): Promise<IPagoMensualidad>;
    listarPagosPorCliente(clienteMensualId: number, parqueaderoId: number): Promise<IPagoMensualidad[]>;
    calcularRecaudoMensualidadesTurno(turnoId: number): Promise<{ totalEfectivo: number; totalOtros: number }>;
}