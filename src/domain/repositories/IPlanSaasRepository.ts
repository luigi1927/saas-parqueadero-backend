import type { GemaPlanSaas, IActualizarPlanSaasDTO, ICrearPlanSaasDTO, IPlanSaas } from '../types/planSaas.types.js';

export interface IPlanParqueaderoAcceso {
    estadoParqueadero: 'PRUEBA_GRATUITA' | 'ACTIVO' | 'VENCIDO' | 'SUSPENDIDO' | null;
    plan: IPlanSaas | null;
}

export interface IPlanSaasRepository {
    listar(): Promise<IPlanSaas[]>;
    crear(datos: ICrearPlanSaasDTO, gema: GemaPlanSaas): Promise<IPlanSaas>;
    actualizar(id: number, datos: IActualizarPlanSaasDTO, gema: GemaPlanSaas): Promise<IPlanSaas>;
    eliminar(id: number): Promise<void>;
    obtenerVigenteYEstado(parqueaderoId: number): Promise<IPlanParqueaderoAcceso>;
}