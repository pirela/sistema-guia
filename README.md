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

```env
NEXT_PUBLIC_SUPABASE_URL=tu-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key