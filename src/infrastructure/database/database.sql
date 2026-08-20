CREATE DATABASE IF NOT EXISTS parqueadero_saas_db CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE parqueadero_saas_db;

-- -----------------------------------------------------------------------------
-- 1. MULTI-TENANT & PLANES SAAS
-- -----------------------------------------------------------------------------
CREATE TABLE
    planes_saas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        precio_mensual DECIMAL(10, 2) NOT NULL,
        limite_motos INT DEFAULT 100,
        soporta_whatsapp BOOLEAN DEFAULT TRUE,
        soporta_pagos_digitales BOOLEAN DEFAULT TRUE,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

INSERT INTO
    planes_saas (
        nombre,
        precio_mensual,
        limite_motos,
        soporta_whatsapp,
        soporta_pagos_digitales
    )
VALUES
    ('Plan Inicial', 80000.00, 100, TRUE, TRUE),
    ('Plan Pro Ilimitado', 120000.00, 9999, TRUE, TRUE);

CREATE TABLE
    parqueaderos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_comercial VARCHAR(100) NOT NULL,
        nit_documento VARCHAR(20) NOT NULL UNIQUE,
        ciudad VARCHAR(50) NOT NULL,
        direccion VARCHAR(150) NOT NULL,
        telefono_contacto VARCHAR(20) NOT NULL,
        -- Estado de Licencia SaaS
        estado ENUM (
            'PRUEBA_GRATUITA',
            'ACTIVO',
            'VENCIDO',
            'SUSPENDIDO'
        ) DEFAULT 'PRUEBA_GRATUITA',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- -----------------------------------------------------------------------------
-- 2. MARCA BLANCA / BRANDING (RELACIÓN 1 A 1 CON PARQUEADEROS)
-- -----------------------------------------------------------------------------
CREATE TABLE
    branding_parqueaderos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parqueadero_id INT NOT NULL UNIQUE,
        -- Identidad Visual
        logo_url VARCHAR(255) DEFAULT 'assets/logos/default_logo.png',
        favicon_url VARCHAR(255) DEFAULT 'assets/favicons/default_favicon.ico',
        slogan VARCHAR(150) NULL,
        -- Paleta de Colores (Tema UI PWA)
        color_primario VARCHAR(7) DEFAULT '#1E293B',
        color_secundario VARCHAR(7) DEFAULT '#0F172A',
        color_acento VARCHAR(7) DEFAULT '#2563EB',
        color_fondo VARCHAR(7) DEFAULT '#F8FAFC',
        -- Configuración de Tickets Digitales
        encabezado_ticket TEXT NULL,
        pie_ticket TEXT NULL,
        mostrar_logo_en_ticket BOOLEAN DEFAULT TRUE,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE CASCADE
    );

-- -----------------------------------------------------------------------------
-- 3. ROLES Y USUARIOS (BLINDADO CONTRA FUERZA BRUTA)
-- -----------------------------------------------------------------------------
CREATE TABLE
    roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL UNIQUE,
        descripcion VARCHAR(255) NULL
    );

INSERT INTO
    roles (nombre, descripcion)
VALUES
    (
        'SUPER_ADMIN',
        'Administrador global del software SaaS'
    ),
    (
        'ADMIN_PARQUEADERO',
        'Propietario del parqueadero, acceso total a su sede'
    ),
    (
        'OPERARIO',
        'Cajero, gestión de entradas, salidas y mensualidades'
    ),
    (
        'CLIENTE',
        'Motociclista, acceso a consulta de historial y pagos'
    );

CREATE TABLE
    usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parqueadero_id INT NULL, -- NULL para el SUPER_ADMIN
        rol_id INT NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        documento_id VARCHAR(20) NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        email VARCHAR(100) NULL,
        password_hash VARCHAR(255) NULL, -- Para Admin / SuperAdmin
        pin_hash VARCHAR(255) NOT NULL, -- bcrypt para PIN de 4 dígitos en PWA
        -- Control Anti-Fuerza Bruta
        intentos_fallidos_pin INT DEFAULT 0,
        bloqueado_hasta DATETIME NULL,
        estado ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO') DEFAULT 'ACTIVO',
        creado_por INT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE CASCADE,
        FOREIGN KEY (rol_id) REFERENCES roles (id),
        FOREIGN KEY (creado_por) REFERENCES usuarios (id),
        UNIQUE KEY uk_parqueadero_documento (parqueadero_id, documento_id)
    );

-- -----------------------------------------------------------------------------
-- 4. SUSCRIPCIONES Y PAGOS SAAS
-- -----------------------------------------------------------------------------
CREATE TABLE
    suscripciones_parqueadero (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parqueadero_id INT NOT NULL,
        plan_id INT NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        monto_pagado DECIMAL(10, 2) NOT NULL,
        metodo_pago ENUM (
            'WOMPI_PSE',
            'WOMPI_TARJETA',
            'WOMPI_BRE_B',
            'NEQUI',
            'TRANSFERENCIA'
        ) NOT NULL,
        transaccion_id VARCHAR(100) NOT NULL,
        estado_pago ENUM ('APROBADO', 'PENDIENTE', 'RECHAZADO') DEFAULT 'APROBADO',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id),
        FOREIGN KEY (plan_id) REFERENCES planes_saas (id)
    );

-- -----------------------------------------------------------------------------
-- 5. CONFIGURACIÓN DE TARIFAS
-- -----------------------------------------------------------------------------
CREATE TABLE
    tarifas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parqueadero_id INT NOT NULL,
        nombre VARCHAR(50) NOT NULL DEFAULT 'Tarifa Principal Motos',
        precio_base_hora DECIMAL(10, 2) NOT NULL DEFAULT 2000.00,
        minutos_gracia INT DEFAULT 5,
        -- Recargo Nocturno / Pernoctación
        hora_inicio_nocturna TIME DEFAULT '22:00:00',
        hora_fin_nocturna TIME DEFAULT '06:00:00',
        tipo_recargo_nocturno ENUM (
            'PORCENTAJE',
            'VALOR_FIJO',
            'TARIFA_PLANA_PERNOCTA'
        ) DEFAULT 'VALOR_FIJO',
        valor_recargo_nocturno DECIMAL(10, 2) DEFAULT 3000.00,
        precio_mensualidad DECIMAL(10, 2) NOT NULL DEFAULT 60000.00,
        activo BOOLEAN DEFAULT TRUE,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE CASCADE
    );

-- -----------------------------------------------------------------------------
-- 6. CLIENTES DE MENSUALIDADES (CON CONTROL DE AUDITORÍA Y WHATSAPP)
-- -----------------------------------------------------------------------------
CREATE TABLE
    clientes_mensuales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parqueadero_id INT NOT NULL,
        usuario_id INT NULL UNIQUE,
        placa VARCHAR(10) NOT NULL,
        nombre_propietario VARCHAR(100) NOT NULL,
        telefono_whatsapp VARCHAR(20) NOT NULL,
        fecha_inicio DATE NOT NULL,
        fecha_vencimiento DATE NOT NULL,
        -- Control de Notificaciones Automatizadas
        ultimo_recordatorio_enviado DATETIME NULL,
        estado_notificacion ENUM (
            'SIN_ENVIAR',
            'RECORDATORIO_3_DIAS',
            'NOTIFICADO_VENCIDO'
        ) DEFAULT 'SIN_ENVIAR',
        estado ENUM ('AL_DIA', 'POR_VENCER', 'VENCIDO') DEFAULT 'AL_DIA',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL,
        UNIQUE KEY uk_parqueadero_placa (parqueadero_id, placa)
    );

-- -----------------------------------------------------------------------------
-- 7. CONTROL DE TURNOS Y CAJA MENOR
-- -----------------------------------------------------------------------------
CREATE TABLE
    turnos_caja (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parqueadero_id INT NOT NULL,
        usuario_id INT NOT NULL,
        monto_inicial_base DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        monto_efectivo_declarado DECIMAL(10, 2) NULL, -- Arqueo Ciego
        monto_efectivo_esperado DECIMAL(10, 2) NULL,
        total_egresos_caja DECIMAL(10, 2) DEFAULT 0.00,
        diferencia_cuadre DECIMAL(10, 2) NULL,
        fecha_apertura DATETIME NOT NULL,
        fecha_cierre DATETIME NULL,
        estado ENUM ('ABIERTO', 'CERRADO') DEFAULT 'ABIERTO',
        FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    );

CREATE TABLE
    egresos_caja_menor (
        id INT AUTO_INCREMENT PRIMARY KEY,
        turno_caja_id INT NOT NULL,
        usuario_id INT NOT NULL,
        monto DECIMAL(10, 2) NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (turno_caja_id) REFERENCES turnos_caja (id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    );

-- -----------------------------------------------------------------------------
-- 8. TICKETS Y PAGOS CON PASARELA (UUID v4 + WOMPI & WHATSAPP)
-- -----------------------------------------------------------------------------
CREATE TABLE
    tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parqueadero_id INT NOT NULL,
        -- UUID v4 no adivinable para máxima seguridad en la URL/QR
        codigo_qr VARCHAR(36) UNIQUE NOT NULL,
        placa VARCHAR(10) NOT NULL,
        telefono_whatsapp VARCHAR(20) NULL,
        tipo_vehiculo ENUM ('OCASIONAL', 'MENSUAL') DEFAULT 'OCASIONAL',
        observaciones_danos TEXT NULL,
        -- Tiempos
        fecha_entrada DATETIME NOT NULL,
        fecha_salida DATETIME NULL,
        -- Cobro
        subtotal_base DECIMAL(10, 2) DEFAULT 0.00,
        recargo_nocturno_aplicado DECIMAL(10, 2) DEFAULT 0.00,
        aplico_nocturno BOOLEAN DEFAULT FALSE,
        total_pagado DECIMAL(10, 2) DEFAULT 0.00,
        metodo_pago ENUM (
            'EFECTIVO',
            'WOMPI_PSE',
            'WOMPI_TARJETA',
            'WOMPI_BRE_B',
            'NEQUI',
            'DAVIPLATA',
            'OTRO'
        ) NULL,
        -- Auditoría Wompi
        pasarela_pago ENUM ('WOMPI', 'NINGUNA') DEFAULT 'NINGUNA',
        transaccion_id VARCHAR(100) NULL,
        estado_transaccion ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO') DEFAULT 'PENDIENTE',
        -- Auditoría Mensajería Digital
        estado_envio_whatsapp ENUM (
            'PENDIENTE',
            'ENVIADO',
            'FALLIDO',
            'NO_SOLICITADO'
        ) DEFAULT 'PENDIENTE',
        -- Estado Operativo y Protección Re-intentos
        estado ENUM ('ACTIVO', 'FINALIZADO', 'ANULADO') DEFAULT 'ACTIVO',
        turno_ingreso_id INT NOT NULL,
        turno_salida_id INT NULL,
        idempotency_key VARCHAR(100) UNIQUE NULL,
        FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE CASCADE,
        FOREIGN KEY (turno_ingreso_id) REFERENCES turnos_caja (id),
        FOREIGN KEY (turno_salida_id) REFERENCES turnos_caja (id)
    );

CREATE TABLE
    pagos_mensualidades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parqueadero_id INT NOT NULL,
        cliente_id INT NOT NULL,
        monto DECIMAL(10, 2) NOT NULL,
        metodo_pago ENUM (
            'EFECTIVO',
            'WOMPI_PSE',
            'WOMPI_TARJETA',
            'WOMPI_BRE_B',
            'NEQUI',
            'DAVIPLATA',
            'OTRO'
        ) NOT NULL,
        transaccion_id VARCHAR(100) NULL,
        turno_caja_id INT NOT NULL,
        fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE CASCADE,
        FOREIGN KEY (cliente_id) REFERENCES clientes_mensuales (id),
        FOREIGN KEY (turno_caja_id) REFERENCES turnos_caja (id)
    );

-- -----------------------------------------------------------------------------
-- 9. AUDITORÍA E HISTORIAL DE EVENTOS
-- -----------------------------------------------------------------------------
CREATE TABLE
    auditoria_eventos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parqueadero_id INT NOT NULL,
        usuario_id INT NOT NULL,
        tipo_accion VARCHAR(50) NOT NULL, -- Ej: 'BLOQUEO_PIN', 'ANULACION', 'EGRESO_CAJA'
        detalles JSON NULL,
        motivo VARCHAR(255) NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parqueadero_id) REFERENCES parqueaderos (id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    );

-- -----------------------------------------------------------------------------
-- 10. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA RÁPIDA
-- -----------------------------------------------------------------------------
CREATE INDEX idx_tickets_parqueadero_placa ON tickets (parqueadero_id, placa);

CREATE INDEX idx_tickets_estado ON tickets (parqueadero_id, estado);

CREATE INDEX idx_clientes_parqueadero_placa ON clientes_mensuales (parqueadero_id, placa);

CREATE INDEX idx_usuarios_parqueadero ON usuarios (parqueadero_id);