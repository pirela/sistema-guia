# Guía: Cómo Exportar la Estructura de Base de Datos desde Supabase

## Opción 1: SQL Editor (Recomendado - Más Rápido)

### Pasos:
1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **SQL Editor**
3. Crea un nuevo query o usa el archivo `export-schema.sql` que creé
4. Ejecuta el query
5. Copia los resultados o descárgalos como CSV/JSON

### Ventajas:
- ✅ Rápido y directo
- ✅ Puedes filtrar por tablas específicas
- ✅ Obtienes información detallada

---

## Opción 2: Usar pg_dump (Más Completo)

### Pasos:
1. Ve a **Settings** → **Database** en tu proyecto
2. En la sección **Connection string**, copia la **Connection string** (URI)
3. Usa `pg_dump` desde tu terminal:

```bash
# Instalar PostgreSQL client tools si no los tienes
# Windows: Descarga desde https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Exportar SOLO la estructura (sin datos)
pg_dump "postgresql://postgres:[TU-PASSWORD]@[TU-PROJECT-REF].supabase.co:5432/postgres" \
  --schema-only \
  --no-owner \
  --no-privileges \
  > schema.sql

# Exportar estructura + datos
pg_dump "postgresql://postgres:[TU-PASSWORD]@[TU-PROJECT-REF].supabase.co:5432/postgres" \
  --no-owner \
  --no-privileges \
  > full-database.sql
```

### Obtener la Connection String:
1. Dashboard → **Settings** → **Database**
2. Busca **Connection string** → **URI**
3. Reemplaza `[YOUR-PASSWORD]` con tu contraseña de base de datos

---

## Opción 3: Supabase CLI (Más Profesional)

### Instalación:
```bash
npm install supabase --save-dev
# o
npx supabase --version
```

### Pasos:
1. Inicia sesión en Supabase CLI:
```bash
npx supabase login
```

2. Enlaza tu proyecto:
```bash
npx supabase link --project-ref [TU-PROJECT-REF]
```

3. Exporta el esquema:
```bash
# Exportar solo la estructura
npx supabase db dump --schema-only -f schema.sql

# Exportar todo (estructura + datos)
npx supabase db dump -f full-database.sql
```

### Obtener Project Ref:
- Está en la URL de tu proyecto: `https://app.supabase.com/project/[PROJECT-REF]`
- O en **Settings** → **General** → **Reference ID**

---

## Opción 4: Generar Tipos TypeScript Automáticamente

### Usando Supabase CLI:
```bash
# Generar tipos TypeScript desde tu base de datos
npx supabase gen types typescript --project-id [TU-PROJECT-REF] > types/database-generated.ts
```

### O usando la API de Supabase:
1. Ve a **Settings** → **API**
2. Copia tu **Project URL** y **anon key**
3. Usa este script:

```bash
# Instalar dependencia
npm install supabase --save-dev

# Generar tipos
npx supabase gen types typescript \
  --project-id [TU-PROJECT-REF] \
  --schema public > types/database-generated.ts
```

---

## Opción 5: Desde la Interfaz Web (Limitado)

### Para ver el esquema visualmente:
1. Ve a **Table Editor** en el Dashboard
2. Puedes ver las tablas y sus columnas
3. Haz clic en cada tabla para ver detalles
4. **Limitación**: No hay exportación directa desde aquí

---

## Recomendación para tu Proyecto

### Para análisis rápido:
Usa la **Opción 1** (SQL Editor) con el archivo `export-schema.sql` que creé.

### Para documentación completa:
Usa la **Opción 2** (pg_dump) para obtener un archivo SQL completo que puedas versionar.

### Para desarrollo:
Usa la **Opción 4** (Generar tipos TypeScript) para mantener sincronizados tus tipos con la base de datos.

---

## Query Rápido para Ver Todas las Tablas

```sql
-- Ver todas las tablas en tu base de datos
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name 
     AND table_schema = 'public') as column_count
FROM 
    information_schema.tables t
WHERE 
    table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY 
    table_name;
```

---

## Notas de Seguridad

⚠️ **IMPORTANTE:**
- Nunca compartas tu contraseña de base de datos
- Usa variables de entorno para las credenciales
- El `anon key` es seguro de compartir (solo lectura con RLS)
- El `service_role key` NUNCA debe ser compartido

---

## Siguiente Paso

Una vez que tengas el esquema exportado, puedo:
1. ✅ Analizarlo en detalle
2. ✅ Identificar problemas de diseño
3. ✅ Sugerir mejoras
4. ✅ Crear migraciones
5. ✅ Generar documentación completa

