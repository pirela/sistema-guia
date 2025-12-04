-- ============================================
-- PASO 3: MIGRAR REFERENCIAS DE PRODUCTOS DUPLICADOS
-- ⚠️ IMPORTANTE: Solo ejecuta esto si hay productos duplicados en uso
-- Este script actualiza las guías para usar el producto principal en lugar del duplicado
-- ============================================

-- Primero, veamos qué se va a actualizar (ejecuta esto para revisar antes de hacer el UPDATE)
WITH productos_duplicados AS (
  SELECT 
    id,
    nombre,
    LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) as nombre_normalizado,
    fecha_creacion,
    codigo_sku,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) 
      ORDER BY 
        CASE WHEN codigo_sku IS NOT NULL AND codigo_sku != '' THEN 0 ELSE 1 END,
        fecha_creacion ASC
    ) as rn
  FROM productos
  WHERE eliminado = false
),
productos_principales AS (
  SELECT 
    id as id_principal,
    nombre_normalizado
  FROM productos_duplicados
  WHERE rn = 1
),
productos_secundarios AS (
  SELECT 
    id as id_secundario,
    nombre_normalizado
  FROM productos_duplicados
  WHERE rn > 1
)
SELECT 
  gp.id as guia_producto_id,
  gp.guia_id,
  ps.id_secundario as producto_actual_id,
  pp.id_principal as producto_nuevo_id,
  (SELECT nombre FROM productos WHERE id = ps.id_secundario) as producto_actual_nombre,
  (SELECT nombre FROM productos WHERE id = pp.id_principal) as producto_nuevo_nombre
FROM guias_productos gp
JOIN productos_secundarios ps ON gp.producto_id = ps.id_secundario
JOIN productos_principales pp ON pp.nombre_normalizado = ps.nombre_normalizado;

-- ============================================
-- Si estás de acuerdo con los cambios mostrados arriba,
-- DESCOMENTA y ejecuta el UPDATE de abajo:
-- ============================================

/*
WITH productos_duplicados AS (
  SELECT 
    id,
    nombre,
    LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) as nombre_normalizado,
    fecha_creacion,
    codigo_sku,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) 
      ORDER BY 
        CASE WHEN codigo_sku IS NOT NULL AND codigo_sku != '' THEN 0 ELSE 1 END,
        fecha_creacion ASC
    ) as rn
  FROM productos
  WHERE eliminado = false
),
productos_principales AS (
  SELECT 
    id as id_principal,
    nombre_normalizado
  FROM productos_duplicados
  WHERE rn = 1
),
productos_secundarios AS (
  SELECT 
    id as id_secundario,
    nombre_normalizado
  FROM productos_duplicados
  WHERE rn > 1
)
UPDATE guias_productos gp
SET producto_id = pp.id_principal
FROM productos_secundarios ps
JOIN productos_principales pp ON pp.nombre_normalizado = ps.nombre_normalizado
WHERE gp.producto_id = ps.id_secundario;
*/




