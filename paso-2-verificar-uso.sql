-- ============================================
-- PASO 2: VERIFICAR QUÉ PRODUCTOS DUPLICADOS ESTÁN EN USO
-- Ejecuta esto para ver si los duplicados están siendo usados en guías
-- ============================================

WITH productos_duplicados AS (
  SELECT 
    id,
    nombre,
    codigo_sku,
    LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) as nombre_normalizado,
    fecha_creacion,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(REGEXP_REPLACE(nombre, '[^\w\s]', '', 'g'))) 
      ORDER BY 
        CASE WHEN codigo_sku IS NOT NULL AND codigo_sku != '' THEN 0 ELSE 1 END,
        fecha_creacion ASC
    ) as rn
  FROM productos
  WHERE eliminado = false
)
SELECT 
  p.id as producto_id,
  p.nombre,
  p.codigo_sku,
  p.nombre_normalizado,
  COUNT(gp.id) as veces_usado_en_guias,
  CASE 
    WHEN p.rn = 1 THEN '✅ MANTENER (Producto principal)' 
    ELSE '❌ ELIMINAR (Duplicado)' 
  END as accion
FROM productos_duplicados p
LEFT JOIN guias_productos gp ON gp.producto_id = p.id
WHERE p.rn > 1 OR EXISTS (
  SELECT 1 
  FROM productos_duplicados p2 
  WHERE p2.nombre_normalizado = p.nombre_normalizado AND p2.rn > 1
)
GROUP BY p.id, p.nombre, p.codigo_sku, p.nombre_normalizado, p.rn
ORDER BY veces_usado_en_guias DESC, p.nombre;












