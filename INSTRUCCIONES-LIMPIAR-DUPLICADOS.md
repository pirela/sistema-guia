# 📋 Instrucciones Paso a Paso: Limpiar Productos Duplicados

## ⚠️ IMPORTANTE ANTES DE EMPEZAR

1. **Haz un backup de tu base de datos** (si es posible)
2. **Ejecuta los scripts en orden** (Paso 1, 2, 3, 4)
3. **Revisa los resultados** de cada paso antes de continuar
4. **No ejecutes los UPDATE** hasta estar seguro de los cambios

---

## 📍 Paso 1: Ver Productos Duplicados

**Archivo:** `paso-1-ver-duplicados.sql`

**Qué hace:**
- Identifica productos con el mismo nombre (normalizado)
- Muestra cuántos duplicados hay de cada producto
- Lista los IDs de los productos duplicados

**Cómo ejecutar:**
1. Abre Supabase Dashboard
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `paso-1-ver-duplicados.sql`
4. Haz clic en **Run** o presiona `Ctrl + Enter`
5. Revisa los resultados

**Qué esperar:**
- Verás una tabla con productos duplicados
- La columna `cantidad_duplicados` te dice cuántos hay de cada uno
- Si no hay resultados, significa que no hay duplicados

---

## 📍 Paso 2: Verificar Uso de Productos Duplicados

**Archivo:** `paso-2-verificar-uso.sql`

**Qué hace:**
- Verifica si los productos duplicados están siendo usados en guías
- Muestra cuántas veces se usa cada producto duplicado
- Indica cuáles se mantendrán y cuáles se eliminarán

**Cómo ejecutar:**
1. En el mismo SQL Editor de Supabase
2. Copia y pega el contenido de `paso-2-verificar-uso.sql`
3. Haz clic en **Run**
4. Revisa los resultados

**Qué esperar:**
- Verás qué productos duplicados están en uso
- La columna `veces_usado_en_guias` indica si están siendo usados
- Si `veces_usado_en_guias > 0`, necesitarás ejecutar el Paso 3

**Si NO hay productos en uso (todas las filas muestran `veces_usado_en_guias = 0`):**
- Puedes saltar el Paso 3
- Ve directo al Paso 4

---

## 📍 Paso 3: Migrar Referencias (SOLO si hay productos en uso)

**Archivo:** `paso-3-migrar-referencias.sql`

**⚠️ IMPORTANTE:** Solo ejecuta esto si el Paso 2 mostró productos con `veces_usado_en_guias > 0`

**Qué hace:**
- Primero muestra un PREVIEW de qué se va a actualizar
- Luego (si descomentas) actualiza las guías para usar el producto principal en lugar del duplicado

**Cómo ejecutar:**

### 3.1. Ver Preview (primero):
1. Copia y pega el contenido de `paso-3-migrar-referencias.sql`
2. Ejecuta solo la primera parte (hasta el comentario)
3. Revisa qué guías se van a actualizar

### 3.2. Ejecutar UPDATE (si estás de acuerdo):
1. Descomenta la sección del UPDATE (quita los `/*` y `*/`)
2. Ejecuta nuevamente
3. Verifica que se actualizaron las referencias

**Qué esperar:**
- El preview muestra qué `guias_productos` se actualizarán
- El UPDATE cambia `producto_id` de los duplicados al producto principal
- Después de esto, todas las guías apuntarán al producto principal

---

## 📍 Paso 4: Eliminar Productos Duplicados

**Archivo:** `paso-4-eliminar-duplicados.sql`

**⚠️ IMPORTANTE:** 
- Ejecuta esto SOLO después del Paso 3 (si había productos en uso)
- O ejecuta esto directamente si NO había productos en uso (Paso 2 mostró 0 usos)

**Qué hace:**
- Primero muestra un PREVIEW de qué productos se van a eliminar
- Luego (si descomentas) marca como `eliminado = true` los productos duplicados

**Cómo ejecutar:**

### 4.1. Ver Preview (primero):
1. Copia y pega el contenido de `paso-4-eliminar-duplicados.sql`
2. Ejecuta solo la primera parte (hasta el comentario)
3. Revisa qué productos se van a eliminar

### 4.2. Ejecutar UPDATE (si estás de acuerdo):
1. Descomenta la sección del UPDATE (quita los `/*` y `*/`)
2. Ejecuta nuevamente
3. Verifica que los productos ya no aparecen en el listado

**Qué esperar:**
- El preview muestra todos los productos duplicados que se eliminarán
- El UPDATE marca `eliminado = true` en esos productos
- Después de esto, solo quedarán los productos principales visibles

---

## ✅ Verificación Final

Después de ejecutar todos los pasos:

1. **Ve a tu aplicación** → `/dashboard/productos`
2. **Verifica** que solo aparecen los productos únicos
3. **Revisa una guía existente** para asegurarte de que los productos siguen apareciendo correctamente
4. **Prueba importar una orden de Shopify** para verificar que reutiliza productos existentes

---

## 🔄 Si algo sale mal

Si necesitas revertir los cambios:

```sql
-- Para restaurar productos eliminados (si los necesitas)
UPDATE productos
SET eliminado = false
WHERE eliminado = true;
```

**Nota:** Esto restaurará TODOS los productos eliminados, no solo los duplicados que acabamos de eliminar.

---

## 📝 Resumen de Archivos

- `paso-1-ver-duplicados.sql` - Ver cuántos duplicados hay
- `paso-2-verificar-uso.sql` - Ver si están en uso
- `paso-3-migrar-referencias.sql` - Migrar referencias (solo si están en uso)
- `paso-4-eliminar-duplicados.sql` - Eliminar duplicados
- `INSTRUCCIONES-LIMPIAR-DUPLICADOS.md` - Este archivo

---

## ❓ Preguntas Frecuentes

**P: ¿Esto borra los productos físicamente?**
R: No, solo los marca como `eliminado = true`. Los datos siguen en la base de datos.

**P: ¿Puedo recuperar los productos eliminados?**
R: Sí, ejecutando `UPDATE productos SET eliminado = false WHERE eliminado = true`

**P: ¿Qué pasa con las guías existentes?**
R: Si ejecutaste el Paso 3, las guías ahora apuntan al producto principal. Si no había productos en uso, no pasa nada.

**P: ¿Esto afecta la importación de Shopify?**
R: No, la importación seguirá funcionando. Ahora reutilizará los productos existentes gracias a la función que implementamos.



