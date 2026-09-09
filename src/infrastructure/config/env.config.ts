const LONGITUD_MINIMA_JWT_SECRET = 32;

export function obtenerJwtSecret(): string {
    const secreto = process.env.JWT_SECRET;
    if (!secreto || secreto.length < LONGITUD_MINIMA_JWT_SECRET) {
        throw new Error(
            `JWT_SECRET no está configurado o tiene menos de ${LONGITUD_MINIMA_JWT_SECRET} caracteres. ` +
            'Define una clave segura en el archivo .env antes de arrancar.'
        );
    }
    return secreto;
}

export function obtenerJwtExpiraEn(): string {
    return process.env.JWT_EXPIRES_IN?.trim() || '8h';
}