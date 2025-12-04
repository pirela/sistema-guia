-- ============================================
-- PASO 4: MARCAR PRODUCTOS DUPLICADOS COMO ELIMINADOS
-- ⚠️ IMPORTANTE: Ejecuta esto SOLO después de migrar las referencias (Paso 3)
-- Este script marca como eliminados los productos duplicados, manteniendo solo el principal
-- ============================================

-- Primero, veamos qué productos se van a marcar como eliminados
SELECT 
  id,
  codigo_sku,
  nombre,
  fecha_creacion,
  activo,
  'Se marcará como ELIMINADO' as accion
FROM (
  SELECT 
    id,
    codigo_sku,
    nombre,
    fecha_creacion,
    activo,
    LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) as nombre_normalizado,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) 
      ORDER BY 
        CASE WHEN codigo_sku IS NOT NULL AND codigo_sku != '' THEN 0 ELSE 1 END,
        fecha_creacion ASC
    ) as rn
  FROM productos
  WHERE eliminado = false
) sub
WHERE rn > 1
ORDER BY nombre_normalizado, fecha_creacion;

-- ============================================
-- Si estás de acuerdo con los productos que se eliminarán,
-- DESCOMENTA y ejecuta el UPDATE de abajo:
-- ============================================

/*
UPDATE productos
SET eliminado = true
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) as nombre_normalizado,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) 
        ORDER BY 
          CASE WHEN codigo_sku IS NOT NULL AND codigo_sku != '' THEN 0 ELSE 1 END,
          fecha_creacion ASC
      ) as rn
    FROM productos
    WHERE eliminado = false
  ) sub
  WHERE rn > 1
);
*/



