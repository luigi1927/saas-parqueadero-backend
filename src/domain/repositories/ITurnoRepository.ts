import type { ITurnoCaja, IAbrirTurnoDTO, ICerrarTurnoDTO, IResumenVentasTurno } from '../types/turno.types.js';

export interface ITurnoRepository {
    /**
     * Obtiene el turno actualmente abierto para un usuario dentro de un parqueadero específico.
     */
    buscarTurnoAbiertoPorUsuario(parqueaderoId: number, usuarioId: number): Promise<ITurnoCaja | null>;

    /**
     * Busca un turno por su ID e ID de parqueadero.
     */
    buscarPorId(turnoId: number, parqueaderoId: number): Promise<ITurnoCaja | null>;

    /**
     * Registra el inicio de jornada de un cajero/operario con su base inicial de dinero.
     */
    abrirTurno(datos: IAbrirTurnoDTO): Promise<number>;

    /**
     * Obtiene la suma total del efectivo recaudado por salidas de tickets durante la vigencia del turno.
     */
    calcularVentasEfectivoTurno(turnoId: number): Promise<IResumenVentasTurno>;

    /**
     * Procesa el arqueo ciego, guarda los totales finales, la diferencia (sobrante/faltante) y cambia el estado a 'CERRADO'.
     */
    cerrarTurno(datos: {
        turnoId: number;
        efectivoReportado: number;
        efectivoCalculado: number;
        diferencia: number;
        observaciones?: string | undefined;
    }): Promise<void>;
}