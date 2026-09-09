-- Migración: índice para el reporte de mora de mensualidades
-- Acelera el filtrado/paginación del reporte de mora cuando hay gran volumen
-- de clientes mensuales (consulta por parqueadero + estado + fecha de vencimiento).

ALTER TABLE `clientes_mensuales`
    ADD KEY `idx_clientes_mensuales_mora` (`parqueadero_id`, `estado`, `fecha_vencimiento`);