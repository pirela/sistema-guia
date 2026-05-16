import { supabase } from '@/lib/supabase'
import type { EstadoGuia } from '@/types/database'

export type ResultadoValidacionStock =
  | { ok: true }
  | { ok: false; faltantes: string[] }

export async function validarStockEntrega(
  motorizadoId: string,
  guiaIds: string[]
): Promise<ResultadoValidacionStock> {
  if (guiaIds.length === 0) return { ok: true }

  const { data: lineasValidar, error: errLineas } = await supabase
    .from('guias_productos')
    .select('producto_id, cantidad')
    .in('guia_id', guiaIds)

  if (errLineas) {
    return { ok: false, faltantes: ['Error al leer productos de las guías: ' + errLineas.message] }
  }

  const necesidadPorProducto: Record<string, number> = {}
  for (const linea of lineasValidar ?? []) {
    necesidadPorProducto[linea.producto_id] =
      (necesidadPorProducto[linea.producto_id] ?? 0) + linea.cantidad
  }

  const productoIds = Object.keys(necesidadPorProducto)
  if (productoIds.length === 0) return { ok: true }

  const { data: inventarioRows, error: errInv } = await supabase
    .from('inventario_motorizado')
    .select('producto_id, cantidad')
    .eq('motorizado_id', motorizadoId)

  if (errInv) {
    return { ok: false, faltantes: ['Error al leer inventario: ' + errInv.message] }
  }

  const stockMap: Record<string, number> = {}
  for (const row of inventarioRows ?? []) {
    stockMap[row.producto_id] = row.cantidad
  }

  const faltantes: string[] = []
  for (const [productoId, necesito] of Object.entries(necesidadPorProducto)) {
    const tiene = stockMap[productoId] ?? 0
    if (tiene < necesito) {
      faltantes.push(`Producto ${productoId} (necesita ${necesito}, tiene ${tiene})`)
    }
  }

  if (faltantes.length > 0) return { ok: false, faltantes }
  return { ok: true }
}

export async function revertirGuiaEntrega(
  guiaId: string,
  estadoAnterior: EstadoGuia | null,
  fechaEntregaAnterior: string | null
): Promise<void> {
  if (!estadoAnterior) return
  await supabase
    .from('guias')
    .update({ estado: estadoAnterior, fecha_entrega: fechaEntregaAnterior })
    .eq('id', guiaId)
}

export async function descontarInventarioEntrega(
  motorizadoId: string,
  guiaId: string,
  usuarioId: string,
  estadoAnterior: EstadoGuia | null,
  fechaEntregaAnterior: string | null
): Promise<void> {
  const { data: lineas, error: errLineas } = await supabase
    .from('guias_productos')
    .select('producto_id, cantidad')
    .eq('guia_id', guiaId)

  if (errLineas) {
    await revertirGuiaEntrega(guiaId, estadoAnterior, fechaEntregaAnterior)
    throw new Error('No se pudo leer productos de la guía. ' + errLineas.message)
  }

  const lineasEntregada = lineas ?? []

  for (const linea of lineasEntregada) {
    const { data: fila, error: errStock } = await supabase
      .from('inventario_motorizado')
      .select('cantidad')
      .eq('motorizado_id', motorizadoId)
      .eq('producto_id', linea.producto_id)
      .maybeSingle()

    if (errStock) {
      await revertirGuiaEntrega(guiaId, estadoAnterior, fechaEntregaAnterior)
      throw new Error('No se pudo leer el inventario. ' + errStock.message)
    }

    const actual = fila?.cantidad ?? 0
    const nueva = actual - linea.cantidad

    if (nueva <= 0) {
      const { error: errDel } = await supabase
        .from('inventario_motorizado')
        .delete()
        .eq('motorizado_id', motorizadoId)
        .eq('producto_id', linea.producto_id)
      if (errDel) {
        await revertirGuiaEntrega(guiaId, estadoAnterior, fechaEntregaAnterior)
        throw new Error('No se pudo restar inventario (borrar). ' + errDel.message)
      }
    } else {
      const { error: errUpd } = await supabase
        .from('inventario_motorizado')
        .update({
          cantidad: nueva,
          fecha_actualizacion: new Date().toISOString(),
        })
        .eq('motorizado_id', motorizadoId)
        .eq('producto_id', linea.producto_id)
      if (errUpd) {
        await revertirGuiaEntrega(guiaId, estadoAnterior, fechaEntregaAnterior)
        throw new Error('No se pudo restar inventario (actualizar). ' + errUpd.message)
      }
    }

    const { error: errMov } = await supabase.from('movimientos_inventario').insert({
      motorizado_id: motorizadoId,
      producto_id: linea.producto_id,
      tipo: 'salida_entrega',
      cantidad: linea.cantidad,
      guia_id: guiaId,
      usuario_id: usuarioId,
    })
    if (errMov) {
      await revertirGuiaEntrega(guiaId, estadoAnterior, fechaEntregaAnterior)
      throw new Error('No se pudo registrar movimiento. ' + errMov.message)
    }
  }
}

export function mensajeStockInsuficiente(faltantes: string[]): string {
  return (
    'No se puede marcar como entregada: no tienes stock suficiente.\n\n' + faltantes.join('\n')
  )
}
