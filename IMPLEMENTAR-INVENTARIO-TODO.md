# TODO: Implementación inventario por motorizado

Orden de ejecución para implementar el inventario. Cuando des el OK, se implementa en este orden.

---

## Hecho

- [x] **Script BD**: Ejecutado `inventario-motorizado-tablas.sql` en Supabase (tablas `inventario_motorizado` y `movimientos_inventario`).

---

## Pendiente (en orden)

### 1. Tipos TypeScript
- **Archivo:** `types/database.ts`
- **Qué hacer:** Añadir interfaces `InventarioMotorizado` y `MovimientoInventario` con los campos de las tablas.
- **Detalle:** Incluir tipos para `tipo` de movimientos (`'entrada' | 'salida_entrega' | 'salida_manual'`).

---

### 2. API routes de inventario
- **Archivos nuevos:**
  - `src/app/api/inventario/route.ts` — GET: listar stock por `motorizado_id` (query param). Consulta directa a BD, sin caché.
  - `src/app/api/inventario/cargar/route.ts` — POST: body `{ motorizado_id, producto_id, cantidad }`. Insert o sumar en `inventario_motorizado`; opcional insert en `movimientos_inventario` tipo `entrada`.
  - `src/app/api/inventario/restar/route.ts` — POST: body `{ motorizado_id, producto_id, cantidad, comentario? }`. Validar stock >= cantidad; restar; opcional insert en `movimientos_inventario` tipo `salida_manual`.
- **Regla:** Todas las lecturas/escrituras a BD en tiempo real (no usar caché).

---

### 3. Página Inventario (dashboard)
- **Archivo nuevo:** `src/app/dashboard/inventario/page.tsx`
- **Qué hacer:**
  - Solo accesible para rol `administrador`.
  - Selector de motorizado (lista de usuarios con rol motorizado).
  - Al elegir motorizado: tabla con stock actual (producto, cantidad) — consulta directa a BD o a GET `/api/inventario?motorizado_id=...`.
  - Formulario **Cargar stock**: motorizado, producto, cantidad → POST a `/api/inventario/cargar`.
  - Formulario **Restar manual**: motorizado, producto, cantidad, comentario opcional → POST a `/api/inventario/restar`.
- **Regla:** No usar `cachedFetch`; todas las consultas directas a BD o a las APIs anteriores.

---

### 4. Enlace en Sidebar
- **Archivo:** `components/Sidebar.tsx`
- **Qué hacer:** Añadir en `adminLinks` un enlace a `/dashboard/inventario` (ej. label "Inventario", icono tipo 📦 o 🧾).

---

### 5. Lógica "entregada" en detalle de guía
- **Archivo:** `src/app/dashboard/guias/[id]/page.tsx`
- **Qué hacer:** En el flujo que cambia la guía a estado `entregada` (donde está `ejecutarCambioEstado`):
  1. **Antes** de actualizar la guía: obtener líneas de la guía (`guias_productos`) y stock del motorizado (`inventario_motorizado`). Validar que para cada producto la cantidad en stock >= cantidad de la guía.
  2. Si falta stock: mostrar mensaje claro (ej. "No se puede marcar como entregada: el motorizado no tiene stock suficiente de [producto] (necesita N, tiene M)") y no cambiar estado.
  3. Si todo OK: actualizar `guias` a `entregada` (y fecha_entrega, historial, etc. como ya se hace), luego por cada línea de `guias_productos` restar esa cantidad de `inventario_motorizado` del motorizado asignado. Opcional: insert en `movimientos_inventario` con `tipo: salida_entrega` y `guia_id`.
- **Regla:** Consultas de validación y actualizaciones de inventario directas a BD (sin caché).

---

### 6. Revisión "sin caché"
- **Dónde:** Página inventario, APIs inventario, flujo entregada en detalle guía.
- **Qué verificar:** En ningún lugar del flujo de inventario se use `cachedFetch` ni otra caché para `inventario_motorizado` o `movimientos_inventario`; todo en tiempo real contra la BD.

---

## Resumen

| # | Tarea                         | Archivo(s) principal(es)                    |
|---|-------------------------------|---------------------------------------------|
| 1 | Tipos TS                      | `types/database.ts`                         |
| 2 | API inventario (listar, cargar, restar) | `src/app/api/inventario/*`           |
| 3 | Página /dashboard/inventario  | `src/app/dashboard/inventario/page.tsx`     |
| 4 | Enlace Sidebar                | `components/Sidebar.tsx`                     |
| 5 | Validar y restar al marcar entregada | `src/app/dashboard/guias/[id]/page.tsx` |
| 6 | Revisión sin caché            | Todos los puntos anteriores                  |

Cuando des el OK, se implementa en el orden 1 → 2 → 3 → 4 → 5 → 6.
