import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2';
import { dbPool } from '../../infrastructure/database/mysql.config.js';
import { obtenerJwtSecret } from '../../infrastructure/config/env.config.js';

interface JwtPayload {
    usuarioId: number;
    parqueaderoId: number;
    rolId: number;
    rolNombre: 'SUPER_ADMIN' | 'ADMIN_PARQUEADERO' | 'OPERARIO' | 'CLIENTE';
}

interface UsuarioSesionRow extends RowDataPacket {
    estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
    parqueaderoId: number | null;
    rolId: number;
    rolNombre: 'SUPER_ADMIN' | 'ADMIN_PARQUEADERO' | 'OPERARIO' | 'CLIENTE';
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

    if (!token) {
        res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, obtenerJwtSecret()) as JwtPayload;

        // Validación de sesión vigente: la cuenta debe seguir ACTIVA y con el mismo rol.
        // Esto revoca tokens de usuarios bloqueados/inactivos o con permisos cambiados.
        const [rows] = await dbPool.execute<UsuarioSesionRow[]>(`
            SELECT usuario.estado, usuario.parqueadero_id AS parqueaderoId,
                   usuario.rol_id AS rolId, rol.nombre AS rolNombre
            FROM usuarios usuario
            INNER JOIN roles rol ON rol.id = usuario.rol_id
            WHERE usuario.id = ?
            LIMIT 1
        `, [decoded.usuarioId]);

        const usuarioSesion = rows[0];
        if (!usuarioSesion || usuarioSesion.estado !== 'ACTIVO') {
            res.status(403).json({ error: 'Tu cuenta no está activa o fue bloqueada. Vuelve a iniciar sesión.' });
            return;
        }
        if (usuarioSesion.rolNombre !== decoded.rolNombre) {
            res.status(403).json({ error: 'Tus permisos cambiaron. Vuelve a iniciar sesión.' });
            return;
        }

        // Inyectamos los datos vigentes del usuario logueado en el objeto Request
        req.user = {
            usuarioId: decoded.usuarioId,
            parqueaderoId: usuarioSesion.parqueaderoId ?? 0,
            rolId: usuarioSesion.rolId,
            rolNombre: usuarioSesion.rolNombre
        };
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
            res.status(403).json({ error: 'Token inválido o expirado.' });
            return;
        }
        next(error);
    }
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.rolNombre !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Esta operación requiere rol SUPER_ADMIN.' });
        return;
    }
    next();
};

type RolNombre = JwtPayload['rolNombre'];

interface ParqueaderoEstadoRow extends RowDataPacket {
    estado: 'PRUEBA_GRATUITA' | 'ACTIVO' | 'VENCIDO' | 'SUSPENDIDO';
    suscripcion_vigente: number;
    fecha_fin_prueba: Date | null;
}

export const requireRoles = (...rolesPermitidos: RolNombre[]) => (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !rolesPermitidos.includes(req.user.rolNombre)) {
        res.status(403).json({ error: 'No tienes permisos para realizar esta operación.' });
        return;
    }
    next();
};

export const requireParqueaderoOperativo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || req.user.parqueaderoId <= 0) {
        res.status(403).json({ error: 'La operación requiere un parqueadero asignado.' });
        return;
    }
    try {
        const [rows] = await dbPool.execute<ParqueaderoEstadoRow[]>(`
            SELECT parqueadero.estado, parqueadero.fecha_fin_prueba,
                   EXISTS (
                       SELECT 1
                       FROM suscripciones_parqueadero suscripcion
                       WHERE suscripcion.parqueadero_id = parqueadero.id
                         AND suscripcion.estado_pago = 'APROBADO'
                         AND suscripcion.fecha_vencimiento >= CURDATE()
                   ) AS suscripcion_vigente
            FROM parqueaderos parqueadero
            WHERE parqueadero.id = ?
            LIMIT 1
        `, [req.user.parqueaderoId]);
        const parqueadero = rows[0];
        const pruebaVigente = parqueadero?.estado === 'PRUEBA_GRATUITA'
            && parqueadero.fecha_fin_prueba !== null
            && new Date(parqueadero.fecha_fin_prueba) >= new Date();
        const puedeOperar = pruebaVigente
            || (parqueadero?.estado === 'ACTIVO' && parqueadero.suscripcion_vigente === 1);
        if (!puedeOperar) {
            res.status(403).json({ error: 'El parqueadero no está habilitado para operar.' });
            return;
        }
        next();
    } catch (error: unknown) {
        next(error);
    }
};