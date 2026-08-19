import type { ITurnoRepository } from '../../domain/repositories/ITurnoRepository.js';

export class ConsultarEstadoTurnoUseCase {
    constructor(private turnoRepository: ITurnoRepository) { }

    async ejecutar(parqueaderoId: number, usuarioId: number) {
        const turno = await this.turnoRepository.buscarTurnoAbiertoPorUsuario(parqueaderoId, usuarioId);
        if (!turno) return { tieneTurnoAbierto: false, turno: null };

        const ventas = await this.turnoRepository.calcularVentasEfectivoTurno(turno.id);

        // Fórmula en vivo: (Base inicial + Ventas en efectivo) - Gastos registrados
        const efectivoCalculadoActual = (turno.montoInicialEfectivo + ventas.totalEfectivoRecaudado) - turno.totalEgresosCaja;

        return {
            tieneTurnoAbierto: true,
            turno: {
                id: turno.id,
                fechaApertura: turno.fechaApertura,
                montoInicialEfectivo: turno.montoInicialEfectivo,
                totalEgresosCaja: turno.totalEgresosCaja,
                ventasEfectivoActuales: ventas.totalEfectivoRecaudado,
                ventasOtrosMetodosActuales: ventas.totalOtrosMetodos,
                totalTicketsCobrados: ventas.totalTicketsCobrados,
                efectivoEsperadoEnCaja: efectivoCalculadoActual
            }
        };
    }
}