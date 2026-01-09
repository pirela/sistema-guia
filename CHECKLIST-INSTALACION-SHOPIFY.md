# ✅ Checklist de Instalación Rápida - Nueva Tienda Shopify

## 🎯 Resumen Ejecutivo

Este checklist te guiará en ~30 minutos para instalar el sistema en una nueva tienda Shopify.

---

## 📋 Pre-instalación (5 min)

- [ ] Tienes acceso de administrador a la nueva tienda Shopify
- [ ] Tienes las credenciales de Supabase a mano (o sabes si vas a crear una nueva BD)
- [ ] Node.js está instalado en tu máquina (`node --version`)
- [ ] El código del proyecto está clonado/descargado

---

## 🛒 Configuración Shopify (10 min)

### Crear App Custom

- [ ] Ir a: `https://tu-tienda.myshopify.com/admin/settings/apps`
- [ ] Clic en "Develop apps" → "Create an app"
- [ ] Nombre: `Sistema de Guías`

### Configurar Permisos

- [ ] Pestaña "Configuration" → "Configure"
- [ ] Activar: `read_orders` ✅
- [ ] Activar: `read_customers` ✅
- [ ] Guardar cambios

### Obtener Credenciales

- [ ] Pestaña "API credentials"
- [ ] Buscar "Admin API access token" (empieza con `shpat_`)
- [ ] ⚠️ **NO confundir** con "API secret key" (empieza con `shpss_`)
- [ ] Clic en "Install app" (si aparece) o "Create token"
- [ ] **Copiar el token** → `shpat_...` (¡Guárdalo bien!)
- [ ] **Copiar la URL** → `tu-tienda.myshopify.com`

💡 **¿No encuentras el token?** Ver: `TROUBLESHOOTING-ACCESS-TOKEN-SHOPIFY.md`

---

## 🗄️ Base de Datos (5 min)

### Opción A: Misma base de datos
- [ ] Usar credenciales existentes de Supabase
- [ ] Copiar `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copiar `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Opción B: Nueva base de datos
- [ ] Crear nuevo proyecto en Supabase
- [ ] Ejecutar `export-schema.sql` en SQL Editor
- [ ] Copiar `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copiar `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## ⚙️ Configuración Local (3 min)

### Crear .env.local

- [ ] Crear archivo `.env.local` en la raíz del proyecto
- [ ] Pegar estas variables (con tus valores):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SHOPIFY_SHOP_URL=tu-tienda.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
```

### Instalar Dependencias

- [ ] Abrir terminal en la raíz del proyecto
- [ ] Ejecutar: `npm install`
- [ ] Esperar a que termine (~2 min)

---

## 🧪 Prueba Local (5 min)

### Iniciar Desarrollo

- [ ] Ejecutar: `npm run dev`
- [ ] Abrir: `http://localhost:3000`
- [ ] Verificar que carga el sitio

### Prueba de Importación

- [ ] Iniciar sesión en el sistema
- [ ] Ir a: Dashboard → Guías → Crear
- [ ] Clic en "Importar desde Shopify"
- [ ] Ingresar un número de orden de prueba
- [ ] Seleccionar motorizado
- [ ] Clic en "Importar"
- [ ] ✅ Verificar que la guía se creó correctamente

---

## 🚀 Deploy a Producción (10 min)

### Preparar Deploy

- [ ] Código subido a GitHub (si aplica)
- [ ] Crear cuenta en Vercel (o usar existente)

### Configurar en Vercel

- [ ] Ir a: `https://vercel.com/new`
- [ ] Importar repositorio
- [ ] Agregar variables de entorno:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `NEXT_PUBLIC_SHOPIFY_SHOP_URL`
  - [ ] `SHOPIFY_ACCESS_TOKEN`
- [ ] Clic en "Deploy"
- [ ] Esperar 2-3 minutos
- [ ] ✅ Anotar URL de producción

---

## ✅ Verificación Final (5 min)

### Prueba en Producción

- [ ] Abrir URL de Vercel
- [ ] Iniciar sesión
- [ ] Importar una orden de prueba
- [ ] Verificar que la guía se creó
- [ ] Generar PDF de la guía
- [ ] Verificar que el PDF se descarga correctamente

### Post-instalación

- [ ] Crear usuarios motorizados (si es necesario)
- [ ] Probar con orden real
- [ ] Capacitar al equipo
- [ ] Documentar credenciales en lugar seguro

---

## 🎉 ¡Instalación Completa!

### Información a guardar

```
📌 DATOS DE LA INSTALACIÓN

Tienda Shopify: _____________________.myshopify.com
Token Shopify: shpat_________________
URL Producción: https://________________.vercel.app
Supabase Project: _____________________
Fecha Instalación: ___/___/______
Instalado por: _____________________
```

---

## 🆘 Problemas Comunes

| Si ves este error | Solución |
|-------------------|----------|
| "Access Token inválido" | Regenerar token en Shopify |
| "Orden no encontrada" | Verificar número de orden y que exista |
| "Supabase error" | Verificar credenciales de Supabase |
| No carga localhost | Verificar que el puerto 3000 esté libre |
| Error al importar | Verificar permisos de la app en Shopify |

---

## 📞 Contacto de Soporte

Si necesitas ayuda:
1. Revisa la guía completa: `GUIA-INSTALACION-NUEVA-SHOPIFY.md`
2. Revisa los logs de Vercel
3. Verifica las variables de entorno

---

**Tiempo total estimado: ~30-40 minutos**

¡Éxito con tu instalación! 🚀

