-- ============================================
-- SCRIPT SIMPLE PARA EXPORTAR ESQUEMA
-- Ejecuta esto en SQL Editor de Supabase
-- ============================================

-- 1. LISTAR TODAS LAS TABLAS Y SUS COLUMNAS
SELECT 
    t.table_name AS "Tabla",
    c.column_name AS "Columna",
    c.data_type AS "Tipo",
    c.is_nullable AS "Nullable",
    c.column_default AS "Default",
    c.ordinal_position AS "Orden"
FROM 
    information_schema.tables t
    JOIN information_schema.columns c 
        ON t.table_name = c.table_name
WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY 
    t.table_name, c.ordinal_position;

-- 2. VER RELACIONES (FOREIGN KEYS)
SELECT
    tc.table_name AS "Tabla",
    kcu.column_name AS "Columna",
    ccu.table_name AS "Tabla Referenciada",
    ccu.column_name AS "Columna Referenciada",
    tc.constraint_name AS "Nombre Constraint"
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_name;

-- 3. VER VISTAS
SELECT 
    table_name AS "Vista",
    view_definition AS "Definición"
FROM 
    information_schema.views
WHERE 
    table_schema = 'public';

-- 4. VER PRIMARY KEYS
SELECT
    tc.table_name AS "Tabla",
    kcu.column_name AS "Columna PK"
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
WHERE 
    tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_name;

