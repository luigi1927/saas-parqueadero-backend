const LONGITUD_MINIMA_JWT_SECRET = 32;

// Valores conocidos/publicados que NO deben usarse como secreto JWT en ningún entorno.
const SECRETOS_DENUNCIADOS = new Set<string>([
    'escribe_aqui_una_cadena_muy_larga_y_aleatoria',
    'la_mejor_plataforma_de_parqueaderos_2024',
    'cambia_este_secreto_por_uno_seguro_1234567890',
    'secreto_super_secreto_de_produccion_2024_xyz',
]);

export function obtenerJwtSecret(): string {
    const secreto = process.env.JWT_SECRET;
    if (!secreto || secreto.length < LONGITUD_MINIMA_JWT_SECRET) {
        throw new Error(
            `JWT_SECRET no está configurado o tiene menos de ${LONGITUD_MINIMA_JWT_SECRET} caracteres. ` +
            'Define una clave segura en el archivo .env antes de arrancar.'
        );
    }
    if (SECRETOS_DENUNCIADOS.has(secreto.trim())) {
        throw new Error(
            'JWT_SECRET es un valor de ejemplo/conocido. Debes generar un secreto único y no publicado ' +
            '(p. ej. con: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))").'
        );
    }
    return secreto.trim();
}

export function obtenerJwtExpiraEn(): string {
    return process.env.JWT_EXPIRES_IN?.trim() || '8h';
}

export function obtenerUrlPublicaWeb(): string {
    const url = process.env.URL_PUBLICA_WEB?.trim() || process.env.CLIENT_URL?.trim() || 'http://localhost:4200';
    return url.replace(/\/+$/, '');
}