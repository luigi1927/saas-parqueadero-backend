-- Migración: QR estable por mensualidad
-- Agrega un token único por cliente mensual que permite al sistema consultar
-- si el vehículo está dentro del parqueadero (ticket ACTIVO) o ya salió (FINALIZADO).
-- El token se envía en el mensaje de bienvenida como código QR.

ALTER TABLE `clientes_mensuales`
    ADD COLUMN `codigo_qr` VARCHAR(64) COLLATE utf8mb4_unicode_ci NULL AFTER `placa`,
    ADD UNIQUE KEY `uk_clientes_mensuales_codigo_qr` (`codigo_qr`);

-- Respaldo para mensualidades existentes: asigna un token único a cada una.
UPDATE `clientes_mensuales` SET `codigo_qr` = REPLACE(UUID(), '-', '') WHERE `codigo_qr` IS NULL;