import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { MySQLUsuarioRepository } from '../../infrastructure/repositories/MySQLUsuarioRepository.js';
import { LoginOperarioUseCase } from '../../application/use-cases/LoginOperarioUseCase.js';
import { RecuperarAccesoUseCase } from '../../application/use-cases/RecuperarAccesoUseCase.js';
import { whatsappService } from '../../infrastructure/services/whatsappInstance.js';

const usuarioRepository = new MySQLUsuarioRepository();
const loginOperarioUseCase = new LoginOperarioUseCase(usuarioRepository);
const recuperarAccesoUseCase = new RecuperarAccesoUseCase(usuarioRepository, whatsappService);

export class AuthController {

    static async loginOperario(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId, documentoId, pin } = req.body;

            // Validación simple de entrada (parqueaderoId es opcional: se resuelve por documentoId + pin si no se envía)
            if (!documentoId || !pin) {
                res.status(400).json({ error: 'Faltan campos obligatorios' });
                return;
            }

            const resultado = parqueaderoId
                ? await loginOperarioUseCase.ejecutar({
                    parqueaderoId: Number(parqueaderoId),
                    documentoId: String(documentoId),
                    pin: String(pin)
                })
                : await loginOperarioUseCase.ejecutarSinParqueadero({
                    documentoId: String(documentoId),
                    pin: String(pin)
                });

            res.status(200).json(resultado);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    }

    static async loginSuperAdmin(req: Request, res: Response): Promise<void> {
        try {
            const { documentoId, pin } = req.body;
            if (!documentoId || !pin) {
                res.status(400).json({ error: 'Documento y PIN son requeridos.' });
                return;
            }
            const resultado = await loginOperarioUseCase.ejecutar({
                parqueaderoId: null,
                documentoId: String(documentoId),
                pin: String(pin)
            });
            if (resultado.usuario.rolNombre !== 'SUPER_ADMIN') {
                res.status(403).json({ error: 'La cuenta no tiene rol SUPER_ADMIN.' });
                return;
            }
            res.status(200).json(resultado);
        } catch (error: unknown) {
            res.status(401).json({ error: error instanceof Error ? error.message : 'Credenciales inválidas.' });
        }
    }

    static async solicitarCodigoRecuperacion(req: Request, res: Response): Promise<void> {
        try {
            const { documentoId, telefono } = req.body;
            if (!documentoId || !telefono) {
                res.status(400).json({ error: 'Documento y teléfono son requeridos.' });
                return;
            }

            await recuperarAccesoUseCase.solicitarCodigo({ documentoId: String(documentoId), telefono: String(telefono), ip: req.ip ?? null });
            res.status(200).json({
                mensaje: 'Si el documento y teléfono coinciden con una cuenta activa, recibirás un código por WhatsApp.'
            });
        } catch (error: unknown) {
            const mensaje = error instanceof Error ? error.message : 'No fue posible enviar el código de recuperación.';
            res.status(error instanceof TypeError ? 400 : 500).json({ error: mensaje });
        }
    }

    static async confirmarRestablecimientoPin(req: Request, res: Response): Promise<void> {
        try {
            const { documentoId, telefono, codigo, nuevoPin } = req.body;
            if (!documentoId || !telefono || !codigo || !nuevoPin) {
                res.status(400).json({ error: 'Todos los campos son requeridos.' });
                return;
            }

            await recuperarAccesoUseCase.confirmarRestablecimiento({
                documentoId: String(documentoId),
                telefono: String(telefono),
                codigo: String(codigo),
                nuevoPin: String(nuevoPin)
            });
            res.status(200).json({ mensaje: 'Tu PIN ha sido restablecido. Ya puedes iniciar sesión.' });
        } catch (error: unknown) {
            const mensaje = error instanceof Error ? error.message : 'No fue posible restablecer el PIN.';
            res.status(error instanceof TypeError ? 400 : 401).json({ error: mensaje });
        }
    }

    static async cambiarPin(req: Request, res: Response): Promise<void> {
        try {
            const { pinActual, pinNuevo } = req.body;
            if (!pinActual || !pinNuevo) {
                throw new TypeError('El PIN actual y el nuevo son requeridos.');
            }
            if (!/^\d{4,8}$/.test(String(pinNuevo))) {
                throw new TypeError('El PIN nuevo debe tener entre 4 y 8 dígitos.');
            }

            const usuario = await usuarioRepository.buscarPorId(req.user!.usuarioId);
            if (!usuario || !usuario.pinHash) {
                throw new TypeError('La cuenta no tiene un PIN asignado.');
            }
            const coincide = await bcrypt.compare(String(pinActual), usuario.pinHash);
            if (!coincide) {
                throw new TypeError('El PIN actual es incorrecto.');
            }

            const pinHash = await bcrypt.hash(String(pinNuevo), 10);
            await usuarioRepository.restablecerPin(usuario.id!, pinHash);
            res.status(200).json({ mensaje: 'Tu PIN ha sido actualizado.' });
        } catch (error: unknown) {
            const mensaje = error instanceof Error ? error.message : 'No fue posible cambiar el PIN.';
            res.status(error instanceof TypeError ? 400 : 500).json({ error: mensaje });
        }
    }
}