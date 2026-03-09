-- =============================================================================
-- Script: Tablas para inventario por motorizado
-- Proyecto: Sistema de Guías
-- Descripción: Crea las tablas inventario_motorizado y movimientos_inventario.
--              No incluye triggers ni funciones; la lógica se maneja en el front.
-- Ejecutar en: Supabase SQL Editor (o cliente PostgreSQL)
-- =============================================================================

-- Tabla: inventario_motorizado
-- Stock actual de cada producto por motorizado. Una fila por (motorizado, producto).
-- Si no existe fila, el stock se considera 0.
CREATE TABLE IF NOT EXISTS inventario_motorizado (
  motorizado_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  producto_id   UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad      INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (motorizado_id, producto_id)
);

COMMENT ON TABLE inventario_motorizado IS 'Stock actual por motorizado y producto; sin caché en app.';
COMMENT ON COLUMN inventario_motorizado.cantidad IS 'Cantidad disponible del producto que tiene el motorizado.';

-- Índice para consultas por motorizado (listar stock de un motorizado)
CREATE INDEX IF NOT EXISTS idx_inventario_motorizado_motorizado_id
  ON inventario_motorizado(motorizado_id);

-- Índice para consultas por producto (opcional)
CREATE INDEX IF NOT EXISTS idx_inventario_motorizado_producto_id
  ON inventario_motorizado(producto_id);


-- Tabla: movimientos_inventario
-- Historial de entradas y salidas para trazabilidad (quién, cuándo, por qué).
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorizado_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  producto_id   UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida_entrega', 'salida_manual')),
  cantidad      INTEGER NOT NULL CHECK (cantidad > 0),
  guia_id       UUID REFERENCES guias(id) ON DELETE SET NULL,
  comentario    TEXT,
  usuario_id    UUID NOT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
  fecha         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE movimientos_inventario IS 'Trazabilidad de cargas y bajas de inventario por motorizado.';
COMMENT ON COLUMN movimientos_inventario.tipo IS 'entrada=carga admin, salida_entrega=guía entregada, salida_manual=devolución/pérdida.';
COMMENT ON COLUMN movimientos_inventario.guia_id IS 'Solo informado cuando tipo = salida_entrega.';

-- Índices para listados y filtros
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_motorizado_id
  ON movimientos_inventario(motorizado_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_fecha
  ON movimientos_inventario(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_guia_id
  ON movimientos_inventario(guia_id) WHERE guia_id IS NOT NULL;


-- =============================================================================
-- Fin del script
-- =============================================================================
