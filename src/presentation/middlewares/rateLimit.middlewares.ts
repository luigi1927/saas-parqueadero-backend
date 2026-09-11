import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' }
});

export const solicitarCodigoLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes de código de recuperación. Intenta de nuevo más tarde.' }
});

export const confirmarCodigoLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de verificación. Intenta de nuevo más tarde.' }
});

// Limitadores operativos (agresivos): protegen de spam/abuso en endpoints de caja
// y consulta pública manteniendo margen para el uso real de un cajero.
export const entradaOperacionalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados registros de entrada en poco tiempo. Intenta de nuevo más tarde.' }
});

export const salidaOperacionalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas operaciones de salida en poco tiempo. Intenta de nuevo más tarde.' }
});

export const qrPublicoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas consultas. Intenta de nuevo más tarde.' }
});