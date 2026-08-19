import type {
    IClienteMensual,
    IPagoMensualidad,
    ICrearClienteMensualDTO,
    IRegistrarPagoMensualidadDTO
} from '../types/clienteMensual.types.js';

export interface IClienteMensualRepository {
    crearCliente(datos: ICrearClienteMensualDTO): Promise<IClienteMensual>;
    buscarPorId(id: number, parqueaderoId: number): Promise<IClienteMensual | null>;
    buscarPorPlaca(placa: string, parqueaderoId: number): Promise<IClienteMensual | null>;
    listarPorParqueadero(parqueaderoId: number): Promise<IClienteMensual[]>;
    registrarPago(datos: IRegistrarPagoMensualidadDTO): Promise<IPagoMensualidad>;
    listarPagosPorCliente(clienteMensualId: number, parqueaderoId: number): Promise<IPagoMensualidad[]>;
    calcularRecaudoMensualidadesTurno(turnoId: number): Promise<{ totalEfectivo: number; totalOtros: number }>;
}