# 🔧 Solución: No encuentro el Access Token de Shopify

## 🎯 El Problema

Estás intentando configurar la integración con Shopify pero:
- ❌ No ves dónde está el "Access Token"
- ❌ Solo encuentras un "secret" que empieza con `shpss_`
- ❌ La interfaz de Shopify se ve diferente a las guías antiguas

## ✅ La Solución

### Paso 1: Identifica qué credencial necesitas

Hay **DOS tipos de credenciales** en Shopify:

| Credencial | Comienza con | ¿La necesitas? | Para qué sirve |
|-----------|--------------|----------------|----------------|
| **Admin API access token** | `shpat_` | ✅ **SÍ** | Conectar tu app con Shopify |
| **API secret key** | `shpss_` | ❌ **NO** | Validar webhooks (avanzado) |

⚠️ **TU PROBLEMA**: Tienes `shpss_` pero necesitas `shpat_`

---

### Paso 2: Ve a la página correcta

1. **Accede a tu tienda Shopify:**
   ```
   https://TU-TIENDA.myshopify.com/admin
   ```

2. **Ve a Settings** (Configuración) → Abajo a la izquierda

3. **Busca "Apps and sales channels"** → Clic

4. **Clic en "Develop apps"** → En la esquina superior derecha

5. **Selecciona tu app** (ejemplo: "Sistema de Guías")

---

### Paso 3: Encuentra el Access Token

Una vez dentro de tu app, verás varias pestañas en la parte superior:

```
┌──────────────────────────────────────────────────────────┐
│  [Overview]  [Configuration]  [API credentials]           │
└──────────────────────────────────────────────────────────┘
```

**Haz clic en la pestaña "API credentials"** (la tercera)

---

### Paso 4: Localiza el token correcto

En la página de "API credentials" verás algo similar a esto:

```
╔════════════════════════════════════════════════════════╗
║  API credentials                                        ║
╠════════════════════════════════════════════════════════╣
║                                                         ║
║  📝 Admin API                                           ║
║  ────────────────────────────────────────────          ║
║                                                         ║
║  Admin API access token                                 ║
║  shpat_abc123def456...                    [📋 Copy]     ║
║  ✅ ESTE ES EL QUE NECESITAS                            ║
║                                                         ║
║  ────────────────────────────────────────────          ║
║                                                         ║
║  API secret key                                         ║
║  shpss_xyz789mno012...                    [📋 Copy]     ║
║  ❌ Este NO lo necesitas para este sistema              ║
║                                                         ║
╚════════════════════════════════════════════════════════╝
```

**Copia el que dice "Admin API access token"** y empieza con `shpat_`

---

## 🆘 Casos Especiales

### Caso 1: "No veo ningún token, está vacío"

**Causa**: La app aún no está instalada o no tiene permisos configurados.

**Solución**:

1. Ve a la pestaña **"Configuration"**

2. Verifica que hayas configurado estos permisos:
   - ✅ `read_orders`
   - ✅ `read_customers`

3. Si no están configurados:
   - Clic en **"Configure"** en "Admin API integration"
   - Selecciona los permisos mencionados
   - Clic en **"Save"**

4. Regresa a **"API credentials"**

5. Busca un botón que diga **"Install app"** o **"Create token"**

6. Haz clic y el token se generará automáticamente

---

### Caso 2: "Veo 'Reveal token once' pero ya hice clic y no lo copié"

**Causa**: El token se muestra solo una vez por seguridad.

**Solución**:

1. En la página de "API credentials"

2. Busca un botón que diga:
   - **"Regenerate token"** o
   - **"Create new token"** o
   - **"Revoke and regenerate"**

3. Haz clic y confirma

4. Se generará un **nuevo token**

5. **Cópialo INMEDIATAMENTE** (no podrás verlo de nuevo)

⚠️ **Importante**: Si regeneras el token, el anterior dejará de funcionar. Si ya lo estabas usando en otro lugar, tendrás que actualizarlo allí también.

---

### Caso 3: "Solo veo un 'API key' y 'API secret'"

**Causa**: Estás viendo las credenciales de una **API privada antigua** (deprecada desde 2022).

**Solución**:

1. **NO uses** esas credenciales antiguas

2. Necesitas crear una **Custom App** nueva:
   - Ve a: Settings → Apps and sales channels
   - Clic en **"Develop apps"**
   - Clic en **"Create an app"**
   - Dale un nombre: "Sistema de Guías"
   - Configura permisos y genera el token

3. Sigue la guía desde el principio: `GUIA-INSTALACION-NUEVA-SHOPIFY.md`

---

### Caso 4: "La interfaz se ve completamente diferente"

**Causa**: Shopify actualiza su interfaz frecuentemente.

**Solución - Búsqueda alternativa**:

1. En tu admin de Shopify, usa el **buscador** (generalmente arriba)

2. Busca: `"apps"` o `"custom apps"`

3. Debería aparecer "Develop apps" o "App development"

4. Clic ahí y sigue las instrucciones desde el Paso 3

**O usa la URL directa**:
```
https://TU-TIENDA.myshopify.com/admin/settings/apps/development
```

---

## 📋 Checklist Final

Antes de continuar, verifica que tienes:

- [ ] Un token que **empieza con `shpat_`**
- [ ] El token tiene aproximadamente **40-50 caracteres** después de `shpat_`
- [ ] Lo has **copiado y guardado** en un lugar seguro
- [ ] Sabes tu **URL de la tienda**: `TU-TIENDA.myshopify.com`

---

## 🔧 Configuración en el Sistema

Una vez que tengas el token correcto:

1. **Abre el archivo `.env.local`** en la raíz de tu proyecto

2. **Agrega estas líneas** (reemplaza con tus datos):

```env
# URL de tu tienda (SIN https://)
NEXT_PUBLIC_SHOPIFY_SHOP_URL=tu-tienda.myshopify.com

# El token que copiaste (empieza con shpat_)
SHOPIFY_ACCESS_TOKEN=shpat_abc123def456ghi789...
```

3. **Guarda el archivo**

4. **Reinicia el servidor** de desarrollo:
   ```bash
   # Detén el servidor (Ctrl+C)
   # Inícialo de nuevo:
   npm run dev
   ```

---

## 🧪 Probar que Funciona

Para verificar que el token es correcto:

1. **Abre el navegador** en `http://localhost:3000`

2. **Inicia sesión** en el sistema

3. **Ve a crear una guía** → Importar desde Shopify

4. **Ingresa un número de orden** que exista en tu tienda

5. **Si funciona**: ✅ El token es correcto

6. **Si da error**: 
   - Error 401: Token inválido → Regenera el token
   - Error 403: Faltan permisos → Verifica los scopes
   - Error 404: Orden no existe → Prueba con otra orden

---

## 📞 Aún Necesitas Ayuda?

### Información útil para solicitar ayuda:

Cuando pidas ayuda, proporciona:

1. **Qué ves en la pantalla**:
   - ¿Ves algún token?
   - ¿Qué botones ves?
   - ¿Con qué prefijo comienza lo que ves? (`shpat_`, `shpss_`, otro)

2. **Qué error te sale** (si probaste el sistema):
   - Error exacto
   - Código de error (401, 403, 404, etc.)

3. **Tu versión de Shopify**:
   - ¿Plan que tienes? (Basic, Shopify, Advanced, Plus)
   - ¿En qué país está registrada tu tienda?

---

## ✅ Resumen Ultra-Rápido

```bash
1. Ve a: https://TU-TIENDA.myshopify.com/admin/settings/apps
2. Clic en: "Develop apps"
3. Selecciona: Tu app ("Sistema de Guías")
4. Pestaña: "API credentials"
5. Copia: El que empieza con "shpat_"
6. NO uses: El que empieza con "shpss_"
7. Pega en: .env.local → SHOPIFY_ACCESS_TOKEN=shpat_...
```

---

## 🎉 ¡Listo!

Una vez que tengas el token correcto (`shpat_`), continúa con el resto de la instalación en:
- **GUIA-INSTALACION-NUEVA-SHOPIFY.md** (Paso 2 en adelante)

---

**Última actualización**: Enero 2025 - Compatible con la nueva interfaz de Shopify 2025




