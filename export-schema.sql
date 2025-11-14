-- Script para exportar el esquema completo de Supabase
-- Ejecuta este query en el SQL Editor de Supabase

-- 1. Exportar estructura de todas las tablas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name, ordinal_position;

-- 2. Exportar todas las restricciones (PK, FK, etc.)
SELECT
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.table_schema = 'public'
ORDER BY 
    tc.table_name, tc.constraint_type;

-- 3. Exportar todas las vistas
SELECT 
    table_name,
    view_definition
FROM 
    information_schema.views
WHERE 
    table_schema = 'public';

-- 4. Exportar funciones y triggers (si los tienes)
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM 
    information_schema.routines
WHERE 
    routine_schema = 'public';

