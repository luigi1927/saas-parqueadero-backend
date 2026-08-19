declare namespace Express {
    export interface Request {
        user?: {
            usuarioId: number;
            parqueaderoId: number;
            rolId: number;
        };
    }
}