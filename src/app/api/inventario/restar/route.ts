import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { motorizado_id, producto_id, cantidad, comentario, usuario_id } = body as {
      motorizado_id?: string
      producto_id?: string
      cantidad?: number
      comentario?: string
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

    const { data: fila, error: errSelect } = await supabase
      .from('inventario_motorizado')
      .select('cantidad')
      .eq('motorizado_id', motorizado_id)
      .eq('producto_id', producto_id)
      .maybeSingle()

    if (errSelect) {
      console.error('Error al leer inventario:', errSelect)
      return NextResponse.json({ error: errSelect.message }, { status: 500 })
    }

    const actual = fila?.cantidad ?? 0
    if (actual < cantidad) {
      return NextResponse.json(
        {
          error: `Stock insuficiente: tiene ${actual}, intenta restar ${cantidad}`,
        },
        { status: 400 }
      )
    }

    const nuevaCantidad = actual - cantidad

    if (nuevaCantidad === 0) {
      const { error } = await supabase
        .from('inventario_motorizado')
        .delete()
        .eq('motorizado_id', motorizado_id)
        .eq('producto_id', producto_id)

      if (error) {
        console.error('Error al eliminar fila inventario:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    } else {
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
    }

    if (usuario_id) {
      await supabase.from('movimientos_inventario').insert({
        motorizado_id,
        producto_id,
        tipo: 'salida_manual',
        cantidad,
        comentario: comentario ?? null,
        usuario_id,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error en POST /api/inventario/restar:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
