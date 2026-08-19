import type { ITurnoRepository } from '../../domain/repositories/ITurnoRepository.js';
import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';

export class ConsultarEstadoTurnoUseCase {
    constructor(
        private turnoRepository: ITurnoRepository,
        private clienteMensualRepository: IClienteMensualRepository
    ) { }

    async ejecutar(usuarioId: number, parqueaderoId: number) {
        const turno = await this.turnoRepository.buscarTurnoAbiertoPorUsuario(parqueaderoId, usuarioId);

        if (!turno) {
            return { tieneTurnoAbierto: false, turno: null };
        }

        // 1. Obtener ventas de tickets por horas/fracciones
        const ventasTickets = await this.turnoRepository.calcularVentasEfectivoTurno(turno.id);

        // 2. Obtener recaudo por mensualidades
        const recaudoMensualidades = await this.clienteMensualRepository.calcularRecaudoMensualidadesTurno(turno.id);

        // 3. Unificar totales
        const totalVentasEfectivo = ventasTickets.totalEfectivoRecaudado + recaudoMensualidades.totalEfectivo;
        const totalVentasOtros = ventasTickets.totalOtrosMetodos + recaudoMensualidades.totalOtros;

        const efectivoEsperadoEnCaja = turno.montoInicialEfectivo + totalVentasEfectivo - turno.totalEgresosCaja;

        return {
            tieneTurnoAbierto: true,
            turno: {
                id: turno.id,
                fechaApertura: turno.fechaApertura,
                montoInicialEfectivo: turno.montoInicialEfectivo,
                totalEgresosCaja: turno.totalEgresosCaja,
                ventasEfectivoTickets: ventasTickets.totalEfectivoRecaudado,
                ventasEfectivoMensualidades: recaudoMensualidades.totalEfectivo,
                ventasEfectivoActuales: totalVentasEfectivo,
                ventasOtrosMetodosActuales: totalVentasOtros,
                totalTicketsCobrados: ventasTickets.totalTicketsCobrados,
                efectivoEsperadoEnCaja
            }
        };
    }
}