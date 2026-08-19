import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository.js';

interface LoginInput {
    parqueaderoId: number;
    documentoId: string;
    pin: string;
}

export class LoginOperarioUseCase {
    constructor(private usuarioRepository: IUsuarioRepository) { }

    async ejecutar(data: LoginInput) {
        const usuario = await this.usuarioRepository.buscarPorDocumento(data.parqueaderoId, data.documentoId);

        // 1. Validar existencia
        if (!usuario) {
            throw new Error('Credenciales inválidas'); // Mensaje genérico por seguridad
        }

        // 2. Validar estado de bloqueo
        if (usuario.estado === 'BLOQUEADO') {
            throw new Error('Cuenta bloqueada por múltiples intentos fallidos. Contacte al administrador.');
        }

        // 3. Validar PIN con bcrypt
        const pinValido = await bcrypt.compare(data.pin, usuario.pinHash);

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

        // 4. Si el PIN es correcto, reseteamos contadores de error
        if (usuario.intentosFallidosPin > 0) {
            await this.usuarioRepository.resetearIntentos(usuario.id!);
        }

        // 5. Generación de Token JWT
        const token = jwt.sign(
            {
                usuarioId: usuario.id,
                parqueaderoId: usuario.parqueaderoId,
                rolId: usuario.rolId
            },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '8h' }
        );

        return {
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                documentoId: usuario.documentoId,
                rolId: usuario.rolId
            }
        };
    }
}