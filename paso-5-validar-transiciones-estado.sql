-- ============================================
-- PASO 5: Crear/Actualizar Función de Validación de Transiciones de Estado
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase

-- ============================================
-- Función para validar transiciones de estado
-- ============================================
CREATE OR REPLACE FUNCTION validar_transicion_estado(
    estado_anterior estado_guia,
    estado_nuevo estado_guia
) RETURNS BOOLEAN AS $$
BEGIN
    -- Si no hay cambio, permitir
    IF estado_anterior = estado_nuevo THEN
        RETURN TRUE;
    END IF;

    -- Definir transiciones permitidas
    CASE estado_anterior
        WHEN 'pendiente' THEN
            -- Desde pendiente solo se puede ir a asignada o cancelada
            IF estado_nuevo NOT IN ('asignada', 'cancelada') THEN
                RAISE EXCEPTION 'Desde estado "pendiente" solo se puede cambiar a "asignada" o "cancelada"';
            END IF;
            
        WHEN 'asignada' THEN
            -- Desde asignada se puede ir a: en_ruta, novedad, cancelada, rechazada
            IF estado_nuevo NOT IN ('en_ruta', 'novedad', 'cancelada', 'rechazada') THEN
                RAISE EXCEPTION 'Desde estado "asignada" solo se puede cambiar a "en_ruta", "novedad", "cancelada" o "rechazada"';
            END IF;
            
        WHEN 'en_ruta' THEN
            -- Desde en_ruta se puede ir a: entregada, novedad, cancelada, rechazada
            IF estado_nuevo NOT IN ('entregada', 'novedad', 'cancelada', 'rechazada') THEN
                RAISE EXCEPTION 'Desde estado "en_ruta" solo se puede cambiar a "entregada", "novedad", "cancelada" o "rechazada"';
            END IF;
            
        WHEN 'novedad' THEN
            -- Desde novedad se puede ir a: asignada, en_ruta, cancelada, rechazada
            IF estado_nuevo NOT IN ('asignada', 'en_ruta', 'cancelada', 'rechazada') THEN
                RAISE EXCEPTION 'Desde estado "novedad" solo se puede cambiar a "asignada", "en_ruta", "cancelada" o "rechazada"';
            END IF;
            
        WHEN 'entregada' THEN
            -- Desde entregada solo se puede ir a finalizada
            IF estado_nuevo != 'finalizada' THEN
                RAISE EXCEPTION 'Desde estado "entregada" solo se puede cambiar a "finalizada"';
            END IF;
            
        WHEN 'finalizada' THEN
            -- Desde finalizada no se puede cambiar a ningún otro estado
            RAISE EXCEPTION 'No se puede cambiar el estado de una guía "finalizada"';
            
        WHEN 'cancelada' THEN
            -- Desde cancelada no se puede cambiar a ningún otro estado
            RAISE EXCEPTION 'No se puede cambiar el estado de una guía "cancelada"';
            
        WHEN 'rechazada' THEN
            -- Desde rechazada no se puede cambiar a ningún otro estado
            RAISE EXCEPTION 'No se puede cambiar el estado de una guía "rechazada"';
            
        ELSE
            RAISE EXCEPTION 'Estado desconocido: %', estado_anterior;
    END CASE;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Función del trigger (wrapper)
-- ============================================
CREATE OR REPLACE FUNCTION validar_transicion_estado_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar la transición
    PERFORM validar_transicion_estado(OLD.estado, NEW.estado);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Crear o actualizar trigger para validar transiciones
-- ============================================
-- Primero, eliminar el trigger si existe
DROP TRIGGER IF EXISTS trigger_validar_transicion_estado ON guias;

-- Crear el trigger
CREATE TRIGGER trigger_validar_transicion_estado
    BEFORE UPDATE OF estado ON guias
    FOR EACH ROW
    WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
    EXECUTE FUNCTION validar_transicion_estado_trigger();

-- ============================================
-- Verificación: Probar la función
-- ============================================
-- Estas consultas deberían funcionar:
-- SELECT validar_transicion_estado('asignada'::estado_guia, 'novedad'::estado_guia); -- TRUE
-- SELECT validar_transicion_estado('en_ruta'::estado_guia, 'novedad'::estado_guia); -- TRUE
-- SELECT validar_transicion_estado('novedad'::estado_guia, 'asignada'::estado_guia); -- TRUE
-- SELECT validar_transicion_estado('novedad'::estado_guia, 'en_ruta'::estado_guia); -- TRUE
-- SELECT validar_transicion_estado('novedad'::estado_guia, 'cancelada'::estado_guia); -- TRUE
-- SELECT validar_transicion_estado('novedad'::estado_guia, 'rechazada'::estado_guia); -- TRUE

-- Estas deberían fallar:
-- SELECT validar_transicion_estado('novedad'::estado_guia, 'entregada'::estado_guia); -- ERROR
-- SELECT validar_transicion_estado('entregada'::estado_guia, 'novedad'::estado_guia); -- ERROR

-- ============================================
-- NOTA IMPORTANTE:
-- ============================================
-- Si ya existe una función de validación de estados,
-- puedes actualizarla en lugar de crear una nueva.
-- Revisa si existe alguna función similar antes de ejecutar.
--
-- Para verificar funciones existentes:
-- ============================================
-- SELECT 
--     routine_name,
--     routine_definition
-- FROM 
--     information_schema.routines
-- WHERE 
--     routine_schema = 'public'
--     AND routine_name LIKE '%validar%estado%'
--     OR routine_name LIKE '%transicion%';

