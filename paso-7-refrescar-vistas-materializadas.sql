-- ============================================
-- PASO 7: Refrescar Vistas Materializadas
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase

-- ============================================
-- Refrescar todas las vistas materializadas
-- ============================================
-- Esto actualizará las vistas con los nuevos datos incluyendo el estado 'novedad'

REFRESH MATERIALIZED VIEW CONCURRENTLY vista_estadisticas_motorizado;
REFRESH MATERIALIZED VIEW CONCURRENTLY vista_guias_por_estado;
REFRESH MATERIALIZED VIEW CONCURRENTLY vista_productos_mas_despachados;

-- ============================================
-- Verificación: Verificar que las vistas incluyen 'novedad'
-- ============================================
-- Verificar que la vista de guías por estado incluye 'novedad'
SELECT 
    estado,
    COUNT(*) as cantidad
FROM 
    vista_guias_por_estado
GROUP BY 
    estado
ORDER BY 
    estado;

-- Verificar que hay guías con estado 'novedad' (si existen)
SELECT 
    COUNT(*) as total_guias_novedad
FROM 
    guias
WHERE 
    estado = 'novedad'
    AND eliminado = false;

-- ============================================
-- NOTA IMPORTANTE:
-- ============================================
-- Si las vistas materializadas tienen definiciones que filtran
-- por estados específicos, es posible que necesites actualizar
-- esas definiciones para incluir 'novedad'.
--
-- Para ver las definiciones de las vistas:
-- ============================================
-- SELECT 
--     table_name,
--     view_definition
-- FROM 
--     information_schema.views
-- WHERE 
--     table_schema = 'public'
--     AND table_name IN (
--         'vista_estadisticas_motorizado',
--         'vista_guias_por_estado',
--         'vista_productos_mas_despachados'
--     );

-- ============================================
-- Si necesitas actualizar la definición de una vista:
-- ============================================
-- Ejemplo para vista_guias_por_estado (ajusta según tu definición real):
-- 
-- DROP MATERIALIZED VIEW IF EXISTS vista_guias_por_estado;
-- 
-- CREATE MATERIALIZED VIEW vista_guias_por_estado AS
-- SELECT 
--     estado,
--     COUNT(*) as cantidad
-- FROM 
--     guias
-- WHERE 
--     eliminado = false
-- GROUP BY 
--     estado;
-- 
-- CREATE UNIQUE INDEX ON vista_guias_por_estado (estado);
--
-- REFRESH MATERIALIZED VIEW vista_guias_por_estado;

