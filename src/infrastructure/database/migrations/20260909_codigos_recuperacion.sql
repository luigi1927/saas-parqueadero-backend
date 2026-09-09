-- Migración: historial de códigos de recuperación de acceso
-- Crea la tabla `codigos_recuperacion` como registro auditable de cada solicitud
-- y elimina las columnas temporales de la tabla `usuarios` que se agregaron en
-- 20260908_recuperacion_acceso.sql (el código ya no vive en usuarios: se guarda
-- aquí en cada solicitud y se marca como consumido cuando se usa).

CREATE TABLE `codigos_recuperacion` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `usuario_id` INT NOT NULL,
  `codigo_hash` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiracion` DATETIME NOT NULL,
  `consumido` TINYINT(1) NOT NULL DEFAULT 0,
  `creado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usado_en` DATETIME DEFAULT NULL,
  `ip` VARCHAR(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_codigos_recuperacion_usuario` (`usuario_id`),
  CONSTRAINT `fk_codigos_recuperacion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `usuarios`
    DROP COLUMN `codigo_recuperacion_consumido`,
    DROP COLUMN `codigo_recuperacion_expiracion`,
    DROP COLUMN `codigo_recuperacion_hash`;