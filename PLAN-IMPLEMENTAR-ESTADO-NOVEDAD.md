# Plan de Implementación: Estado "novedad" en Guías

## 📋 Resumen
Agregar el estado `'novedad'` al sistema de estados de las guías, actualizando todos los componentes necesarios.

---

## 🎯 Pasos de Implementación

### **PASO 1: Actualizar Tipo TypeScript** ✅ (Empezamos aquí)
**Archivo:** `types/database.ts`
- Agregar `'novedad'` al tipo `EstadoGuia`
- **Impacto:** Frontend y validaciones TypeScript

---

### **PASO 2: Actualizar Enum en Base de Datos PostgreSQL**
**Archivo:** SQL en Supabase
- Agregar `'novedad'` al enum `estado_guia` en PostgreSQL
- **Impacto:** Base de datos aceptará el nuevo estado

---

### **PASO 3: Actualizar Colores y Estilos en Frontend**
**Archivos:**
- `src/app/dashboard/guias/page.tsx` (función `getEstadoColor`)
- `src/app/dashboard/guias/[id]/page.tsx` (función `getEstadoColor` y `getEstadoTexto`)
- `src/app/dashboard/mis-guias/page.tsx` (si tiene colores)

**Cambios:**
- Agregar color para estado `'novedad'`
- Agregar texto legible para el estado

---

### **PASO 4: Actualizar Filtros y Opciones de Estado**
**Archivos:**
- `src/app/dashboard/guias/page.tsx` (select de filtros)
- `src/app/dashboard/mis-guias/page.tsx` (select de filtros y contadores)

**Cambios:**
- Agregar opción "Novedad" en los filtros
- Incluir en contadores de estados

---

### **PASO 5: Actualizar Funciones de Validación en Base de Datos**
**Archivo:** SQL en Supabase
- Revisar función `validar_estado_finalizada` (si necesita cambios)
- Revisar otros triggers que validen estados
- **Nota:** Determinar transiciones permitidas desde/hacia `'novedad'`

---

### **PASO 6: Actualizar Lógica de Cambio de Estado en Frontend**
**Archivos:**
- `src/app/dashboard/guias/[id]/page.tsx` (botones de cambio de estado)
- `src/app/dashboard/mis-guias/page.tsx` (botones de cambio de estado)

**Cambios:**
- Agregar opción para cambiar a estado `'novedad'`
- Determinar desde qué estados se puede cambiar a `'novedad'`
- Determinar a qué estados se puede cambiar desde `'novedad'`

---

### **PASO 7: Actualizar Vistas Materializadas (si aplica)**
**Archivo:** SQL en Supabase
- Verificar si las vistas necesitan actualización
- Ejecutar `REFRESH MATERIALIZED VIEW` si es necesario

---

### **PASO 8: Testing y Validación**
- Probar cambio de estado a `'novedad'`
- Verificar que se registre en historial
- Verificar que aparezca en filtros
- Verificar colores y estilos

---

## 🔄 Transiciones de Estado (A Definir)

Necesitamos definir:
- **¿Desde qué estados se puede cambiar a `'novedad'`?**
  - ¿`'asignada'`?
  - ¿`'en_ruta'`?
  - ¿Otros?

- **¿A qué estados se puede cambiar desde `'novedad'`?**
  - ¿`'en_ruta'`? (para reintentar entrega)
  - ¿`'cancelada'`?
  - ¿`'rechazada'`?
  - ¿Otros?

---

## ✅ Checklist de Implementación

- [ ] Paso 1: Tipo TypeScript
- [ ] Paso 2: Enum PostgreSQL
- [ ] Paso 3: Colores y estilos
- [ ] Paso 4: Filtros y opciones
- [ ] Paso 5: Validaciones BD
- [ ] Paso 6: Lógica frontend
- [ ] Paso 7: Vistas materializadas
- [ ] Paso 8: Testing

---

## 📝 Notas Importantes

1. **Compatibilidad:** Asegurar que el nuevo estado no rompa funciones existentes
2. **Historial:** Los triggers automáticos deberían registrar el cambio
3. **Liquidaciones:** Verificar si `'novedad'` afecta el proceso de liquidación
4. **Reportes:** Las vistas materializadas pueden necesitar actualización

