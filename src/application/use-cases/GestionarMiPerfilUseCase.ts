import type { IParqueaderoRepository } from '../../domain/repositories/IParqueaderoRepository.js';
import type { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository.js';
import type { IPlanSaasRepository } from '../../domain/repositories/IPlanSaasRepository.js';
import type { IParqueaderoDetalle, IRenovarSuscripcionParqueaderoDTO } from '../../domain/types/parqueadero.types.js';
import type { IPlanSaas } from '../../domain/types/planSaas.types.js';
import type { IAdministradorPropio, ISuscripcionMembresia } from '../../domain/types/miPerfil.types.js';

const METODOS_PAGO = ['WOMPI_PSE', 'WOMPI_TARJETA', 'WOMPI_BRE_B', 'NEQUI', 'TRANSFERENCIA'] as const;

export class GestionarMiPerfilUseCase {
    constructor(
        private readonly parqueaderoRepository: IParqueaderoRepository,
        private readonly usuarioRepository: IUsuarioRepository,
        private readonly planRepository: IPlanSaasRepository
    ) { }

    async obtenerParqueaderoPropio(parqueaderoId: number): Promise<IParqueaderoDetalle> {
        this.validarParqueadero(parqueaderoId);
        const detalle = await this.parqueaderoRepository.obtenerDetalle(parqueaderoId);
        if (!detalle) throw new Error('El parqueadero no existe.');
        return detalle;
    }

    async listarPlanes(): Promise<IPlanSaas[]> {
        return this.planRepository.listar();
    }

    async listarPagos(parqueaderoId: number): Promise<ISuscripcionMembresia[]> {
        this.validarParqueadero(parqueaderoId);
        return this.parqueaderoRepository.listarSuscripciones(parqueaderoId);
    }

    async obtenerAdministradorPropio(parqueaderoId: number, usuarioId: number): Promise<IAdministradorPropio> {
        this.validarParqueadero(parqueaderoId);
        this.validarUsuario(usuarioId);
        const usuario = await this.usuarioRepository.buscarPorId(usuarioId);
        if (!usuario?.id || usuario.parqueaderoId !== parqueaderoId || usuario.rolNombre !== 'ADMIN_PARQUEADERO') {
            throw new Error('No fue posible consultar los datos del administrador.');
        }
        return {
            id: usuario.id,
            nombre: usuario.nombre,
            documentoId: usuario.documentoId,
            telefono: usuario.telefono,
            email: usuario.email ?? undefined,
            estado: usuario.estado
        };
    }

    async mejorarPlan(parqueaderoId: number, usuarioId: number, datos: IRenovarSuscripcionParqueaderoDTO): Promise<number> {
        this.validarParqueadero(parqueaderoId);
        this.validarUsuario(usuarioId);
        if (!Number.isInteger(datos.planId) || datos.planId <= 0) throw new TypeError('El plan no es válido.');
        if (!(METODOS_PAGO as readonly string[]).includes(datos.metodoPago)) throw new TypeError('El método de pago no es válido.');
        if (!datos.transaccionId?.trim()) throw new TypeError('La referencia de transacción es requerida.');
        // El autoservicio NO puede auto-desbloquear funciones: la nueva suscripción queda
// en estado PENDIENTE hasta que el SUPER_ADMIN confirme el pago recibido.
// Mientras tanto el parque conserva el plan pagado vigente (fallback en obtenerVigenteYEstado).
return this.parqueaderoRepository.renovarSuscripcion(parqueaderoId, usuarioId, {
            planId: datos.planId,
            metodoPago: datos.metodoPago,
            transaccionId: datos.transaccionId.trim()
        }, 'PENDIENTE');
    }

    private validarParqueadero(parqueaderoId: number): void {
        if (!Number.isInteger(parqueaderoId) || parqueaderoId <= 0) {
            throw new TypeError('La operación requiere un parqueadero asignado.');
        }
    }

    private validarUsuario(usuarioId: number): void {
        if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
            throw new TypeError('La operación requiere un usuario válido.');
        }
    }
}
