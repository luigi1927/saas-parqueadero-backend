export interface IUsuario {
    id?: number;
    parqueaderoId: number | null; // NULL para SuperAdmin
    rolId: number;
    rolNombre: 'SUPER_ADMIN' | 'ADMIN_PARQUEADERO' | 'OPERARIO' | 'CLIENTE';
    nombre: string;
    documentoId: string;
    telefono: string;
    email?: string | null;
    passwordHash?: string | null;
    pinHash: string;
    intentosFallidosPin: number;
    bloqueadoHasta?: Date | null;
    estado: 'ACTIVO' | 'INACTIVO' | 'BLOQUEADO';
    nombreParqueadero?: string | null; // Solo se llena al resolver login sin parqueaderoId explícito
}

export interface IRegistrarOperarioDTO {
    nombre: string;
    documentoId: string;
    telefono: string;
    email?: string | undefined;
    pinHash: string;
}

export interface IActualizarAdministradorPropioDTO {
    nombre: string;
    telefono: string;
    email?: string | undefined;
}

export interface IUsuarioRepository {
    buscarPorDocumento(parqueaderoId: number | null, documentoId: string): Promise<IUsuario | null>;
    buscarSuperAdminPorDocumento(documentoId: string): Promise<IUsuario | null>;
    buscarCuentasActivasPorDocumento(documentoId: string): Promise<IUsuario[]>;
    buscarPorId(id: number): Promise<IUsuario | null>;
    registrarIntentoFallido(usuarioId: number, nuevosIntentos: number): Promise<void>;
    bloquearUsuario(usuarioId: number): Promise<void>;
    resetearIntentos(usuarioId: number): Promise<void>;
    listarPorParqueadero(parqueaderoId: number): Promise<IUsuario[]>;
    registrarOperario(parqueaderoId: number, administradorId: number, datos: IRegistrarOperarioDTO): Promise<IUsuario>;
    cambiarEstadoOperario(parqueaderoId: number, operarioId: number, administradorId: number, estado: 'ACTIVO' | 'INACTIVO', motivo: string): Promise<void>;
    actualizarDatosPropios(usuarioId: number, parqueaderoId: number, datos: IActualizarAdministradorPropioDTO): Promise<void>;
    registrarCodigoRecuperacion(usuarioId: number, codigoHash: string, expiraEn: Date, ip?: string | null): Promise<number>;
    eliminarCodigosExpirados(usuarioId: number): Promise<void>;
    leerCodigoRecuperacionActivo(usuarioId: number): Promise<{ id: number; codigoHash: string; expiracion: Date; consumido: number } | null>;
    marcarCodigoConsumido(codigoId: number): Promise<void>;
    restablecerPin(usuarioId: number, pinHash: string): Promise<void>;
}
