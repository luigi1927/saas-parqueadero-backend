import type { IPlanSaasRepository } from '../../domain/repositories/IPlanSaasRepository.js';
import type { GemaPlanSaas, IActualizarPlanSaasDTO, ICrearPlanSaasDTO, IPlanSaas } from '../../domain/types/planSaas.types.js';

export class GestionarPlanSaasUseCase {
    constructor(private readonly planRepository: IPlanSaasRepository) { }

    async listar(): Promise<IPlanSaas[]> {
        return this.planRepository.listar();
    }

    async crear(datos: ICrearPlanSaasDTO): Promise<IPlanSaas> {
        this.validar(datos);
        return this.planRepository.crear(datos, this.calcularGema(datos));
    }

    async actualizar(id: number, datos: IActualizarPlanSaasDTO): Promise<IPlanSaas> {
        if (!Number.isInteger(id) || id <= 0) throw new TypeError('El identificador del plan no es válido.');
        this.validar(datos);
        return this.planRepository.actualizar(id, datos, this.calcularGema(datos));
    }

    async eliminar(id: number): Promise<void> {
        if (!Number.isInteger(id) || id <= 0) throw new TypeError('El identificador del plan no es válido.');
        await this.planRepository.eliminar(id);
    }

    calcularGema(datos: ICrearPlanSaasDTO): GemaPlanSaas {
        const funciones = [
            datos.soportaWhatsapp,
            datos.soportaPagosDigitales,
            datos.soportaVerReportes,
            datos.soportaDescargarReportes,
            datos.recordatoriosWhatsapp,
        ].filter(Boolean).length;
        if (funciones <= 1) return 'BRONCE';
        if (funciones <= 3) return 'PLATA';
        if (funciones === 4) return 'ORO';
        return 'DIAMANTE';
    }

    private validar(datos: ICrearPlanSaasDTO): void {
        if (!datos.nombre.trim()) throw new TypeError('El nombre del plan es requerido.');
        if (!Number.isFinite(datos.precioMensual) || datos.precioMensual < 0) throw new TypeError('El precio mensual no es válido.');
        if (!Number.isInteger(datos.limiteMotos) || datos.limiteMotos < 1) throw new TypeError('El límite de motos debe ser mayor a cero.');
    }
}