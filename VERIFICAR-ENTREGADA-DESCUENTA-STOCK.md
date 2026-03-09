# Verificación: al marcar guía como "Entregada" se descuenta el stock

## Flujo en código (detalle de guía)

Cuando el motorizado (o admin) cambia el estado de una guía a **Entregada**:

1. **Validación (antes de cambiar nada)**
   - Se leen las líneas de la guía (`guias_productos`: producto_id, cantidad).
   - Se lee el inventario del motorizado asignado (`inventario_motorizado`).
   - Por cada producto de la guía se comprueba: `stock del motorizado >= cantidad de la guía`.
   - Si falta stock en algún producto → se muestra alerta con el detalle y **no** se cambia el estado.

2. **Si la validación pasa**
   - Se actualiza la guía: `estado = 'entregada'`, `fecha_entrega = now()`.
   - Se inserta en `historial_estado` y, si hay comentario, en `novedades`.

3. **Resta de inventario (solo cuando estado = entregada)**
   - Se vuelven a leer las líneas de la guía (`guias_productos`).
   - Por cada línea:
     - Se lee la cantidad actual en `inventario_motorizado` para ese motorizado y producto.
     - Se resta: `nueva = actual - cantidad de la línea`.
     - Si `nueva <= 0` → se **borra** la fila de inventario (o queda en 0 según implementación).
     - Si `nueva > 0` → se **actualiza** la fila con la nueva cantidad.
     - Se inserta en `movimientos_inventario` (tipo `salida_entrega`, guia_id, usuario_id).
   - Si **cualquier** operación de inventario falla → se **revierte** el estado de la guía al anterior y se muestra el error.

4. **Motorizado asignado**
   - Siempre se usa `guia.motorizado_asignado` para leer y restar del inventario (el repartidor que tiene la guía asignada).

## Requisitos en producción

- **Políticas RLS** (Supabase): ejecutar `inventario-rls-policies.sql` en el proyecto de producción para que:
  - El motorizado pueda **SELECT, UPDATE y DELETE** en `inventario_motorizado` donde `motorizado_id = auth.uid()`.
  - Cualquier usuario autenticado pueda **INSERT** en `movimientos_inventario`.
- **Despliegue**: subir la versión actual del front (incluye validación, resta, reversión y mensajes de error).

## Cómo comprobar que descuenta

1. En **Inventario**, anotar el stock actual de un motorizado para un producto (ej. 10).
2. Marcar como **Entregada** una guía asignada a ese motorizado que lleve ese producto (ej. cantidad 2).
3. Volver a **Inventario**, mismo motorizado: ese producto debe tener **8** (10 - 2).
4. En la tabla `movimientos_inventario` debe aparecer un registro con `tipo = 'salida_entrega'` y esa guía.

Si al marcar entregada aparece un alert de error (por ejemplo por RLS), no se habrá cambiado el estado de la guía y no se habrá restado stock hasta corregir permisos.
