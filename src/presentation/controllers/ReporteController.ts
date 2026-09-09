import type { Request, Response } from 'express';
import { ConsultarReporteRecaudoUseCase } from '../../application/use-cases/ConsultarReporteRecaudoUseCase.js';
import { MySQLReporteRepository } from '../../infrastructure/repositories/MySQLReporteRepository.js';
import { ConsultarAuditoriaUseCase } from '../../application/use-cases/ConsultarAuditoriaUseCase.js';
import { MySQLAuditoriaRepository } from '../../infrastructure/repositories/MySQLAuditoriaRepository.js';
import { ConsultarReporteOperativoUseCase } from '../../application/use-cases/ConsultarReporteOperativoUseCase.js';
import type { IMoraFiltros } from '../../domain/types/reporte.types.js';

const useCase = new ConsultarReporteRecaudoUseCase(new MySQLReporteRepository());
const operativoUseCase = new ConsultarReporteOperativoUseCase(new MySQLReporteRepository());
const auditoriaUseCase = new ConsultarAuditoriaUseCase(new MySQLAuditoriaRepository());

export class ReporteController {
    static async recaudo(req: Request, res: Response): Promise<void> {
        try {
            const fechaInicio = typeof req.query.fechaInicio === 'string' ? req.query.fechaInicio : '';
            const fechaFin = typeof req.query.fechaFin === 'string' ? req.query.fechaFin : '';
            res.status(200).json({ data: await useCase.ejecutar(req.user!.parqueaderoId, { fechaInicio, fechaFin }) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible generar el reporte.' });
        }
    }

    static async cuadreCaja(req: Request, res: Response): Promise<void> {
        await ReporteController.generarOperativo(req, res, (parqueaderoId, inicio, fin) =>
            operativoUseCase.cuadreCaja(parqueaderoId, inicio, fin));
    }

    static async egresos(req: Request, res: Response): Promise<void> {
        await ReporteController.generarOperativo(req, res, (parqueaderoId, inicio, fin) =>
            operativoUseCase.egresos(parqueaderoId, inicio, fin));
    }

    static async ocupacion(req: Request, res: Response): Promise<void> {
        await ReporteController.generarOperativo(req, res, (parqueaderoId, inicio, fin) =>
            operativoUseCase.ocupacion(parqueaderoId, inicio, fin));
    }

    static async mora(req: Request, res: Response): Promise<void> {
        try {
            const estado = typeof req.query.estado === 'string' ? req.query.estado : undefined;
            if (estado !== undefined && !['AL_DIA', 'POR_VENCER', 'VENCIDO'].includes(estado)) {
                res.status(400).json({ error: 'El estado de mora no es válido.' });
                return;
            }
            const fechaInicio = typeof req.query.fechaInicio === 'string' ? req.query.fechaInicio : undefined;
            if (fechaInicio !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
                res.status(400).json({ error: 'La fecha de inicio no es válida.' });
                return;
            }
            const pagina = Number(req.query.pagina ?? 1);
            const limite = Number(req.query.limite ?? 20);
            const filtrosMora: IMoraFiltros = {
                estado: estado as 'AL_DIA' | 'POR_VENCER' | 'VENCIDO' | undefined,
                pagina,
                limite
            };
            if (fechaInicio !== undefined) filtrosMora.fechaInicio = fechaInicio;
            res.status(200).json({
                data: await operativoUseCase.mora(req.user!.parqueaderoId, filtrosMora)
            });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible generar el reporte.' });
        }
    }

    static async recaudoMensualidades(req: Request, res: Response): Promise<void> {
        await ReporteController.generarOperativo(req, res, (parqueaderoId, inicio, fin) =>
            operativoUseCase.recaudoMensualidades(parqueaderoId, inicio, fin));
    }

    static async desercion(req: Request, res: Response): Promise<void> {
        await ReporteController.generarOperativo(req, res, (parqueaderoId, inicio, fin) =>
            operativoUseCase.desercion(parqueaderoId, inicio, fin));
    }

    static async anulaciones(req: Request, res: Response): Promise<void> {
        await ReporteController.generarOperativo(req, res, (parqueaderoId, inicio, fin) =>
            operativoUseCase.anulaciones(parqueaderoId, inicio, fin));
    }

    static async actividadOperarios(req: Request, res: Response): Promise<void> {
        await ReporteController.generarOperativo(req, res, (parqueaderoId, inicio, fin) =>
            operativoUseCase.actividadOperarios(parqueaderoId, inicio, fin));
    }

    static async auditoria(req: Request, res: Response): Promise<void> {
        try {
            const pagina = Number(req.query.pagina ?? 1);
            const limite = Number(req.query.limite ?? 20);
            const tipoAccion = typeof req.query.tipoAccion === 'string' ? req.query.tipoAccion : undefined;
            res.status(200).json({ data: await auditoriaUseCase.ejecutar(req.user!.parqueaderoId, { pagina, limite, tipoAccion }) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible consultar la auditoría.' });
        }
    }

    private static async generarOperativo(
        req: Request,
        res: Response,
        consulta: (parqueaderoId: number, fechaInicio: string, fechaFin: string) => Promise<unknown>
    ): Promise<void> {
        try {
            const fechaInicio = typeof req.query.fechaInicio === 'string' ? req.query.fechaInicio : '';
            const fechaFin = typeof req.query.fechaFin === 'string' ? req.query.fechaFin : '';
            res.status(200).json({ data: await consulta(req.user!.parqueaderoId, fechaInicio, fechaFin) });
        } catch (error: unknown) {
            res.status(400).json({ error: error instanceof Error ? error.message : 'No fue posible generar el reporte.' });
        }
    }
}