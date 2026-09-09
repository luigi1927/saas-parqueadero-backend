import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import type { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository.js';
import type { IWhatsAppService } from '../../domain/services/IWhatsAppService.js';

const VIGENCIA_MINUTOS = 10;

interface SolicitarCodigoInput {
    documentoId: string;
    telefono: string;
    ip?: string | null;
}

interface ConfirmarRestablecimientoInput {
    documentoId: string;
    telefono: string;
    codigo: string;
    nuevoPin: string;
}

export class RecuperarAccesoUseCase {
    constructor(
        private readonly usuarioRepository: IUsuarioRepository,
        private readonly whatsAppService: IWhatsAppService
    ) { }

    async solicitarCodigo(datos: SolicitarCodigoInput): Promise<void> {
        const documentoId = datos.documentoId.trim();
        const telefono = this.normalizarTelefono(datos.telefono);

        if (!documentoId || !telefono) {
            throw new TypeError('Documento y teléfono son requeridos.');
        }

        // Se busca la cuenta por documento (sin parqueadero específico). Si no existe, no se revela información.
        const cuentas = await this.usuarioRepository.buscarCuentasActivasPorDocumento(documentoId);
        const superAdmin = await this.usuarioRepository.buscarSuperAdminPorDocumento(documentoId);
        const candidatas = superAdmin ? [...cuentas, superAdmin] : cuentas;
        const cuenta = candidatas.find((u) => this.normalizarTelefono(u.telefono) === telefono)
            ?? candidatas.find((u) => u.rolNombre === 'ADMIN_PARQUEADERO')
            ?? candidatas[0];

        if (!cuenta || this.normalizarTelefono(cuenta.telefono) !== telefono) {
            // No se revela si la cuenta existe: mismo mensaje genérico de éxito para evitar enumeración.
            return;
        }

        if (!this.whatsAppService.estaConectado()) {
            throw new Error('El servicio de WhatsApp no está conectado. Inténtalo de nuevo más tarde.');
        }

        // Cooldown por cuenta: si ya existe un código vigente sin consumir, no se reenvía otro.
        await this.usuarioRepository.eliminarCodigosExpirados(cuenta.id!);
        const codigoVigente = await this.usuarioRepository.leerCodigoRecuperacionActivo(cuenta.id!);
        if (codigoVigente && codigoVigente.consumido === 0 && new Date(codigoVigente.expiracion) > new Date()) {
            return;
        }

        const codigo = String(randomInt(100000, 1000000));
        const expiraEn = new Date(Date.now() + VIGENCIA_MINUTOS * 60_000);
        const codigoHash = await bcrypt.hash(codigo, 10);

        await this.usuarioRepository.registrarCodigoRecuperacion(cuenta.id!, codigoHash, expiraEn, datos.ip ?? null);

        await this.whatsAppService.enviarCodigoRecuperacion({
            telefono,
            nombre: cuenta.nombre,
            codigo,
            minutosValidez: VIGENCIA_MINUTOS
        });
    }

    async confirmarRestablecimiento(datos: ConfirmarRestablecimientoInput): Promise<void> {
        const documentoId = datos.documentoId.trim();
        const telefono = this.normalizarTelefono(datos.telefono);
        const codigo = datos.codigo.trim();
        const nuevoPin = datos.nuevoPin.trim();

        if (!documentoId || !telefono || !codigo || !nuevoPin) {
            throw new TypeError('Todos los campos son requeridos.');
        }
        if (!/^\d{4,8}$/.test(nuevoPin)) {
            throw new TypeError('El PIN debe tener entre 4 y 8 dígitos.');
        }

        const cuentas = await this.usuarioRepository.buscarCuentasActivasPorDocumento(documentoId);
        const superAdmin = await this.usuarioRepository.buscarSuperAdminPorDocumento(documentoId);
        const candidatas = superAdmin ? [...cuentas, superAdmin] : cuentas;
        const cuenta = candidatas.find((u) => this.normalizarTelefono(u.telefono) === telefono);

        if (!cuenta || !cuenta.id) {
            throw new Error('No se encontró una cuenta que coincida con los datos ingresados.');
        }

        // Se valida el último código solicitado (vigente y no consumido).
        const codigoId = await this.obtenerCodigoValido(cuenta.id, codigo);
        if (!codigoId) {
            throw new Error('El código es inválido o ha expirado. Solicita uno nuevo.');
        }

        if (codigo === nuevoPin) {
            throw new Error('El nuevo PIN no puede ser igual al código de verificación.');
        }

        const pinHash = await bcrypt.hash(nuevoPin, 10);
        await this.usuarioRepository.marcarCodigoConsumido(codigoId);
        await this.usuarioRepository.restablecerPin(cuenta.id, pinHash);
    }

    private async obtenerCodigoValido(usuarioId: number, codigo: string): Promise<number | null> {
        const fila = await this.usuarioRepository.leerCodigoRecuperacionActivo(usuarioId);
        if (!fila) return null;
        if (fila.consumido === 1) return null;
        if (new Date(fila.expiracion) < new Date()) return null;
        const valido = await bcrypt.compare(codigo, fila.codigoHash);
        return valido ? fila.id : null;
    }

    private normalizarTelefono(telefono: string): string {
        const limpio = telefono.replace(/\D/g, '');
        return limpio.startsWith('57') && limpio.length === 12
            ? limpio.substring(2)
            : limpio;
    }
}