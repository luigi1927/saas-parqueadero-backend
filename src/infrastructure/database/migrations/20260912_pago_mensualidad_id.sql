-- Migración: columna faltante pago_mensualidad_id en intenciones_pago_mensualidades
-- El código (MySQLClienteMensualRepository.marcarIntencionPagada y
-- MySQLTrazabilidadMensualidadRepository.listarIntenciones) referencia esta columna,
-- pero no existía en el esquema. Sin ella, todo pago FISICO de mensualidad
-- fallaba con "Unknown column 'pago_mensualidad_id'".

ALTER TABLE `intenciones_pago_mensualidades`
    ADD COLUMN `pago_mensualidad_id` INT NULL AFTER `referencia_externa`,
    ADD KEY `idx_intencion_pago_mensualidad` (`pago_mensualidad_id`),
    ADD CONSTRAINT `intenciones_pago_mensualidades_ibfk_3`
        FOREIGN KEY (`pago_mensualidad_id`) REFERENCES `pagos_mensualidades` (`id`) ON DELETE SET NULL;