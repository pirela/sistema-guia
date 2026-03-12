# Dónde está el código que resta stock al marcar "Entregada"

## Dónde lo usa el motorizado (importante)

Los motorizados **solo ven el módulo Mis Guías**, no el listado de Guías. Ahí pulsan "Entregada".  
Por tanto la lógica que **resta el stock** debe estar en **Mis Guías**.

## Archivos

1. **`src/app/dashboard/mis-guias/page.tsx`** – Donde el motorizado marca "Entregada" (validación + resta de inventario).
2. **`src/app/dashboard/guias/[id]/page.tsx`** – Detalle de guía (admin o quien abra una guía por id); también tiene la misma lógica por si marcan entregada desde ahí.

---

## 1. Dónde se dispara (motorizado) — Mis Guías

En **`mis-guias/page.tsx`**, el botón **"Entregada"** se muestra cuando la guía está en **en_ruta** (aprox. líneas 1017-1022). Al pulsarlo se llama `actualizarEstado(guia.id, 'entregada')` → `ejecutarCambioEstado(guiaId, 'entregada', ...)`, que ahora **valida stock y resta inventario**.

En **`guias/[id]/page.tsx`** (detalle de guía), el botón **"Marcar Entregada"** solo se muestra al motorizado cuando la guía está en **en_ruta** (líneas 704-712):

```tsx
{user?.rol === 'motorizado' && guia.estado === 'en_ruta' && (
  <>
    <button onClick={() => actualizarEstado('entregada')} ...>
      Marcar Entregada
    </button>
    ...
  </>
)}
```

- `actualizarEstado('entregada')` → llama a `ejecutarCambioEstado('entregada', estadoAnterior, '')`.

---

## 2. Función que hace todo: `ejecutarCambioEstado`

**Líneas aprox. 258-412.**

### 2.1 Validación (solo si nuevoEstado === 'entregada') — líneas 265-296

- Lee `guias_productos` de la guía (producto_id, cantidad).
- Lee `inventario_motorizado` del motorizado asignado (`guia.motorizado_asignado`).
- Comprueba que para cada producto el motorizado tenga stock >= cantidad.
- Si falta stock → `alert` y `return` (no se cambia nada).

### 2.2 Actualizar guía — líneas 300-309

- `supabase.from('guias').update({ estado: 'entregada', fecha_entrega: ... }).eq('id', guia.id)`.

### 2.3 Historial y novedades — líneas 310-335

- Inserta en `historial_estado` y, si hay comentario, en `novedades`.

### 2.4 Restar inventario (solo si nuevoEstado === 'entregada') — líneas 338-406

- Vuelve a leer `guias_productos` de la guía.
- Por cada línea:
  - **Leer** inventario: `inventario_motorizado` donde `motorizado_id = guia.motorizado_asignado` y `producto_id = linea.producto_id`.
  - **Calcular** nueva cantidad: `actual - linea.cantidad`.
  - Si `nueva <= 0` → **DELETE** en `inventario_motorizado` (mismo motorizado_id y producto_id).
  - Si `nueva > 0` → **UPDATE** en `inventario_motorizado` con `cantidad: nueva`.
  - **INSERT** en `movimientos_inventario` (tipo `salida_entrega`, guia_id, usuario_id).
  - Si **cualquier** operación falla → se **revierte** la guía al estado anterior y se hace `throw` con el mensaje de error (ahora ese mensaje se muestra en el `alert` del catch).

---

## 3. Cómo depurar

1. **Abrir la consola del navegador** (F12 → pestaña Console) antes de pulsar "Marcar Entregada".
2. En **desarrollo** verás el log:  
   `[Entregada] Restando inventario. Motorizado: <uuid> Líneas: [{ producto_id, cantidad }, ...]`  
   Si no aparece, el flujo no está entrando al bloque de restar inventario.
3. Si aparece un **alert** de error al pulsar Entregada, el texto incluirá el mensaje real (por ejemplo de RLS o de Supabase). Anótalo para revisar permisos o datos.
4. En **Supabase**:
   - Comprobar que existen políticas RLS para `inventario_motorizado` y `movimientos_inventario` (script `inventario-rls-policies.sql`).
   - Comprobar que el motorizado puede UPDATE/DELETE sus filas en `inventario_motorizado` (donde `motorizado_id = auth.uid()`).

---

## 4. Resumen del flujo

```
Motorizado pulsa "Marcar Entregada"
  → actualizarEstado('entregada')
  → ejecutarCambioEstado('entregada', estadoAnterior, '')
  → Validar stock del motorizado
  → Update guías (estado = entregada)
  → Insert historial_estado
  → Para cada línea de guias_productos:
      → Update o Delete inventario_motorizado (motorizado_asignado, producto)
      → Insert movimientos_inventario (salida_entrega)
  → Si algo falla: revertir guía y mostrar error en alert
```
