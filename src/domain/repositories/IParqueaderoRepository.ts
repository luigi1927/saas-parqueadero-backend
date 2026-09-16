import type { IParqueaderoAdministrativo, IParqueaderoDetalle, IParqueaderoRegistrado, IRegistrarParqueaderoDTO, IRenovarSuscripcionParqueaderoDTO } from '../types/parqueadero.types.js';
import type { IActualizarParqueaderoPropioDTO, ISuscripcionMembresia } from '../types/miPerfil.types.js';

export interface IParqueaderoRepository {
    registrarConConfiguracion(datos: IRegistrarParqueaderoDTO): Promise<IParqueaderoRegistrado>;
    listarAdministrativos(): Promise<IParqueaderoAdministrativo[]>;
    obtenerDetalle(parqueaderoId: number): Promise<IParqueaderoDetalle | null>;
    cambiarEstado(parqueaderoId: number, estado: 'ACTIVO' | 'SUSPENDIDO', usuarioId: number, motivo: string): Promise<void>;
    renovarSuscripcion(parqueaderoId: number, usuarioId: number, datos: IRenovarSuscripcionParqueaderoDTO, estadoPagoInicial?: 'APROBADO' | 'PENDIENTE'): Promise<number>;
    confirmarSuscripcion(parqueaderoId: number, suscripcionId: number, usuarioId: number): Promise<number>;
    actualizarEstadosPorSuscripcion(): Promise<void>;
    actualizarDatosPropios(parqueaderoId: number, datos: IActualizarParqueaderoPropioDTO): Promise<void>;
    listarSuscripciones(parqueaderoId: number): Promise<ISuscripcionMembresia[]>;
}