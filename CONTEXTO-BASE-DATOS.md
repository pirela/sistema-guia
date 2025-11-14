# Contexto Completo de la Base de Datos - Sistema de Guías

## 📊 Estructura de Tablas Identificada

### Tablas Principales

#### 1. **usuarios**
- Campos base: `id`, `username`, `email`, `password_hash`, `nombre`, `rol`, `activo`, `eliminado`
- Auditoría: `creado_por`, `actualizado_por`, `fecha_creacion`, `fecha_actualizacion`
- Roles: `'administrador' | 'motorizado'`

#### 2. **productos**
- Campos: `id`, `codigo_sku`, `nombre`, `descripcion`, `precio`, `activo`, `eliminado`
- Auditoría: `creado_por`, `actualizado_por`, `fecha_creacion`, `fecha_actualizacion`

#### 3. **guias**
- Campos base: `id`, `numero_guia`, `nombre_cliente`, `telefono_cliente`, `direccion`, `referencia`, `observacion`
- Estado: `estado` (enum: 'pendiente' | 'asignada' | 'en_ruta' | 'entregada' | 'finalizada' | 'cancelada' | 'rechazada')
- Asignación: `motorizado_asignado`, `creado_por`, `fecha_asignacion`
- Fechas: `fecha_entrega`, `fecha_finalizacion`
- Montos: `monto_recaudar`, `monto_pago_motorizado`
- Liquidación: `liquidacion_id` (FK → liquidaciones.id)
- Finalización: `finalizado_por`, `observacion_finalizacion`
- Auditoría: `actualizado_por`, `eliminado`, `fecha_creacion`, `fecha_actualizacion`

#### 4. **guias_productos** (Tabla intermedia)
- Campos: `id`, `guia_id`, `producto_id`, `cantidad`, `precio_unitario`

#### 5. **historial_estado**
- Campos: `id`, `guia_id`, `estado_anterior`, `estado_nuevo`, `usuario_id`, `comentario`, `fecha_cambio`

#### 6. **novedades** (Nueva tabla identificada)
- Campos inferidos:
  - `id` (UUID, PK)
  - `guia_id` (UUID, FK → guias.id)
  - `tipo_novedad` (string/enum)
  - `descripcion` (text)
  - `fecha_reprogramacion` (timestamp, nullable)
  - `creado_por` (UUID, FK → usuarios.id)
  - `fecha_creacion` (timestamp)

#### 7. **liquidaciones** (Nueva tabla identificada)
- Campos inferidos:
  - `id` (UUID, PK)
  - `numero_liquidacion` (VARCHAR, único)
  - `motorizado_id` (UUID, FK → usuarios.id)
  - `fecha_inicio` (DATE)
  - `fecha_fin` (DATE)
  - `cantidad_guias` (INTEGER)
  - `monto_por_guia` (DECIMAL)
  - `monto_total` (DECIMAL)
  - `observaciones` (TEXT, nullable)
  - `creado_por` (UUID, FK → usuarios.id)
  - `fecha_creacion` (timestamp)

#### 8. **liquidaciones_detalle** (Nueva tabla identificada)
- Campos inferidos:
  - `id` (UUID, PK)
  - `liquidacion_id` (UUID, FK → liquidaciones.id)
  - `guia_id` (UUID, FK → guias.id)
  - `monto_pagado` (DECIMAL)

#### 9. **configuracion_sistema** (Nueva tabla identificada)
- Campos inferidos:
  - `clave` (VARCHAR, PK)
  - `valor` (TEXT)
- Configuraciones conocidas:
  - `'monto_pago_por_entrega'` o `'monto_por_guia'`
  - Probablemente más configuraciones

### Vistas Materializadas

1. **vista_estadisticas_motorizado** - Estadísticas por motorizado
2. **vista_guias_por_estado** - Conteo de guías por estado
3. **vista_productos_mas_despachados** - Top productos más despachados

### Secuencias

- **guias_correlativo_seq** - Para generar números de guía correlativos

---

## 🔧 Funciones Existentes (Análisis)

### Funciones de Validación

1. **validar_estado_finalizada** - Valida transición a estado 'finalizada'
2. **validar_motorizado_rol** - Valida que usuario asignado sea motorizado

### Funciones de Generación

3. **generar_numero_guia** - Genera número con formato: `GD-[CREADOR]-[MOTORIZADO]-[CORRELATIVO]`
4. **generar_numero_liquidacion** - Genera número: `LIQ-YYYYMM-####`

### Funciones de Cálculo

5. **calcular_pago_motorizado** - Calcula estadísticas de pago
6. **calcular_monto_liquidacion** - Calcula monto de liquidación
7. **calcular_guias_entregadas** - Calcula guías entregadas con detalle JSON
8. **obtener_monto_por_entrega** - Obtiene monto desde configuración

### Funciones de Consulta

9. **obtener_guias_entregadas_por_fecha** - Obtiene guías entregadas en rango
10. **obtener_resumen_pago_motorizado** - Resumen completo en JSON con novedades

### Funciones de Procesamiento

11. **finalizar_guias_lote** - Finaliza múltiples guías en lote
12. **crear_liquidacion** - Crea liquidación y actualiza guías (2 versiones)
13. **refrescar_vistas_materializadas** - Refresca todas las vistas

### Triggers (Funciones)

14. **trigger_generar_numero_guia** - Auto-genera número al crear guía
15. **trigger_historial_crear_guia** - Registra creación en historial
16. **trigger_historial_cambio_estado** - Registra cambios de estado
17. **trigger_historial_cambio_motorizado** - Registra reasignaciones
18. **trigger_historial_novedad** - Registra novedades en historial
19. **trigger_actualizar_fecha** - Actualiza `fecha_actualizacion`
20. **actualizar_fecha_actualizacion** - Similar al anterior

---

## 🔄 Flujos de Negocio Identificados

### Flujo de Guía
1. **Creación** → Estado: `pendiente` o `asignada`
   - Trigger genera número automáticamente
   - Se registra en historial
2. **Asignación** → Estado: `asignada`
   - Se valida que motorizado tenga rol correcto
   - Se actualiza `fecha_asignacion`
3. **En Ruta** → Estado: `en_ruta`
4. **Entrega** → Estado: `entregada`
   - Se registra `fecha_entrega`
   - Se calcula `monto_pago_motorizado`
5. **Finalización** → Estado: `finalizada`
   - Solo si estaba en `entregada`
   - Se registra `fecha_finalizacion` y `finalizado_por`
   - Puede ser parte de una liquidación

### Flujo de Liquidación
1. Se calculan guías entregadas pendientes
2. Se crea liquidación con número único
3. Se actualizan guías a estado `finalizada`
4. Se crean registros en `liquidaciones_detalle`
5. Se asocia `liquidacion_id` a cada guía

### Flujo de Novedades
1. Se crea novedad asociada a guía
2. Trigger registra en historial automáticamente
3. Puede incluir `fecha_reprogramacion`

---

## 📝 Patrones Identificados

### Nomenclatura
- Funciones: `snake_case`
- Triggers: `trigger_*`
- Validaciones: `validar_*`
- Cálculos: `calcular_*`, `obtener_*`
- Generación: `generar_*`

### Manejo de Errores
- Uso de `RAISE EXCEPTION` para validaciones
- Try-catch en funciones de lote
- Retorno de contadores de éxito/error

### Auditoría
- Campos `creado_por`, `actualizado_por` en todas las tablas
- Campos `fecha_creacion`, `fecha_actualizacion`
- Historial completo de cambios de estado

### Soft Delete
- Campo `eliminado` (boolean) en tablas principales
- Filtros `WHERE eliminado = false` en consultas

---

## 🎯 Áreas para Nuevas Funciones

Basado en el análisis, podrías necesitar funciones para:

1. **Gestión de Novedades**
   - Crear novedad
   - Listar novedades por guía/motorizado
   - Resolver novedad

2. **Reportes Avanzados**
   - Reporte de rendimiento por motorizado
   - Reporte de novedades
   - Reporte de tiempos de entrega

3. **Validaciones Adicionales**
   - Validar estados permitidos
   - Validar fechas
   - Validar montos

4. **Procesos Batch**
   - Finalizar múltiples guías
   - Reasignar múltiples guías
   - Actualizar estados masivos

5. **Integraciones**
   - Sincronización con sistemas externos
   - Webhooks
   - Notificaciones

---

## ✅ Listo para Crear Nuevas Funciones

Tengo el contexto completo. Puedo ayudarte a crear funciones que:
- Sigan los patrones existentes
- Usen las tablas y campos correctos
- Incluyan validaciones apropiadas
- Registren en historial cuando corresponda
- Manejen errores correctamente
- Sean eficientes y seguras

**¿Qué funciones necesitas crear?**

