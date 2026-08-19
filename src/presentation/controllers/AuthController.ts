import type { Request, Response } from 'express';
import { MySQLUsuarioRepository } from '../../infrastructure/repositories/MySQLUsuarioRepository.js';
import { LoginOperarioUseCase } from '../../application/use-cases/LoginOperarioUseCase.js';

const usuarioRepository = new MySQLUsuarioRepository();
const loginOperarioUseCase = new LoginOperarioUseCase(usuarioRepository);

export class AuthController {

    static async loginOperario(req: Request, res: Response): Promise<void> {
        try {
            const { parqueaderoId, documentoId, pin } = req.body;

            // Validación simple de entrada
            if (!parqueaderoId || !documentoId || !pin) {
                res.status(400).json({ error: 'Faltan campos obligatorios' });
                return;
            }

            const resultado = await loginOperarioUseCase.ejecutar({
                parqueaderoId: Number(parqueaderoId),
                documentoId: String(documentoId),
                pin: String(pin)
            });

            res.status(200).json(resultado);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    }
}