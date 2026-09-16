-- Migración: cobros digitales por referencia (Nequi / Daviplata / Breve - WOMPI_BRE_B)
-- 1) Configuración por parqueadero de los números/llaves donde se recibe el dinero.
-- 2) La intención de mensualidad puede nacer por canal 'DIGITAL' (pago en billetera con
--    confirmación registrada por el cajero), además de WHATSAPP y FISICO.

CREATE TABLE IF NOT EXISTS `configuracion_cobros_digitales` (
  `parqueadero_id` int unsigned NOT NULL,
  `nequi_numero` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nequi_alias` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `daviplata_numero` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `daviplata_alias` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `breve_numero` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `breve_alias` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensaje_pie` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parqueadero_id`),
  CONSTRAINT `configuracion_cobros_digitales_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `intenciones_pago_mensualidades`
    MODIFY COLUMN `canal` enum('FISICO','WHATSAPP','DIGITAL') COLLATE utf8mb4_unicode_ci NOT NULL;