import bcrypt from 'bcryptjs';
import type { IParqueaderoRepository } from '../../domain/repositories/IParqueaderoRepository.js';
import type { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository.js';
import type { IActualizarAdministradorPropioDTO, IActualizarParqueaderoPropioDTO } from '../../domain/types/miPerfil.types.js';
import type { IParqueaderoAdministrativo, IParqueaderoDetalle, IParqueaderoRegistrado, IRegistrarParqueaderoInput, IRenovarSuscripcionParqueaderoDTO } from '../../domain/types/parqueadero.types.js';

export class RegistrarParqueaderoUseCase {
    constructor(
        private readonly parqueaderoRepository: IParqueaderoRepository,
        private readonly usuarioRepository: IUsuarioRepository
    ) { }

    async ejecutar(datos: IRegistrarParqueaderoInput): Promise<IParqueaderoRegistrado> {
        this.validar(datos);
        const pinAdministradorHash = await bcrypt.hash(datos.pinAdministrador, 10);
        return this.parqueaderoRepository.registrarConConfiguracion({ ...datos, pinAdministradorHash });
    }

    async listar(): Promise<IParqueaderoAdministrativo[]> {
        return this.parqueaderoRepository.listarAdministrativos();
    }

    async detalle(parqueaderoId: number): Promise<IParqueaderoDetalle | null> {
        if (!Number.isInteger(parqueaderoId) || parqueaderoId <= 0) {
            throw new TypeError('El identificador del parqueadero no es válido.');
        }
        return this.parqueaderoRepository.obtenerDetalle(parqueaderoId);
    }

    async cambiarEstado(parqueaderoId: number, usuarioId: number, estado: 'ACTIVO' | 'SUSPENDIDO', motivo: string): Promise<void> {
        if (!motivo.trim()) throw new TypeError('El motivo es requerido.');
        await this.parqueaderoRepository.cambiarEstado(parqueaderoId, estado, usuarioId, motivo.trim());
    }

    async renovarSuscripcion(parqueaderoId: number, usuarioId: number, datos: IRenovarSuscripcionParqueaderoDTO): Promise<number> {
        if (!Number.isInteger(datos.planId) || datos.planId <= 0) throw new TypeError('El plan no es válido.');
        if (!datos.transaccionId.trim()) throw new TypeError('La referencia de transacción es requerida.');
        return this.parqueaderoRepository.renovarSuscripcion(parqueaderoId, usuarioId, datos, 'APROBADO');
    }

    async confirmarSuscripcion(parqueaderoId: number, suscripcionId: number, usuarioId: number): Promise<number> {
        if (!Number.isInteger(parqueaderoId) || parqueaderoId <= 0) {
            throw new TypeError('El identificador del parqueadero no es válido.');
        }
        if (!Number.isInteger(suscripcionId) || suscripcionId <= 0) {
            throw new TypeError('El identificador de la suscripción no es válido.');
        }
        return this.parqueaderoRepository.confirmarSuscripcion(parqueaderoId, suscripcionId, usuarioId);
    }

    async actualizarDatos(parqueaderoId: number, datos: IActualizarParqueaderoPropioDTO): Promise<void> {
        if (!Number.isInteger(parqueaderoId) || parqueaderoId <= 0) {
            throw new TypeError('El identificador del parqueadero no es válido.');
        }
        if (!datos.nombreComercial?.trim() || !datos.ciudad?.trim() || !datos.direccion?.trim() || !datos.telefonoContacto?.trim()) {
            throw new TypeError('Los datos del parqueadero son requeridos.');
        }
        await this.parqueaderoRepository.actualizarDatosPropios(parqueaderoId, {
            nombreComercial: datos.nombreComercial.trim(),
            ciudad: datos.ciudad.trim(),
            direccion: datos.direccion.trim(),
            telefonoContacto: datos.telefonoContacto.trim()
        });
    }

    async actualizarAdministrador(parqueaderoId: number, administradorId: number, datos: IActualizarAdministradorPropioDTO): Promise<void> {
        if (!Number.isInteger(parqueaderoId) || parqueaderoId <= 0) {
            throw new TypeError('El identificador del parqueadero no es válido.');
        }
        if (!Number.isInteger(administradorId) || administradorId <= 0) {
            throw new TypeError('El identificador del administrador no es válido.');
        }
        if (!datos.nombre?.trim() || !datos.telefono?.trim()) {
            throw new TypeError('El nombre y el teléfono son requeridos.');
        }
        const email = datos.email?.trim() || undefined;
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new TypeError('El correo electrónico no es válido.');
        }
        const usuario = await this.usuarioRepository.buscarPorId(administradorId);
        if (!usuario?.id || usuario.parqueaderoId !== parqueaderoId || usuario.rolNombre !== 'ADMIN_PARQUEADERO') {
            throw new Error('El administrador no pertenece al parqueadero.');
        }
        await this.usuarioRepository.actualizarDatosPropios(administradorId, parqueaderoId, {
            nombre: datos.nombre.trim(),
            telefono: datos.telefono.trim(),
            email
        });
    }

    private validar(datos: IRegistrarParqueaderoInput): void {
        if (!datos.nombreComercial.trim() || !datos.nitDocumento.trim() || !datos.ciudad.trim() || !datos.direccion.trim()) {
            throw new TypeError('Los datos comerciales del parqueadero son requeridos.');
        }
        if (!datos.nombreAdministrador.trim() || !datos.documentoAdministrador.trim() || !datos.telefonoAdministrador.trim()) {
            throw new TypeError('Los datos del administrador son requeridos.');
        }
        if (!Number.isInteger(datos.planId) || datos.planId <= 0) {
            throw new TypeError('El plan seleccionado no es válido.');
        }
        if (!/^\d{4,8}$/.test(datos.pinAdministrador)) {
            throw new TypeError('El PIN del administrador debe tener entre 4 y 8 dígitos.');
        }
    }
}