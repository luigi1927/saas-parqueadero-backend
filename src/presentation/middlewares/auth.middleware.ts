import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
    usuarioId: number;
    parqueaderoId: number;
    rolId: number;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

    if (!token) {
        res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET || 'secret_key';
        const decoded = jwt.verify(token, secret) as JwtPayload;

        // Inyectamos los datos del usuario logueado en el objeto Request
        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};