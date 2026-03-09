import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const motorizadoId = searchParams.get('motorizado_id')

    if (!motorizadoId) {
      return NextResponse.json(
        { error: 'Falta motorizado_id' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
      .from('inventario_motorizado')
      .select(`
        motorizado_id,
        producto_id,
        cantidad,
        fecha_actualizacion,
        producto:productos(id, nombre, codigo_sku)
      `)
      .eq('motorizado_id', motorizadoId)
      .order('cantidad', { ascending: false })

    if (error) {
      console.error('Error al obtener inventario:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('Error en GET /api/inventario:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
