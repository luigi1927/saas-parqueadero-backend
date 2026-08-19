import type { ITurnoRepository } from '../../domain/repositories/ITurnoRepository.js';
import type { IClienteMensualRepository } from '../../domain/repositories/IClienteMensualRepository.js';
import type { ICerrarTurnoDTO } from '../../domain/types/turno.types.js';

export class CerrarTurnoUseCase {
    constructor(
        private turnoRepository: ITurnoRepository,
        private clienteMensualRepository: IClienteMensualRepository
    ) { }

    async ejecutar(dto: ICerrarTurnoDTO) {
        if (dto.efectivoReportadoCierre < 0) {
            throw new Error('El efectivo reportado no puede ser un valor negativo.');
        }

        const turno = await this.turnoRepository.buscarPorId(dto.turnoId, dto.parqueaderoId);
        if (!turno) throw new Error('El turno especificado no existe.');
        if (turno.estado !== 'ABIERTO') {
            throw new Error('El turno ya se encuentra cerrado.');
        }

        // 1. Obtener recaudos de tickets por rotación (Horas / Fracciones)
        const ventasTickets = await this.turnoRepository.calcularVentasEfectivoTurno(dto.turnoId);

        // 2. Obtener recaudos de suscripciones de clientes mensuales
        const recaudoMensualidades = await this.clienteMensualRepository.calcularRecaudoMensualidadesTurno(dto.turnoId);

        // 3. Consolidación de ingresos
        const totalVentasEfectivo = ventasTickets.totalEfectivoRecaudado + recaudoMensualidades.totalEfectivo;
        const totalVentasOtrosMetodos = ventasTickets.totalOtrosMetodos + recaudoMensualidades.totalOtros;

        // Fórmula de arqueo (Base + Efectivo Total Recaudado - Egresos de Caja)
        const efectivoCalculadoSistema = turno.montoInicialEfectivo + totalVentasEfectivo - turno.totalEgresosCaja;

        // 4. Diferencia (Reportado - Teórico)
        const diferenciaCierre = dto.efectivoReportadoCierre - efectivoCalculadoSistema;

        // 5. Guardar cierre
        await this.turnoRepository.cerrarTurno({
            turnoId: dto.turnoId,
            efectivoReportado: dto.efectivoReportadoCierre,
            efectivoCalculado: efectivoCalculadoSistema,
            diferencia: diferenciaCierre,
            observaciones: dto.observacionesCierre
        });

        return {
            turnoId: dto.turnoId,
            fechaApertura: turno.fechaApertura,
            fechaCierre: new Date(),
            montoInicialEfectivo: turno.montoInicialEfectivo,
            totalEgresosCaja: turno.totalEgresosCaja,
            totalVentasEfectivoTickets: ventasTickets.totalEfectivoRecaudado,
            totalVentasEfectivoMensualidades: recaudoMensualidades.totalEfectivo,
            totalVentasEfectivo,
            totalVentasOtrosMetodos,
            totalTicketsCobrados: ventasTickets.totalTicketsCobrados,
            efectivoCalculadoSistema,
            efectivoReportadoCierre: dto.efectivoReportadoCierre,
            diferenciaCierre,
            estadoDiferencia: diferenciaCierre === 0 ? 'CUADRADO' : diferenciaCierre > 0 ? 'SOBRANTE' : 'FALTANTE',
            estado: 'CERRADO'
        };
    }
}