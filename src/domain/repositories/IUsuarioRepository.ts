export interface IUsuario {
    id?: number;
    parqueaderoId: number | null; // NULL para SuperAdmin
    rolId: number;
    nombre: string;
    documentoId: string;
    telefono: string;
    email?: string | null;
    passwordHash?: string | null;
    pinHash: string;
    intentosFallidosPin: number;
    bloqueadoHasta?: Date | null;
    estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
}

export interface IUsuarioRepository {
    buscarPorDocumento(parqueaderoId: number | null, documentoId: string): Promise<IUsuario | null>;
    buscarPorId(id: number): Promise<IUsuario | null>;
    registrarIntentoFallido(usuarioId: number, nuevosIntentos: number): Promise<void>;
    bloquearUsuario(usuarioId: number): Promise<void>;
    resetearIntentos(usuarioId: number): Promise<void>;
}