import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Manejar la ruta raíz: siempre redirigir al login
  if (req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Solo proteger /dashboard si NO hay sesión
  // NO redirigir automáticamente de /auth/login a /dashboard
  // Dejar que el cliente (useAuth) valide completamente al usuario
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Permitir acceso a /auth/login siempre, sin importar si hay sesión
  // El cliente manejará la validación y redirección si es necesario
  return res
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/auth/login'],
}