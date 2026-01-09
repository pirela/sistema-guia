# Sistema de Guías de Despacho

Sistema web para gestionar guías de despacho con roles de administrador y motorizado.

## Características

- 🔐 Autenticación con Supabase
- 👥 Gestión de usuarios (Administradores y Motorizados)
- 📋 Creación y seguimiento de guías de despacho
- 📦 Catálogo de productos
- 📊 Reportes y estadísticas
- 🔄 Historial automático de cambios de estado
- 📱 Diseño responsive con Tailwind CSS

## Tecnologías

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)

## Instalación

1. Clonar el repositorio
2. Instalar dependencias: `npm install`
3. Configurar variables de entorno en `.env.local`
4. Ejecutar: `npm run dev`

## Variables de Entorno

Ver archivo `env.example.txt` para configuración completa.

```env
NEXT_PUBLIC_SUPABASE_URL=tu-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key
NEXT_PUBLIC_SHOPIFY_SHOP_URL=tu-tienda.myshopify.com
SHOPIFY_ACCESS_TOKEN=tu-token
```

## 📚 Documentación

### Integración con Shopify

- **[Guía Completa de Instalación en Nueva Tienda Shopify](GUIA-INSTALACION-NUEVA-SHOPIFY.md)** - Guía detallada paso a paso
- **[Checklist de Instalación Rápida](CHECKLIST-INSTALACION-SHOPIFY.md)** - Lista verificable para instalación en ~30 minutos
- **[🔧 Solución: No encuentro el Access Token](TROUBLESHOOTING-ACCESS-TOKEN-SHOPIFY.md)** - Guía específica para obtener el access token
- **[Archivo de Ejemplo de Variables](env.example.txt)** - Template para configurar `.env.local`

### Base de Datos

- **[Contexto de Base de Datos](CONTEXTO-BASE-DATOS.md)** - Estructura completa de la base de datos
- **[Guía de Exportación Supabase](GUIA-EXPORTAR-SUPABASE.md)** - Cómo exportar/importar la base de datos
- **[Plan Estado Novedad](PLAN-IMPLEMENTAR-ESTADO-NOVEDAD.md)** - Implementación del estado de novedad

## 🚀 Despliegue

Este proyecto puede desplegarse en:
- **Vercel** (Recomendado)
- **Netlify**
- **Railway**
- **Cualquier plataforma que soporte Next.js**

Ver [guía de instalación](GUIA-INSTALACION-NUEVA-SHOPIFY.md#paso-6-desplegar-a-producción) para instrucciones detalladas