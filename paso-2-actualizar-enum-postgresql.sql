-- ============================================
-- PASO 2: Agregar estado 'novedad' al enum en PostgreSQL
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase

-- Verificar el nombre exacto del enum primero
-- (Puede ser 'estado_guia' o similar)
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM 
    pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE 
    t.typname LIKE '%estado%' OR t.typname LIKE '%guia%'
ORDER BY 
    t.typname, e.enumsortorder;

-- ============================================
-- OPCIÓN 1: Si el enum se llama 'estado_guia'
-- ============================================
-- Agregar el nuevo valor al enum
ALTER TYPE estado_guia ADD VALUE IF NOT EXISTS 'novedad';

-- ============================================
-- OPCIÓN 2: Si el enum tiene otro nombre, 
-- primero ejecuta la consulta de arriba para 
-- identificar el nombre exacto, luego usa:
-- ============================================
-- ALTER TYPE [NOMBRE_DEL_ENUM] ADD VALUE IF NOT EXISTS 'novedad';

-- ============================================
-- Verificación: Ver todos los valores del enum
-- ============================================
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM 
    pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE 
    t.typname = 'estado_guia'  -- Ajusta el nombre si es diferente
ORDER BY 
    e.enumsortorder;

-- ============================================
-- NOTA IMPORTANTE:
-- ============================================
-- Si el enum NO existe y la columna 'estado' 
-- es simplemente VARCHAR o TEXT, entonces NO
-- necesitas ejecutar ALTER TYPE. Solo verifica
-- que la columna acepte cualquier string.
--
-- Para verificar el tipo de la columna:
-- ============================================
SELECT 
    column_name,
    data_type,
    udt_name
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'guias'
    AND column_name = 'estado';

