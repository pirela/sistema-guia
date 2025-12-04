-- ============================================
-- PASO 1: VER PRODUCTOS DUPLICADOS
-- Ejecuta esto primero para ver qué productos están duplicados
-- ============================================

WITH productos_normalizados AS (
  SELECT 
    id,
    codigo_sku,
    nombre,
    LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) as nombre_normalizado,
    precio,
    fecha_creacion,
    eliminado,
    activo,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) 
      ORDER BY 
        CASE WHEN codigo_sku IS NOT NULL AND codigo_sku != '' THEN 0 ELSE 1 END, -- Priorizar los que tienen SKU
        fecha_creacion ASC -- Si no hay SKU, priorizar el más antiguo
    ) as rn
  FROM productos
  WHERE eliminado = false
)
SELECT 
  nombre_normalizado,
  COUNT(*) as cantidad_duplicados,
  STRING_AGG(nombre, ' | ') as nombres_duplicados,
  STRING_AGG(id::text, ', ') as ids_duplicados
FROM productos_normalizados
WHERE rn > 1
GROUP BY nombre_normalizado
ORDER BY cantidad_duplicados DESC;



