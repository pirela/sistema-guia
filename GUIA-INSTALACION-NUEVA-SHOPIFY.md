# 🛒 Guía de Instalación en Nueva Tienda Shopify

Esta guía te ayudará a instalar el Sistema de Guías en una nueva tienda Shopify paso a paso.

---

## 📋 Requisitos Previos

- ✅ Acceso de administrador a la nueva tienda Shopify
- ✅ Node.js instalado (v18 o superior)
- ✅ Cuenta de Supabase (si vas a usar la misma base de datos, o una nueva)
- ✅ Git instalado

---

## 🔧 PASO 1: Configurar Acceso a la API de Shopify

### 1.1 Crear una Custom App en Shopify

1. **Accede a tu tienda Shopify** (nueva tienda donde vas a instalar)
   - URL: `https://tu-nueva-tienda.myshopify.com/admin`

2. **Ve a Settings → Apps and sales channels**
   - En la parte superior derecha, haz clic en **"Develop apps"**
   - Si es la primera vez, acepta los términos y condiciones

3. **Crear nueva app**
   - Clic en **"Create an app"**
   - Nombre de la app: `Sistema de Guías` (o el nombre que prefieras)
   - Clic en **"Create app"**

### 1.2 Configurar Permisos (Scopes)

1. **Ve a la pestaña "Configuration"**

2. **En "Admin API integration" → Clic en "Configure"**

3. **Selecciona los siguientes permisos:**
   - ✅ `read_orders` - Para leer órdenes
   - ✅ `read_products` - Para leer productos (opcional, por si se necesita)
   - ✅ `read_customers` - Para leer datos de clientes

4. **Guarda los cambios** → Clic en **"Save"**

### 1.3 Instalar la App y Obtener Credenciales

⚠️ **ACTUALIZACIÓN 2025**: La interfaz de Shopify cambió recientemente.

#### Opción 1: Si ves "Install app" (Interfaz Antigua)

1. **Ve a la pestaña "API credentials"**
2. **Clic en "Install app"** → Confirmar instalación
3. **Revelar el Access Token:**
   - Busca la sección **"Admin API access token"**
   - Clic en **"Reveal token once"**
   - ⚠️ Copia este token (empieza con `shpat_`)

#### Opción 2: Si NO ves "Install app" (Interfaz Nueva - 2025)

1. **Ve a la pestaña "API credentials"**

2. **Busca la sección "Access tokens"** (puede estar al final de la página)

3. **Clic en "Create access token"** o "Generate token"

4. **Se generará automáticamente** y verás:
   - ✅ **Admin API access token** (empieza con `shpat_...`) ← **ESTE es el que necesitas**
   - ❌ **API secret key** (empieza con `shpss_...`) ← NO uses este

5. **Copiar el token:**
   - Haz clic en el ícono de "copiar" o "mostrar" junto al access token
   - Si dice "Reveal token", haz clic y copia el valor que empieza con `shpat_`

#### ⚠️ MUY IMPORTANTE:
   - El token que necesitas **empieza con `shpat_`**
   - **NO uses** el que empieza con `shpss_` (ese es el secret, no el access token)
   - Copia el token inmediatamente y guárdalo en un lugar seguro
   - NO podrás volver a verlo después (tendrás que regenerarlo)

4. **Anota también:**
   - **Shop URL**: Tu dominio de Shopify (ejemplo: `mi-nueva-tienda.myshopify.com`)
   - **API Version**: Mantén la versión actual (en el código está configurado `2025-10`)

### 🆘 Solución de Problemas - Obtener Access Token

**Problema**: "No veo dónde obtener el access token"

**Solución paso a paso:**

1. **Ve a tu Custom App** (la que creaste: "Sistema de Guías")

2. **Busca estas pestañas en este orden:**
   - Primera pestaña: **"Overview"** (resumen)
   - Segunda pestaña: **"Configuration"** (configuración de permisos)
   - Tercera pestaña: **"API credentials"** ← **Entra aquí**

3. **En la página de "API credentials" deberías ver:**

   ```
   ┌─────────────────────────────────────────┐
   │ API credentials                          │
   ├─────────────────────────────────────────┤
   │                                          │
   │ Admin API access token                   │
   │ shpat_xxxxxxxxxxxxxxxxxxxxxxxx  [Copy]   │
   │                                          │
   │ API secret key                           │
   │ shpss_xxxxxxxxxxxxxxxxxxxxxxxx  [Copy]   │
   │                                          │
   └─────────────────────────────────────────┘
   ```

4. **Copia SOLO el que empieza con `shpat_`** (Admin API access token)

**Si aún no lo ves:**

- Verifica que hayas guardado la configuración en la pestaña "Configuration"
- Verifica que hayas dado permisos (read_orders, read_customers)
- Puede que necesites hacer clic en un botón que diga "Install app" o "Activate" primero
- Intenta refrescar la página (F5)

**Si perdiste el token o no lo copiaste:**

1. Ve a la pestaña "API credentials"
2. Busca un botón que diga "Regenerate token" o "Create new token"
3. Confirma la regeneración
4. Copia el nuevo token inmediatamente

---

## 🗄️ PASO 2: Configurar Base de Datos Supabase

### Opción A: Usar la misma base de datos existente

Si quieres que ambas tiendas Shopify usen la misma base de datos de guías:
- ✅ No necesitas hacer nada adicional
- ✅ Las guías de ambas tiendas estarán en el mismo sistema
- ✅ Usa las mismas credenciales de Supabase existentes

### Opción B: Crear una nueva base de datos Supabase (independiente)

Si quieres una base de datos separada para esta nueva tienda:

1. **Accede a [Supabase](https://supabase.com/)** y crea un nuevo proyecto

2. **Crea las tablas necesarias:**
   - Ejecuta el archivo `export-schema.sql` que está en la raíz del proyecto
   - Ve a SQL Editor en Supabase y pega el contenido completo

3. **Configura autenticación:**
   - Ve a Authentication → Settings
   - Configura las opciones según necesites

4. **Obtén las credenciales:**
   - Ve a Project Settings → API
   - Copia:
     - `Project URL` → será tu `NEXT_PUBLIC_SUPABASE_URL`
     - `anon public` key → será tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 📝 PASO 3: Configurar Variables de Entorno

### 3.1 Crear archivo `.env.local`

En la raíz del proyecto, crea un archivo llamado `.env.local` con el siguiente contenido:

```env
# Configuración de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui

# Configuración de Shopify - NUEVA TIENDA
NEXT_PUBLIC_SHOPIFY_SHOP_URL=tu-nueva-tienda.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3.2 Reemplazar valores

**Reemplaza con tus datos:**

1. **NEXT_PUBLIC_SUPABASE_URL**: 
   - URL de tu proyecto Supabase
   - Formato: `https://xxxxxxxxxxxxx.supabase.co`

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**: 
   - La clave pública (anon key) de Supabase
   - Es una cadena larga que empieza con `eyJ...`

3. **NEXT_PUBLIC_SHOPIFY_SHOP_URL**: 
   - El dominio de tu nueva tienda Shopify
   - Ejemplo: `mi-nueva-tienda.myshopify.com`
   - ⚠️ **Sin** `https://` al inicio

4. **SHOPIFY_ACCESS_TOKEN**: 
   - El token que copiaste en el Paso 1.3
   - Empieza con `shpat_`

### 3.3 Verificar el archivo

⚠️ **IMPORTANTE**: 
- El archivo `.env.local` **NO debe subirse a Git** (ya está en `.gitignore`)
- Es un archivo secreto y sensible
- Cada desarrollador o servidor debe tener su propia copia

---

## 🚀 PASO 4: Instalar Dependencias

Abre una terminal en la raíz del proyecto y ejecuta:

```bash
npm install
```

Esto instalará todas las dependencias necesarias:
- Next.js
- Supabase client
- Shopify API
- jsPDF (para generar PDFs)
- Y más...

---

## 🧪 PASO 5: Probar en Desarrollo

### 5.1 Iniciar servidor de desarrollo

```bash
npm run dev
```

El servidor debería iniciar en `http://localhost:3000`

### 5.2 Verificar la conexión

1. **Abre tu navegador** en `http://localhost:3000`

2. **Inicia sesión** con tus credenciales de Supabase

3. **Prueba importar una orden:**
   - Ve a la sección de "Crear Guía"
   - Haz clic en "Importar desde Shopify"
   - Ingresa un número de orden de la nueva tienda Shopify
   - Selecciona un motorizado
   - Haz clic en "Importar"

### 5.3 Solución de problemas comunes

**Error: "Orden no encontrada"**
- ✅ Verifica que el número de orden exista en Shopify
- ✅ Verifica que el token de acceso sea correcto
- ✅ Verifica que la URL de la tienda sea correcta

**Error: "CORS" o "Network Error"**
- ✅ Verifica que el token de acceso tenga los permisos necesarios
- ✅ Verifica que la app esté instalada en Shopify

**Error de conexión a Supabase**
- ✅ Verifica las credenciales de Supabase
- ✅ Verifica que la base de datos tenga las tablas creadas

---

## 🌐 PASO 6: Desplegar a Producción

### Opción A: Vercel (Recomendado)

1. **Sube tu código a GitHub** (si no lo has hecho)

2. **Ve a [Vercel](https://vercel.com/)** e inicia sesión

3. **Importa tu repositorio:**
   - Clic en "New Project"
   - Selecciona tu repositorio
   - Vercel detectará automáticamente que es Next.js

4. **Configurar variables de entorno:**
   - Antes de hacer deploy, agrega las variables de entorno:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_SHOPIFY_SHOP_URL`
     - `SHOPIFY_ACCESS_TOKEN`
   - ⚠️ **IMPORTANTE**: Copia los valores exactos de tu `.env.local`

5. **Deploy:**
   - Clic en "Deploy"
   - Espera a que termine (2-3 minutos)
   - Vercel te dará una URL: `https://tu-proyecto.vercel.app`

### Opción B: Otros servicios

También puedes usar:
- Netlify
- Railway
- DigitalOcean
- AWS, Azure, GCP

El proceso es similar: subir código y configurar variables de entorno.

---

## ✅ PASO 7: Verificación Final

### 7.1 Checklist de verificación

- [ ] El sitio web carga correctamente
- [ ] Puedes iniciar sesión
- [ ] Puedes ver el dashboard
- [ ] Puedes importar órdenes de Shopify
- [ ] Las guías se crean correctamente
- [ ] Los PDFs se generan correctamente
- [ ] Los motorizados pueden ver sus guías

### 7.2 Probar flujo completo

1. **Crear una orden de prueba en Shopify:**
   - Ve a Orders → Create order
   - Crea una orden de prueba

2. **Importar la orden al sistema:**
   - Ve al sistema de guías
   - Dashboard → Guías → Importar desde Shopify
   - Ingresa el número de orden
   - Asigna un motorizado
   - Importa

3. **Verificar que se creó la guía:**
   - Ve a la lista de guías
   - Busca la guía recién creada
   - Verifica que todos los datos sean correctos

4. **Generar PDF:**
   - Abre la guía
   - Haz clic en "Generar PDF"
   - Verifica que el PDF se descargue correctamente

---

## 🔐 Consideraciones de Seguridad

### Variables de entorno sensibles

⚠️ **NUNCA compartas o expongas:**
- `SHOPIFY_ACCESS_TOKEN` - Permite acceso completo a tu tienda
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Aunque es "pública", limita los permisos en Supabase
- Credenciales de base de datos

### Row Level Security (RLS) en Supabase

Si creaste una nueva base de datos, asegúrate de configurar RLS:

```sql
-- Ejemplo: Solo admins pueden crear usuarios
CREATE POLICY "Admins can create users" ON usuarios
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'administrador'
    )
  );
```

---

## 📱 PASO 8: Configuración Adicional (Opcional)

### 8.1 Dominio personalizado

Si tienes un dominio propio:
- En Vercel: Settings → Domains → Add Domain
- Sigue las instrucciones para configurar DNS

### 8.2 Webhooks de Shopify (Avanzado)

Si quieres que las órdenes se importen automáticamente:

1. **Crear webhook en Shopify:**
   - Settings → Notifications → Webhooks
   - Create webhook
   - Event: Order creation
   - URL: `https://tu-dominio.com/api/webhooks/shopify`
   - Format: JSON

2. **Crear endpoint en tu código:**
   - Crea `src/app/api/webhooks/shopify/route.ts`
   - Valida el webhook con HMAC
   - Procesa la orden automáticamente

---

## 🆘 Soporte y Problemas

### Logs útiles

**En desarrollo:**
```bash
# Ver logs en tiempo real
npm run dev
```

**En Vercel:**
- Ve a tu proyecto → Deployments → Clic en el deployment → Functions
- Ahí verás los logs de las funciones API

### Problemas comunes

| Problema | Solución |
|----------|----------|
| "No veo el access token en Shopify" | Ve a API credentials, busca el que empieza con `shpat_` (NO `shpss_`) |
| "Tengo shpss pero no shpat" | `shpss` es el secret (no lo necesitas). Busca "Admin API access token" |
| "Access Token inválido" | Regenera el token en Shopify y actualiza `.env.local` |
| "Error 401 Unauthorized" | El token es incorrecto, regenera uno nuevo en Shopify |
| "Supabase connection error" | Verifica URL y API Key de Supabase |
| "CORS error" | Verifica los permisos de la app en Shopify (read_orders, read_customers) |
| "Orden no encontrada" | Verifica que la orden exista y el número sea correcto |
| "App no instalada" | Ve a API credentials y busca botón "Install app" o similar |

---

## 📊 Diferencias entre Tiendas

Si tienes **múltiples tiendas** usando el **mismo sistema**:

### Identificación de guías

Las guías se identifican con un prefijo:
```
SH-[NUMERO_ORDEN_SHOPIFY]
```

Por ejemplo:
- Tienda 1: `SH-1001`, `SH-1002`, ...
- Tienda 2: `SH-2001`, `SH-2002`, ...

### Recomendación: Prefijo personalizado

Puedes modificar el prefijo para cada tienda editando:

```typescript:src/app/api/shopify/importar-orden/route.ts
// En la línea 23, cambia:
const numeroGuia = `SH-${orden.order_number}`

// Por ejemplo, para la nueva tienda:
const numeroGuia = `SH2-${orden.order_number}`
// o
const numeroGuia = `TIENDA2-${orden.order_number}`
```

---

## 🎉 ¡Listo!

Tu sistema de guías ahora está conectado a la nueva tienda Shopify. 

### Próximos pasos sugeridos:

1. ✅ Crear usuarios motorizados en el sistema
2. ✅ Configurar productos en el catálogo
3. ✅ Importar tus primeras órdenes
4. ✅ Capacitar al equipo en el uso del sistema
5. ✅ Configurar respaldos automáticos de Supabase

---

## 📝 Notas Importantes

- 🔄 Cada tienda Shopify puede tener su propio token de acceso
- 💾 Todas las tiendas pueden usar la misma base de datos Supabase
- 🚀 El mismo código funciona para múltiples tiendas, solo cambian las variables de entorno
- 🔐 Mantén los tokens seguros y no los compartas

---

¿Necesitas ayuda adicional? Revisa la documentación o contacta a soporte técnico.

