import { NextRequest, NextResponse } from 'next/server'
import { obtenerOrdenShopify } from '@/lib/shopify-client'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { orderNumber, userId } = await request.json()

    if (!orderNumber) {
      return NextResponse.json({ error: 'Número de orden requerido' }, { status: 400 })
    }

    const orden = await obtenerOrdenShopify(orderNumber)

    if (!orden) {
      return NextResponse.json({ error: 'Orden no encontrada en Shopify' }, { status: 404 })
    }

    const numeroGuia = `SH-${orden.order_number}`

    const { data: guiaExistente } = await supabase
      .from('guias')
      .select('id, numero_guia')
      .eq('numero_guia', numeroGuia)
      .single()

    if (guiaExistente) {
      return NextResponse.json({ 
        error: 'Esta orden ya fue importada',
        guiaId: guiaExistente.id,
        numeroGuia: guiaExistente.numero_guia
      }, { status: 409 })
    }

    const { data: motorizadoDefault } = await supabase
      .from('usuarios')
      .select('id')
      .eq('rol', 'motorizado')
      .eq('activo', true)
      .eq('eliminado', false)
      .limit(1)
      .single()

    if (!motorizadoDefault) {
      return NextResponse.json({ 
        error: 'No hay motorizados disponibles. Crea al menos un motorizado antes de importar órdenes.' 
      }, { status: 400 })
    }

    const getNoteAttribute = (attributes: any[], name: string): string => {
      const attr = attributes?.find((a: any) => a.name === name)
      return attr?.value || ''
    }

    const nombreCliente = getNoteAttribute(orden.note_attributes, 'Nombre y Apellido') || 
                          (orden.customer?.first_name && orden.customer?.last_name 
                            ? `${orden.customer.first_name} ${orden.customer.last_name}` 
                            : 'Cliente sin nombre')

    const telefono = getNoteAttribute(orden.note_attributes, 'Teléfono de Contacto (Celular)') || 
                     orden.customer?.phone || 
                     'N/A'

    const departamento = getNoteAttribute(orden.note_attributes, 'Departamento')
    const ciudad = getNoteAttribute(orden.note_attributes, 'Ciudad')
    const direccionCompleta = getNoteAttribute(orden.note_attributes, 'Dirección completa')
    const barrio = getNoteAttribute(orden.note_attributes, 'Bario')
    const complemento = getNoteAttribute(orden.note_attributes, 'Casa, torre Apartamento, piso, #local')

    let direccion = ''
    if (direccionCompleta) {
      direccion = direccionCompleta
      if (barrio) direccion += `, ${barrio}`
      if (complemento) direccion += `, ${complemento}`
      if (ciudad) direccion += `, ${ciudad}`
      if (departamento) direccion += `, ${departamento}`
    } else if (orden.shipping_address) {
      direccion = `${orden.shipping_address.address1 || ''}${orden.shipping_address.address2 ? ' ' + orden.shipping_address.address2 : ''}, ${orden.shipping_address.city || ''}, ${orden.shipping_address.province || ''}`
    } else {
      direccion = 'Dirección no disponible'
    }

    const correo = getNoteAttribute(orden.note_attributes, 'Correo') || orden.customer?.email || ''
    
    const { data: guia, error: guiaError } = await supabase
      .from('guias')
      .insert({
        numero_guia: numeroGuia,
        nombre_cliente: nombreCliente,
        telefono_cliente: telefono,
        direccion: direccion,
        monto_recaudar: parseFloat(orden.current_total_price),
        estado: 'asignada',
        motorizado_asignado: motorizadoDefault.id,
        //observacion: `Pedido Shopify ${orden.name}${correo ? ` - Email: ${correo}` : ''}${orden.note ? ` - Nota: ${orden.note}` : ''}`,
        creado_por: userId,
        eliminado: false
      })
      .select()
      .single()

    if (guiaError) throw guiaError

    for (const item of orden.line_items) {
      let producto = await buscarOCrearProducto(item)

      await supabase
        .from('guias_productos')
        .insert({
          guia_id: guia.id,
          producto_id: producto.id,
          cantidad: item.quantity
        })
    }

    return NextResponse.json({ 
      success: true, 
      guia: guia,
      mensaje: 'Orden importada exitosamente'
    })
  } catch (error) {
    console.error('Error importando orden:', error)
    return NextResponse.json({ error: 'Error al importar orden' }, { status: 500 })
  }
}

async function buscarOCrearProducto(item: any) {
  const sku = item.sku || `SHOPIFY-${item.id}`
  
  const { data: productoExistente } = await supabase
    .from('productos')
    .select('*')
    .eq('codigo_sku', sku)
    .single()

  if (productoExistente) {
    return productoExistente
  }

  const { data: nuevoProducto, error } = await supabase
    .from('productos')
    .insert({
      codigo_sku: sku,
      nombre: item.title,
      precio: parseFloat(item.price),
      activo: true,
      eliminado: false
    })
    .select()
    .single()

  if (error) throw error
  return nuevoProducto
}