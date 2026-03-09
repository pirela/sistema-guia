-- =============================================================================
-- PASO 2: LIMPIAR duplicados de productos (mantener uno por nombre, reasignar FKs)
-- IMPORTANTE: Haz backup o ejecuta primero "productos-ver-duplicados.sql" para revisar.
-- Ejecutar en Supabase SQL Editor. Las tablas afectadas: guias_productos,
-- inventario_motorizado, movimientos_inventario; productos (soft-delete).
-- =============================================================================

BEGIN;

-- Productos que se mantienen (uno por nombre normalizado): el de menor id
WITH productos_canonico AS (
  SELECT
    id,
    LOWER(TRIM(nombre)) AS nombre_norm,
    (array_agg(id) OVER (PARTITION BY LOWER(TRIM(nombre)) ORDER BY id::text))[1] AS canonico_id
  FROM productos
  WHERE eliminado = false
),
duplicados AS (
  SELECT id AS duplicado_id, canonico_id
  FROM productos_canonico
  WHERE id <> canonico_id
),

-- 1) Sumar cantidades de inventario_motorizado de duplicados al producto canónico
inventario_suma AS (
  SELECT
    i.motorizado_id,
    d.canonico_id AS producto_id,
    SUM(i.cantidad) AS cantidad
  FROM inventario_motorizado i
  INNER JOIN duplicados d ON d.duplicado_id = i.producto_id
  GROUP BY i.motorizado_id, d.canonico_id
)
INSERT INTO inventario_motorizado (motorizado_id, producto_id, cantidad, fecha_actualizacion)
SELECT motorizado_id, producto_id, cantidad, NOW()
FROM inventario_suma
ON CONFLICT (motorizado_id, producto_id) DO UPDATE SET
  cantidad = inventario_motorizado.cantidad + EXCLUDED.cantidad,
  fecha_actualizacion = NOW();

-- 2) Reasignar guias_productos al producto canónico
WITH productos_canonico2 AS (
  SELECT
    id AS duplicado_id,
    (array_agg(id) OVER (PARTITION BY LOWER(TRIM(nombre)) ORDER BY id::text))[1] AS canonico_id
  FROM productos
  WHERE eliminado = false
),
duplicados2 AS (
  SELECT duplicado_id, canonico_id
  FROM productos_canonico2
  WHERE duplicado_id <> canonico_id
)
UPDATE guias_productos gp
SET producto_id = d.canonico_id
FROM duplicados2 d
WHERE gp.producto_id = d.duplicado_id;

-- 3) Reasignar movimientos_inventario al producto canónico
WITH productos_canonico3 AS (
  SELECT
    id AS duplicado_id,
    (array_agg(id) OVER (PARTITION BY LOWER(TRIM(nombre)) ORDER BY id::text))[1] AS canonico_id
  FROM productos
  WHERE eliminado = false
),
duplicados3 AS (
  SELECT duplicado_id, canonico_id
  FROM productos_canonico3
  WHERE duplicado_id <> canonico_id
)
UPDATE movimientos_inventario mi
SET producto_id = d.canonico_id
FROM duplicados3 d
WHERE mi.producto_id = d.duplicado_id;

-- 4) Borrar filas de inventario_motorizado que eran de productos duplicados
--    (ya sumamos sus cantidades al canónico)
WITH productos_canonico4 AS (
  SELECT
    id AS duplicado_id,
    (array_agg(id) OVER (PARTITION BY LOWER(TRIM(nombre)) ORDER BY id::text))[1] AS canonico_id
  FROM productos
  WHERE eliminado = false
),
duplicados4 AS (
  SELECT duplicado_id FROM productos_canonico4 WHERE duplicado_id <> canonico_id
)
DELETE FROM inventario_motorizado
WHERE producto_id IN (SELECT duplicado_id FROM duplicados4);

-- 5) Marcar productos duplicados como eliminados (soft delete)
WITH productos_canonico5 AS (
  SELECT
    id AS duplicado_id,
    (array_agg(id) OVER (PARTITION BY LOWER(TRIM(nombre)) ORDER BY id::text))[1] AS canonico_id
  FROM productos
  WHERE eliminado = false
),
duplicados5 AS (
  SELECT duplicado_id FROM productos_canonico5 WHERE duplicado_id <> canonico_id
)
UPDATE productos
SET eliminado = true, actualizado_por = NULL
WHERE id IN (SELECT duplicado_id FROM duplicados5);

COMMIT;

-- Opcional: si quieres borrar físicamente en lugar de soft-delete, descomenta y ejecuta después:
-- DELETE FROM productos WHERE eliminado = true AND id IN (los que acabas de marcar);
-- Mejor dejar eliminado = true para poder recuperar si algo falla.
