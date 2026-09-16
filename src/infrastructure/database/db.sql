CREATE DATABASE  IF NOT EXISTS `parqueadero_saas_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `parqueadero_saas_db`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: parqueadero_saas_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auditoria_eventos`
--

DROP TABLE IF EXISTS `auditoria_eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria_eventos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `usuario_id` int NOT NULL,
  `tipo_accion` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `detalles` json DEFAULT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `auditoria_eventos_ibfk_1` (`parqueadero_id`),
  CONSTRAINT `auditoria_eventos_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`),
  CONSTRAINT `auditoria_eventos_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria_eventos`
--

LOCK TABLES `auditoria_eventos` WRITE;
/*!40000 ALTER TABLE `auditoria_eventos` DISABLE KEYS */;
/*!40000 ALTER TABLE `auditoria_eventos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `branding_parqueaderos`
--

DROP TABLE IF EXISTS `branding_parqueaderos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branding_parqueaderos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `logo_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'assets/logos/default_logo.png',
  `favicon_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'assets/favicons/default_favicon.ico',
  `slogan` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_primario` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#1E293B',
  `color_secundario` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#0F172A',
  `color_acento` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#2563EB',
  `color_fondo` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#F8FAFC',
  `encabezado_ticket` text COLLATE utf8mb4_unicode_ci,
  `pie_ticket` text COLLATE utf8mb4_unicode_ci,
  `mostrar_logo_en_ticket` tinyint(1) DEFAULT '1',
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `parqueadero_id` (`parqueadero_id`),
  CONSTRAINT `branding_parqueaderos_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `branding_parqueaderos`
--

LOCK TABLES `branding_parqueaderos` WRITE;
/*!40000 ALTER TABLE `branding_parqueaderos` DISABLE KEYS */;
/*!40000 ALTER TABLE `branding_parqueaderos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clientes_mensuales`
--

DROP TABLE IF EXISTS `clientes_mensuales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes_mensuales` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `placa` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_qr` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nombre_propietario` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tratamiento` enum('SR','SRA','NEUTRO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono_whatsapp` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `documento_identidad` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dia_pago_mensual` tinyint NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado` enum('AL_DIA','POR_VENCER','VENCIDO','CANCELADA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AL_DIA',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parqueadero_placa` (`parqueadero_id`,`placa`),
  UNIQUE KEY `uk_clientes_mensuales_codigo_qr` (`codigo_qr`),
  KEY `usuario_id` (`usuario_id`),
  KEY `idx_clientes_parqueadero_placa` (`parqueadero_id`,`placa`),
  KEY `idx_clientes_mensuales_vencimiento` (`fecha_vencimiento`,`estado`),
  KEY `idx_clientes_mensuales_mora` (`parqueadero_id`,`estado`,`fecha_vencimiento`),
  CONSTRAINT `clientes_mensuales_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`),
  CONSTRAINT `clientes_mensuales_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_clientes_mensuales_dia_pago` CHECK ((`dia_pago_mensual` between 1 and 30)),
  CONSTRAINT `clientes_mensuales_chk_1` CHECK ((`dia_pago_mensual` between 1 and 30))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clientes_mensuales`
--

LOCK TABLES `clientes_mensuales` WRITE;
/*!40000 ALTER TABLE `clientes_mensuales` DISABLE KEYS */;
/*!40000 ALTER TABLE `clientes_mensuales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_mensualidades`
--

DROP TABLE IF EXISTS `configuracion_mensualidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_mensualidades` (
  `parqueadero_id` int unsigned NOT NULL,
  `dias_gracia` tinyint NOT NULL DEFAULT '3',
  `dias_aviso_previo` tinyint NOT NULL DEFAULT '3',
  `dias_aviso_vencido` tinyint NOT NULL DEFAULT '5',
  `hora_envio_whatsapp` time NOT NULL DEFAULT '09:00:00',
  `horas_plazo_pago_presencial` tinyint NOT NULL DEFAULT '24',
  `whatsapp_habilitado` tinyint(1) NOT NULL DEFAULT '1',
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parqueadero_id`),
  CONSTRAINT `configuracion_mensualidades_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_mensualidades`
--

LOCK TABLES `configuracion_mensualidades` WRITE;
/*!40000 ALTER TABLE `configuracion_mensualidades` DISABLE KEYS */;
/*!40000 ALTER TABLE `configuracion_mensualidades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion_cobros_digitales`
--

DROP TABLE IF EXISTS `configuracion_cobros_digitales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_cobros_digitales` (
  `parqueadero_id` int unsigned NOT NULL,
  `nequi_numero` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nequi_alias` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `daviplata_numero` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `daviplata_alias` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `breve_numero` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `breve_alias` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mensaje_pie` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parqueadero_id`),
  CONSTRAINT `configuracion_cobros_digitales_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion_cobros_digitales`
--

LOCK TABLES `configuracion_cobros_digitales` WRITE;
/*!40000 ALTER TABLE `configuracion_cobros_digitales` DISABLE KEYS */;
/*!40000 ALTER TABLE `configuracion_cobros_digitales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dias_no_habiles_parqueadero`
--

DROP TABLE IF EXISTS `dias_no_habiles_parqueadero`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dias_no_habiles_parqueadero` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `fecha` date NOT NULL,
  `motivo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dias_no_habiles_parqueadero_fecha` (`parqueadero_id`,`fecha`),
  CONSTRAINT `fk_dias_no_habiles_parqueadero` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dias_no_habiles_parqueadero`
--

LOCK TABLES `dias_no_habiles_parqueadero` WRITE;
/*!40000 ALTER TABLE `dias_no_habiles_parqueadero` DISABLE KEYS */;
/*!40000 ALTER TABLE `dias_no_habiles_parqueadero` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `egresos_caja_menor`
--

DROP TABLE IF EXISTS `egresos_caja_menor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `egresos_caja_menor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `turno_caja_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `turno_caja_id` (`turno_caja_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `egresos_caja_menor_ibfk_1` FOREIGN KEY (`turno_caja_id`) REFERENCES `turnos_caja` (`id`),
  CONSTRAINT `egresos_caja_menor_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `egresos_caja_menor`
--

LOCK TABLES `egresos_caja_menor` WRITE;
/*!40000 ALTER TABLE `egresos_caja_menor` DISABLE KEYS */;
/*!40000 ALTER TABLE `egresos_caja_menor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `intenciones_pago_mensualidades`
--

DROP TABLE IF EXISTS `intenciones_pago_mensualidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `intenciones_pago_mensualidades` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `cliente_id` int unsigned NOT NULL,
  `fecha_vencimiento_ciclo` date NOT NULL,
  `canal` enum('FISICO','WHATSAPP','DIGITAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `metodo_pago` enum('EFECTIVO','WOMPI_PSE','WOMPI_TARJETA','WOMPI_BRE_B','NEQUI','DAVIPLATA','OTRO') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `monto` decimal(10,2) NOT NULL,
  `estado` enum('PENDIENTE_SELECCION','PENDIENTE_PAGO_DIGITAL','PENDIENTE_PAGO_PRESENCIAL','PENDIENTE_VERIFICACION','PAGADA','RECHAZADA','CANCELADA','EXPIRADA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `referencia_externa` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pago_mensualidad_id` int DEFAULT NULL,
  `fecha_expiracion` datetime DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_intencion_whatsapp_ciclo` (`cliente_id`,`fecha_vencimiento_ciclo`,`canal`),
  UNIQUE KEY `uk_intencion_referencia_externa` (`referencia_externa`),
  KEY `parqueadero_id` (`parqueadero_id`),
  KEY `idx_intencion_pago_mensualidad` (`pago_mensualidad_id`),
  CONSTRAINT `intenciones_pago_mensualidades_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `intenciones_pago_mensualidades_ibfk_2` FOREIGN KEY (`cliente_id`) REFERENCES `clientes_mensuales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `intenciones_pago_mensualidades_ibfk_3` FOREIGN KEY (`pago_mensualidad_id`) REFERENCES `pagos_mensualidades` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `intenciones_pago_mensualidades`
--

LOCK TABLES `intenciones_pago_mensualidades` WRITE;
/*!40000 ALTER TABLE `intenciones_pago_mensualidades` DISABLE KEYS */;
/*!40000 ALTER TABLE `intenciones_pago_mensualidades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones_mensualidades`
--

DROP TABLE IF EXISTS `notificaciones_mensualidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones_mensualidades` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `cliente_id` int unsigned NOT NULL,
  `fecha_vencimiento_ciclo` date NOT NULL,
  `tipo` enum('POR_VENCER_3_DIAS','POR_VENCER_2_DIAS','POR_VENCER_1_DIA','VENCIDA_DIA_1','VENCIDA_DIA_2','VENCIDA_DIA_3','VENCIDA_DIA_4','VENCIDA_DIA_5','RENOVADA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_envio` enum('PENDIENTE','PROCESANDO','ENVIADO','FALLIDO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDIENTE',
  `intentos` tinyint unsigned NOT NULL DEFAULT '0',
  `ultimo_error` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bloqueado_en` datetime DEFAULT NULL,
  `enviado_en` datetime DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_notificacion_mensualidad_ciclo` (`cliente_id`,`fecha_vencimiento_ciclo`,`tipo`),
  KEY `parqueadero_id` (`parqueadero_id`),
  KEY `idx_notificaciones_mensuales_pendientes` (`estado_envio`,`intentos`,`creado_en`),
  CONSTRAINT `notificaciones_mensualidades_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notificaciones_mensualidades_ibfk_2` FOREIGN KEY (`cliente_id`) REFERENCES `clientes_mensuales` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones_mensualidades`
--

LOCK TABLES `notificaciones_mensualidades` WRITE;
/*!40000 ALTER TABLE `notificaciones_mensualidades` DISABLE KEYS */;
/*!40000 ALTER TABLE `notificaciones_mensualidades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pagos_mensualidades`
--

DROP TABLE IF EXISTS `pagos_mensualidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagos_mensualidades` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `cliente_id` int unsigned NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `metodo_pago` enum('EFECTIVO','WOMPI_PSE','WOMPI_TARJETA','WOMPI_BRE_B','NEQUI','DAVIPLATA','OTRO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaccion_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `turno_caja_id` int DEFAULT NULL,
  `canal` enum('FISICO','WHATSAPP','DIGITAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `periodo_pagado_inicio` date NOT NULL,
  `periodo_pagado_fin` date NOT NULL,
  `fecha_pago` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idempotency_key` (`idempotency_key`),
  UNIQUE KEY `uk_pagos_mensualidades_periodo` (`cliente_id`,`periodo_pagado_inicio`),
  KEY `turno_caja_id` (`turno_caja_id`),
  KEY `pagos_mensualidades_ibfk_1` (`parqueadero_id`),
  CONSTRAINT `pagos_mensualidades_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`),
  CONSTRAINT `pagos_mensualidades_ibfk_2` FOREIGN KEY (`cliente_id`) REFERENCES `clientes_mensuales` (`id`),
  CONSTRAINT `pagos_mensualidades_ibfk_3` FOREIGN KEY (`turno_caja_id`) REFERENCES `turnos_caja` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pagos_mensualidades`
--

LOCK TABLES `pagos_mensualidades` WRITE;
/*!40000 ALTER TABLE `pagos_mensualidades` DISABLE KEYS */;
/*!40000 ALTER TABLE `pagos_mensualidades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parqueaderos`
--

DROP TABLE IF EXISTS `parqueaderos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parqueaderos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre_comercial` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nit_documento` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ciudad` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono_contacto` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_fin_prueba` date DEFAULT NULL,
  `estado` enum('PRUEBA_GRATUITA','ACTIVO','VENCIDO','SUSPENDIDO') COLLATE utf8mb4_unicode_ci DEFAULT 'PRUEBA_GRATUITA',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nit_documento` (`nit_documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parqueaderos`
--

LOCK TABLES `parqueaderos` WRITE;
/*!40000 ALTER TABLE `parqueaderos` DISABLE KEYS */;
/*!40000 ALTER TABLE `parqueaderos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `planes_saas`
--

DROP TABLE IF EXISTS `planes_saas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planes_saas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gema` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BRONCE',
  `precio_mensual` decimal(10,2) NOT NULL,
  `limite_motos` int DEFAULT '100',
  `soporta_whatsapp` tinyint(1) DEFAULT '1',
  `soporta_pagos_digitales` tinyint(1) DEFAULT '1',
  `soporta_ver_reportes` tinyint(1) DEFAULT '1',
  `soporta_descargar_reportes` tinyint(1) DEFAULT '1',
  `recordatorios_whatsapp` tinyint(1) DEFAULT '1',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `planes_saas`
--

LOCK TABLES `planes_saas` WRITE;
/*!40000 ALTER TABLE `planes_saas` DISABLE KEYS */;
INSERT INTO `planes_saas` VALUES (1,'Plan Inicial','BRONCE',80000.00,100,1,1,0,0,0,'2026-08-29 20:26:41'),(2,'Plan Pro Ilimitado','DIAMANTE',120000.00,9999,1,1,1,1,1,'2026-08-29 20:26:41');
/*!40000 ALTER TABLE `planes_saas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'SUPER_ADMIN','Administrador global del software SaaS'),(2,'ADMIN_PARQUEADERO','Propietario del parqueadero, acceso total a su sede'),(3,'OPERARIO','Cajero, gestión de entradas, salidas y mensualidades'),(4,'CLIENTE','Motociclista, acceso a consulta de historial y pagos');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suscripciones_parqueadero`
--

DROP TABLE IF EXISTS `suscripciones_parqueadero`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suscripciones_parqueadero` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `plan_id` int NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `monto_pagado` decimal(10,2) NOT NULL,
  `metodo_pago` enum('WOMPI_PSE','WOMPI_TARJETA','WOMPI_BRE_B','NEQUI','TRANSFERENCIA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaccion_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_pago` enum('APROBADO','PENDIENTE','RECHAZADO') COLLATE utf8mb4_unicode_ci DEFAULT 'APROBADO',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `plan_id` (`plan_id`),
  KEY `suscripciones_parqueadero_ibfk_1` (`parqueadero_id`),
  CONSTRAINT `suscripciones_parqueadero_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`),
  CONSTRAINT `suscripciones_parqueadero_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `planes_saas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suscripciones_parqueadero`
--

LOCK TABLES `suscripciones_parqueadero` WRITE;
/*!40000 ALTER TABLE `suscripciones_parqueadero` DISABLE KEYS */;
/*!40000 ALTER TABLE `suscripciones_parqueadero` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tarifas`
--

DROP TABLE IF EXISTS `tarifas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tarifas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Tarifa Principal Motos',
  `precio_base_hora` decimal(10,2) NOT NULL DEFAULT '2000.00',
  `minutos_gracia` int DEFAULT '5',
  `hora_inicio_nocturna` time DEFAULT '22:00:00',
  `hora_fin_nocturna` time DEFAULT '06:00:00',
  `tipo_recargo_nocturno` enum('PORCENTAJE','VALOR_FIJO','TARIFA_PLANA_PERNOCTA') COLLATE utf8mb4_unicode_ci DEFAULT 'VALOR_FIJO',
  `valor_recargo_nocturno` decimal(10,2) DEFAULT '3000.00',
  `precio_mensualidad` decimal(10,2) NOT NULL DEFAULT '60000.00',
  `activo` tinyint(1) DEFAULT '1',
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tarifas_ibfk_1` (`parqueadero_id`),
  CONSTRAINT `tarifas_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tarifas`
--

LOCK TABLES `tarifas` WRITE;
/*!40000 ALTER TABLE `tarifas` DISABLE KEYS */;
/*!40000 ALTER TABLE `tarifas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `codigo_qr` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `placa` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono_whatsapp` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo_vehiculo` enum('OCASIONAL','MENSUAL') COLLATE utf8mb4_unicode_ci DEFAULT 'OCASIONAL',
  `observaciones_danos` text COLLATE utf8mb4_unicode_ci,
  `fecha_entrada` datetime NOT NULL,
  `fecha_salida` datetime DEFAULT NULL,
  `subtotal_base` decimal(10,2) DEFAULT '0.00',
  `recargo_nocturno_aplicado` decimal(10,2) DEFAULT '0.00',
  `aplico_nocturno` tinyint(1) DEFAULT '0',
  `total_pagado` decimal(10,2) DEFAULT '0.00',
  `metodo_pago` enum('EFECTIVO','WOMPI_PSE','WOMPI_TARJETA','WOMPI_BRE_B','NEQUI','DAVIPLATA','OTRO') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pasarela_pago` enum('WOMPI','NINGUNA') COLLATE utf8mb4_unicode_ci DEFAULT 'NINGUNA',
  `transaccion_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado_transaccion` enum('PENDIENTE','APROBADO','RECHAZADO') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE',
  `estado_envio_whatsapp` enum('PENDIENTE','ENVIADO','FALLIDO','NO_SOLICITADO') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE',
  `estado` enum('ACTIVO','FINALIZADO','ANULADO') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO',
  `turno_ingreso_id` int NOT NULL,
  `turno_salida_id` int DEFAULT NULL,
  `idempotency_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_qr` (`codigo_qr`),
  UNIQUE KEY `idempotency_key` (`idempotency_key`),
  KEY `turno_ingreso_id` (`turno_ingreso_id`),
  KEY `turno_salida_id` (`turno_salida_id`),
  KEY `idx_tickets_parqueadero_placa` (`parqueadero_id`,`placa`),
  KEY `idx_tickets_estado` (`parqueadero_id`,`estado`),
  CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`),
  CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`turno_ingreso_id`) REFERENCES `turnos_caja` (`id`),
  CONSTRAINT `tickets_ibfk_3` FOREIGN KEY (`turno_salida_id`) REFERENCES `turnos_caja` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tickets`
--

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `turnos_caja`
--

DROP TABLE IF EXISTS `turnos_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `turnos_caja` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `usuario_id` int NOT NULL,
  `monto_inicial_base` decimal(10,2) NOT NULL DEFAULT '0.00',
  `monto_efectivo_declarado` decimal(10,2) DEFAULT NULL,
  `monto_efectivo_esperado` decimal(10,2) DEFAULT NULL,
  `total_egresos_caja` decimal(10,2) DEFAULT '0.00',
  `diferencia_cuadre` decimal(10,2) DEFAULT NULL,
  `fecha_apertura` datetime NOT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  `estado` enum('ABIERTO','CERRADO') COLLATE utf8mb4_unicode_ci DEFAULT 'ABIERTO',
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `turnos_caja_ibfk_1` (`parqueadero_id`),
  CONSTRAINT `turnos_caja_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`),
  CONSTRAINT `turnos_caja_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `turnos_caja`
--

LOCK TABLES `turnos_caja` WRITE;
/*!40000 ALTER TABLE `turnos_caja` DISABLE KEYS */;
/*!40000 ALTER TABLE `turnos_caja` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parqueadero_id` int unsigned NOT NULL,
  `rol_id` int NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `documento_id` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pin_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `intentos_fallidos_pin` int DEFAULT '0',
  `bloqueado_hasta` datetime DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO','BLOQUEADO') COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVO',
  `creado_por` int DEFAULT NULL,
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parqueadero_documento` (`parqueadero_id`,`documento_id`),
  KEY `rol_id` (`rol_id`),
  KEY `creado_por` (`creado_por`),
  KEY `idx_usuarios_parqueadero` (`parqueadero_id`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`parqueadero_id`) REFERENCES `parqueaderos` (`id`),
  CONSTRAINT `usuarios_ibfk_2` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `usuarios_ibfk_3` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-29 16:06:16
