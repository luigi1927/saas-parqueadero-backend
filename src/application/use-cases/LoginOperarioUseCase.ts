import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { IUsuario, IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository.js';
import { obtenerJwtExpiraEn, obtenerJwtSecret } from '../../infrastructure/config/env.config.js';

interface LoginInput {
    parqueaderoId: number | null;
    documentoId: string;
    pin: string;
}

interface LoginSinParqueaderoInput {
    documentoId: string;
    pin: string;
}

interface OpcionParqueadero {
    parqueaderoId: number | null;
    nombreParqueadero: string | null;
}

interface ResultadoSeleccionParqueadero {
    requiereSeleccionParqueadero: true;
    opciones: OpcionParqueadero[];
}

export class LoginOperarioUseCase {
    constructor(private readonly usuarioRepository: IUsuarioRepository) { }

    async ejecutar(data: LoginInput) {
        const usuario = await this.usuarioRepository.buscarPorDocumento(data.parqueaderoId, data.documentoId);

        // Validar existencia
        if (!usuario) {
            throw new Error('Credenciales inválidas'); // Mensaje genérico por seguridad
        }

        return this.autenticar(usuario, data.pin);
    }

    // Login sin parqueaderoId explícito: resuelve la cuenta a partir del documentoId + pin.
    async ejecutarSinParqueadero(data: LoginSinParqueaderoInput): Promise<ResultadoSeleccionParqueadero | ReturnType<LoginOperarioUseCase['construirRespuesta']>> {
        const candidatos = await this.usuarioRepository.buscarCuentasActivasPorDocumento(data.documentoId);

        if (candidatos.length === 0) {
            throw new Error('Credenciales inválidas');
        }

        if (candidatos.length === 1) {
            return this.autenticar(candidatos[0]!, data.pin);
        }

        // El mismo documentoId existe en varios parqueaderos: hay que desambiguar por PIN.
        const activos = candidatos.filter((c) => c.estado !== 'BLOQUEADO');
        if (activos.length === 0) {
            throw new Error('Cuenta bloqueada por múltiples intentos fallidos. Contacte al administrador.');
        }

        const validaciones = await Promise.all(
            activos.map(async (usuario) => ({ usuario, valido: await bcrypt.compare(data.pin, usuario.pinHash) }))
        );
        const matches = validaciones.filter((v) => v.valido).map((v) => v.usuario);

        if (matches.length === 0) {
            await Promise.all(activos.map((usuario) => this.registrarFalloIntento(usuario)));
            throw new Error('Credenciales inválidas');
        }

        if (matches.length === 1) {
            return this.autenticar(matches[0]!, data.pin);
        }

        // El PIN es válido en más de un parqueadero: se le pide al operario elegir cuál.
        return {
            requiereSeleccionParqueadero: true,
            opciones: matches.map((usuario) => ({
                parqueaderoId: usuario.parqueaderoId,
                nombreParqueadero: usuario.nombreParqueadero ?? null
            }))
        };
    }

    private async autenticar(usuario: IUsuario, pin: string) {
        // Validar estado de bloqueo
        if (usuario.estado === 'BLOQUEADO') {
            throw new Error('Cuenta bloqueada por múltiples intentos fallidos. Contacte al administrador.');
        }

        // Validar PIN con bcrypt
        const pinValido = await bcrypt.compare(pin, usuario.pinHash);

        if (!pinValido) {
            const intentosActuales = usuario.intentosFallidosPin + 1;

            if (intentosActuales >= 3) {
                await this.usuarioRepository.bloquearUsuario(usuario.id!);
                throw new Error('Has superado el límite de 3 intentos. Tu cuenta ha sido BLOQUEADA.');
            } else {
                await this.usuarioRepository.registrarIntentoFallido(usuario.id!, intentosActuales);
                const intentosRestantes = 3 - intentosActuales;
                throw new Error(`PIN incorrecto. Te quedan ${intentosRestantes} intento(s).`);
            }
        }

        // Si el PIN es correcto, reseteamos contadores de error
        if (usuario.intentosFallidosPin > 0) {
            await this.usuarioRepository.resetearIntentos(usuario.id!);
        }

        return this.construirRespuesta(usuario);
    }

    private async registrarFalloIntento(usuario: IUsuario): Promise<void> {
        const intentosActuales = usuario.intentosFallidosPin + 1;
        if (intentosActuales >= 3) {
            await this.usuarioRepository.bloquearUsuario(usuario.id!);
        } else {
            await this.usuarioRepository.registrarIntentoFallido(usuario.id!, intentosActuales);
        }
    }

    private construirRespuesta(usuario: IUsuario) {
        const token = jwt.sign(
            {
                usuarioId: usuario.id,
                parqueaderoId: usuario.parqueaderoId ?? 0,
                rolId: usuario.rolId,
                rolNombre: usuario.rolNombre
            },
            obtenerJwtSecret(),
            { expiresIn: obtenerJwtExpiraEn() as NonNullable<jwt.SignOptions['expiresIn']> }
        );

        return {
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                documentoId: usuario.documentoId,
                rolId: usuario.rolId,
                rolNombre: usuario.rolNombre
            }
        };
    }
}