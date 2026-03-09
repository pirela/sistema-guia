-- =============================================================================
-- Políticas RLS para inventario por motorizado
-- Si el motorizado marca una guía como "entregada" y el stock NO baja, suele ser
-- porque RLS bloquea UPDATE/DELETE en inventario_motorizado o INSERT en movimientos_inventario.
-- Ejecuta este script en Supabase SQL Editor (Dashboard > SQL Editor).
-- =============================================================================

-- Activar RLS en las tablas (si no está ya)
ALTER TABLE inventario_motorizado ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- inventario_motorizado
-- -----------------------------------------------------------------------------
-- El motorizado debe poder leer y actualizar/borrar su propio inventario.
-- El administrador debe poder todo (cargar stock a cualquier motorizado, etc.).

DROP POLICY IF EXISTS "inventario_motorizado_select" ON inventario_motorizado;
CREATE POLICY "inventario_motorizado_select" ON inventario_motorizado
  FOR SELECT TO authenticated
  USING (
    motorizado_id = auth.uid()
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'administrador'
  );

DROP POLICY IF EXISTS "inventario_motorizado_insert" ON inventario_motorizado;
CREATE POLICY "inventario_motorizado_insert" ON inventario_motorizado
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'administrador'
  );

DROP POLICY IF EXISTS "inventario_motorizado_update" ON inventario_motorizado;
CREATE POLICY "inventario_motorizado_update" ON inventario_motorizado
  FOR UPDATE TO authenticated
  USING (
    motorizado_id = auth.uid()
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'administrador'
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "inventario_motorizado_delete" ON inventario_motorizado;
CREATE POLICY "inventario_motorizado_delete" ON inventario_motorizado
  FOR DELETE TO authenticated
  USING (
    motorizado_id = auth.uid()
    OR (SELECT rol FROM public.usuarios WHERE id = auth.uid()) = 'administrador'
  );

-- -----------------------------------------------------------------------------
-- movimientos_inventario
-- -----------------------------------------------------------------------------
-- Cualquier usuario autenticado (admin o motorizado) puede insertar al marcar
-- entregada o al cargar/restar. Lectura para ver historial.

DROP POLICY IF EXISTS "movimientos_inventario_select" ON movimientos_inventario;
CREATE POLICY "movimientos_inventario_select" ON movimientos_inventario
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "movimientos_inventario_insert" ON movimientos_inventario;
CREATE POLICY "movimientos_inventario_insert" ON movimientos_inventario
  FOR INSERT TO authenticated
  WITH CHECK (true);
