import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { motorizado_id, producto_id, cantidad, usuario_id } = body as {
      motorizado_id?: string
      producto_id?: string
      cantidad?: number
      usuario_id?: string
    }

    if (!motorizado_id || !producto_id || cantidad == null || cantidad < 1) {
      return NextResponse.json(
        { error: 'Faltan motorizado_id, producto_id o cantidad (entero positivo)' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: existente } = await supabase
      .from('inventario_motorizado')
      .select('cantidad')
      .eq('motorizado_id', motorizado_id)
      .eq('producto_id', producto_id)
      .maybeSingle()

    if (existente) {
      const nuevaCantidad = existente.cantidad + cantidad
      const { error } = await supabase
        .from('inventario_motorizado')
        .update({
          cantidad: nuevaCantidad,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('motorizado_id', motorizado_id)
        .eq('producto_id', producto_id)

      if (error) {
        console.error('Error al actualizar inventario:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
      const { error } = await supabase.from('inventario_motorizado').insert({
        motorizado_id,
        producto_id,
        cantidad,
      })

      if (error) {
        console.error('Error al insertar inventario:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    if (usuario_id) {
      await supabase.from('movimientos_inventario').insert({
        motorizado_id,
        producto_id,
        tipo: 'entrada',
        cantidad,
        usuario_id,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en POST /api/inventario/cargar:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
