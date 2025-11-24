import { NextRequest, NextResponse } from 'next/server'
import { obtenerOrdenShopify } from '@/lib/shopify-client'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { orderNumber, userId, motorizadoId, observacion } = await request.json()

    if (!orderNumber) {
      return NextResponse.json({ error: 'Número de orden requerido' }, { status: 400 })
    }

    if (!motorizadoId) {
      return NextResponse.json({ error: 'Motorizado requerido' }, { status: 400 })
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

    // Verificar que el motorizado existe y está activo
    const { data: motorizado, error: motorizadoError } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('id', motorizadoId)
      .eq('rol', 'motorizado')
      .eq('activo', true)
      .eq('eliminado', false)
      .single()

    if (motorizadoError || !motorizado) {
      return NextResponse.json({ 
        error: 'Motorizado no válido o no está disponible' 
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
    
    // Construir observación combinando la del usuario con info de Shopify
    let observacionFinal = observacion?.trim() || ''
    const infoShopify = []
    if (orden.note) infoShopify.push(`Nota: ${orden.note}`)
    if (correo) infoShopify.push(`Email: ${correo}`)
    
    if (infoShopify.length > 0) {
      const infoText = `Pedido Shopify ${orden.name} - ${infoShopify.join(' | ')}`
      observacionFinal = observacionFinal 
        ? `${observacionFinal}\n${infoText}`
        : infoText
    }

    const { data: guia, error: guiaError } = await supabase
      .from('guias')
      .insert({
        numero_guia: numeroGuia,
        nombre_cliente: nombreCliente,
        telefono_cliente: telefono,
        direccion: direccion,
        monto_recaudar: parseFloat(orden.current_total_price),
        estado: 'asignada',
        motorizado_asignado: motorizado.id,
        observacion: observacionFinal || null,
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

// Función auxiliar para normalizar nombres de productos
function normalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
    .replace(/[^\w\s]/g, '') // Remover caracteres especiales
}

async function buscarOCrearProducto(item: any) {
  const nombreProducto = item.title?.trim() || ''
  const skuOriginal = item.sku?.trim() || null
  
  // Paso 1: Si hay SKU, buscar primero por SKU
  if (skuOriginal) {
    const { data: productoPorSku } = await supabase
      .from('productos')
      .select('*')
      .eq('codigo_sku', skuOriginal)
      .eq('eliminado', false)
      .single()

    if (productoPorSku) {
      return productoPorSku
    }
  }

  // Paso 2: Buscar por nombre normalizado (solo si hay nombre)
  if (nombreProducto) {
    const nombreNormalizado = normalizarNombre(nombreProducto)
    
    // Obtener todos los productos activos y no eliminados
    const { data: productos, error: errorBusqueda } = await supabase
      .from('productos')
      .select('*')
      .eq('eliminado', false)
      .eq('activo', true)

    if (!errorBusqueda && productos) {
      // Buscar producto con nombre normalizado similar
      const productoExistente = productos.find(p => {
        if (!p.nombre) return false
        const nombreBDNormalizado = normalizarNombre(p.nombre)
        return nombreBDNormalizado === nombreNormalizado
      })

      if (productoExistente) {
        // Si encontramos por nombre pero no tenía SKU, actualizar el SKU si viene de Shopify
        if (skuOriginal && !productoExistente.codigo_sku) {
          await supabase
            .from('productos')
            .update({ codigo_sku: skuOriginal })
            .eq('id', productoExistente.id)
        }
        return productoExistente
      }
    }
  }

  // Paso 3: Si no existe, crear nuevo producto
  // Solo usar SHOPIFY-${item.id} como SKU si realmente no hay SKU
  const skuFinal = skuOriginal || null // No generar SKU automático para evitar duplicados

  const { data: nuevoProducto, error } = await supabase
    .from('productos')
    .insert({
      codigo_sku: skuFinal,
      nombre: nombreProducto,
      precio: parseFloat(item.price),
      activo: true,
      eliminado: false
    })
    .select()
    .single()

  if (error) throw error
  return nuevoProducto
}