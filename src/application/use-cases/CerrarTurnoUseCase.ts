import type { ITurnoRepository } from '../../domain/repositories/ITurnoRepository.js';
import type { ICerrarTurnoDTO } from '../../domain/types/turno.types.js';

export class CerrarTurnoUseCase {
    constructor(private turnoRepository: ITurnoRepository) { }

    async ejecutar(dto: ICerrarTurnoDTO) {
        if (dto.efectivoReportadoCierre < 0) {
            throw new Error('El efectivo reportado no puede ser un valor negativo.');
        }

        const turno = await this.turnoRepository.buscarPorId(dto.turnoId, dto.parqueaderoId);
        if (!turno) throw new Error('El turno especificado no existe.');
        if (turno.estado !== 'ABIERTO') {
            throw new Error('El turno ya se encuentra cerrado.');
        }

        // 1. Obtener ventas en efectivo durante el turno
        const ventas = await this.turnoRepository.calcularVentasEfectivoTurno(dto.turnoId);

        // Fórmula correcta para el cuadre de caja (Base + Ventas Físicas - Gastos)
        const efectivoCalculadoSistema = turno.montoInicialEfectivo + ventas.totalEfectivoRecaudado - turno.totalEgresosCaja;

        // 3. Diferencia (Reportado - Teórico)
        //  > 0 = Sobrante | < 0 = Faltante | 0 = Exacto
        const diferenciaCierre = dto.efectivoReportadoCierre - efectivoCalculadoSistema;

        // 4. Guardar cierre
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
            totalVentasEfectivo: ventas.totalEfectivoRecaudado,
            totalVentasOtrosMetodos: ventas.totalOtrosMetodos,
            totalTicketsCobrados: ventas.totalTicketsCobrados,
            efectivoCalculadoSistema,
            efectivoReportadoCierre: dto.efectivoReportadoCierre,
            diferenciaCierre,
            estadoDiferencia: diferenciaCierre === 0 ? 'CUADRADO' : diferenciaCierre > 0 ? 'SOBRANTE' : 'FALTANTE',
            estado: 'CERRADO'
        };
    }
}