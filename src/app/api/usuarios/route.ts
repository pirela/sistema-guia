import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rol = searchParams.get('rol')

    let query = supabase
      .from('usuarios')
      .select('*')
      .eq('eliminado', false)
      .eq('activo', true)
      .order('nombre')

    if (rol) {
      query = query.eq('rol', rol)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error al obtener usuarios:', error)
      return NextResponse.json(
        { error: 'Error al obtener usuarios' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error en GET /api/usuarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}