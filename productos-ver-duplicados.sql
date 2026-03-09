-- =============================================================================
-- PASO 1: SOLO CONSULTA - Ver productos duplicados por nombre (sin modificar nada)
-- Ejecutar en Supabase SQL Editor para revisar qué registros se considerarían duplicados.
-- =============================================================================

-- Duplicados por nombre (mismo nombre normalizado: trim + minúsculas)
WITH nombre_normalizado AS (
  SELECT
    id,
    nombre,
    codigo_sku,
    LOWER(TRIM(nombre)) AS nombre_norm
  FROM productos
  WHERE eliminado = false
),
grupos AS (
  SELECT
    nombre_norm,
    COUNT(*) AS cantidad,
    array_agg(id ORDER BY id::text) AS ids,
    (array_agg(id ORDER BY id::text))[1] AS id_a_mantener
  FROM nombre_normalizado
  GROUP BY nombre_norm
  HAVING COUNT(*) > 1
)
SELECT
  g.nombre_norm AS "Nombre normalizado",
  g.cantidad AS "Cantidad duplicados",
  g.id_a_mantener AS "ID que se mantendría",
  g.ids AS "Todos los IDs del grupo",
  (SELECT json_agg(json_build_object('id', p.id, 'nombre', p.nombre, 'codigo_sku', p.codigo_sku))
   FROM productos p WHERE p.id = ANY(g.ids)) AS "Detalle"
FROM grupos g
ORDER BY g.cantidad DESC;
