'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import ModalComentarioNovedad from '@/components/ModalComentarioNovedad'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Guia, Usuario, GuiaProducto, Producto, HistorialEstado, EstadoGuia, Novedad } from '@/types/database'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface GuiaProductoDetalle extends GuiaProducto {
  producto: Producto
}

interface HistorialDetalle extends HistorialEstado {
  usuario: Usuario | null
}

export default function DetalleGuiaPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string | undefined
  const [guia, setGuia] = useState<Guia | null>(null)
  const [motorizado, setMotorizado] = useState<Usuario | null>(null)
  const [creador, setCreador] = useState<Usuario | null>(null)
  const [productos, setProductos] = useState<GuiaProductoDetalle[]>([])
  const [historial, setHistorial] = useState<HistorialDetalle[]>([])
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [historialNovedades, setHistorialNovedades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [mostrarModalMotorizado, setMostrarModalMotorizado] = useState(false)
  const [motorizados, setMotorizados] = useState<Usuario[]>([])
  const [motorizadoSeleccionado, setMotorizadoSeleccionado] = useState('')
  
  // Estados para modal de novedad
  const [modalNovedad, setModalNovedad] = useState({
    isOpen: false,
    estadoAnterior: null as EstadoGuia | null,
    estadoNuevo: null as EstadoGuia | null,
    loading: false,
  })

  useEffect(() => {
    if (!authLoading && user && id) {
      fetchGuiaDetalle()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading, id])

  // Timeout de seguridad: si después de 15 segundos aún está cargando, forzar setLoading(false)
  useEffect(() => {
    if (loading && !authLoading) {
      const timeoutId = setTimeout(() => {
        console.warn('Timeout en detalle-guia, forzando loading a false')
        setLoading(false)
      }, 15000)

      return () => clearTimeout(timeoutId)
    }
  }, [loading, authLoading])

  const fetchGuiaDetalle = async () => {
    if (!id) return
    
    try {
      const result = await cachedFetch(
        `guia-${id}`,
        async () => {
          return await supabase
            .from('guias')
            .select('*')
            .eq('id', id)
            .eq('eliminado', false)
            .single()
        },
        10000
      )

      if (result.error) throw result.error
      setGuia(result.data)

      const { data: motorizadoData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', result.data.motorizado_asignado)
        .single()
      setMotorizado(motorizadoData)

      const { data: creadorData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', result.data.creado_por)
        .single()
      setCreador(creadorData)

      const productosResult = await cachedFetch(
        `guia-productos-${id}`,
        async () => {
          return await supabase
            .from('guias_productos')
            .select(`
              *,
              producto:productos(*)
            `)
            .eq('guia_id', id)
        },
        10000
      )

      if (productosResult.error) throw productosResult.error
      setProductos(productosResult.data as any || [])

      const historialResult = await cachedFetch(
        `guia-historial-${id}`,
        async () => {
          return await supabase
            .from('historial_estado')
            .select(`
              *,
              usuario:usuarios(*)
            `)
            .eq('guia_id', id)
            .order('fecha_cambio', { ascending: false })
        },
        10000
      )

      if (historialResult.error) throw historialResult.error
      setHistorial(historialResult.data as any || [])

      // Obtener novedades
      const novedadesResult = await cachedFetch(
        `guia-novedades-${id}`,
        async () => {
          return await supabase
            .from('novedades')
            .select('*')
            .eq('guia_id', id)
            .order('fecha_creacion', { ascending: false })
        },
        10000
      )

      if (novedadesResult.error) throw novedadesResult.error
      setNovedades(novedadesResult.data || [])

      // Combinar novedades con historial para mostrar historial completo
      const historialCompleto = combinarHistorialNovedades(
        historialResult.data as any || [],
        novedadesResult.data || []
      )
      setHistorialNovedades(historialCompleto)

    } catch (error) {
      console.error('Error al cargar guía:', error)
      alert('Error al cargar la guía')
    } finally {
      setLoading(false)
    }
  }

  const combinarHistorialNovedades = (
    historial: HistorialDetalle[],
    novedades: Novedad[]
  ) => {
    // Crear un mapa de novedades por fecha para combinarlas con el historial
    const novedadesMap = new Map<string, Novedad[]>()
    
    novedades.forEach(novedad => {
      const fecha = new Date(novedad.fecha_creacion).toISOString().split('T')[0]
      if (!novedadesMap.has(fecha)) {
        novedadesMap.set(fecha, [])
      }
      novedadesMap.get(fecha)!.push(novedad)
    })

    // Combinar historial con novedades
    const historialCombinado: any[] = []
    
    historial.forEach(cambio => {
      const fechaCambio = new Date(cambio.fecha_cambio).toISOString().split('T')[0]
      const novedadesDelDia = novedadesMap.get(fechaCambio) || []
      
      // Buscar novedad relacionada (misma fecha y relacionada con cambio a/desde novedad)
      const novedadRelacionada = novedadesDelDia.find(n => {
        const fechaNovedad = new Date(n.fecha_creacion).toISOString()
        const fechaCambioISO = new Date(cambio.fecha_cambio).toISOString()
        // Verificar si la novedad está dentro de un minuto del cambio de estado
        const diff = Math.abs(new Date(fechaNovedad).getTime() - new Date(fechaCambioISO).getTime())
        return diff < 60000 && (cambio.estado_nuevo === 'novedad' || cambio.estado_anterior === 'novedad')
      })

      historialCombinado.push({
        ...cambio,
        novedad: novedadRelacionada || null,
        tipo: 'cambio_estado',
        fecha: cambio.fecha_cambio,
      })
    })

    // Agregar novedades que no tienen cambio de estado asociado
    novedades.forEach(novedad => {
      const yaIncluida = historialCombinado.some(h => h.novedad?.id === novedad.id)
      if (!yaIncluida) {
        // Buscar el cambio de estado más cercano
        const cambioRelacionado = historial.find(c => {
          const fechaNovedad = new Date(novedad.fecha_creacion).toISOString()
          const fechaCambio = new Date(c.fecha_cambio).toISOString()
          const diff = Math.abs(new Date(fechaNovedad).getTime() - new Date(fechaCambio).getTime())
          return diff < 60000 && (c.estado_nuevo === 'novedad' || c.estado_anterior === 'novedad')
        })

        historialCombinado.push({
          id: `novedad-${novedad.id}`,
          guia_id: novedad.guia_id,
          estado_anterior: cambioRelacionado?.estado_anterior || null,
          estado_nuevo: cambioRelacionado?.estado_nuevo || null,
          usuario_id: novedad.usuario_id,
          comentario: novedad.comentario,
          fecha_cambio: novedad.fecha_creacion,
          novedad: novedad,
          tipo: 'novedad',
          fecha: novedad.fecha_creacion,
        })
      }
    })

    // Ordenar por fecha descendente (más reciente primero)
    return historialCombinado.sort((a, b) => {
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })
  }

  const actualizarEstado = async (nuevoEstado: EstadoGuia) => {
    if (!guia || !user || !id) return
    
    const estadoAnterior = guia.estado
    const necesitaComentario = nuevoEstado === 'novedad' || estadoAnterior === 'novedad'

    if (necesitaComentario) {
      // Mostrar modal para pedir comentario
      setModalNovedad({
        isOpen: true,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        loading: false,
      })
    } else {
      // Cambio normal, proceder directamente
      await ejecutarCambioEstado(nuevoEstado, estadoAnterior, '')
    }
  }

  const ejecutarCambioEstado = async (
    nuevoEstado: EstadoGuia,
    estadoAnterior: EstadoGuia,
    comentario: string
  ) => {
    if (!guia || !user || !id) return
    
    setActualizando(true)
    try {
      // Actualizar estado de la guía
      const { error } = await supabase
        .from('guias')
        .update({ 
          estado: nuevoEstado,
          fecha_entrega: nuevoEstado === 'entregada' ? new Date().toISOString() : guia.fecha_entrega
        })
        .eq('id', guia.id)

      if (error) throw error

      // Insertar en historial_estado (el trigger debería hacerlo, pero lo hacemos manualmente por si acaso)
      const { error: historialError } = await supabase
        .from('historial_estado')
        .insert({
          guia_id: guia.id,
          estado_anterior: estadoAnterior,
          estado_nuevo: nuevoEstado,
          usuario_id: user.id
        })

      if (historialError) {
        console.warn('Error insertando en historial_estado (puede ser que el trigger ya lo hizo):', historialError)
      }

      // Si hay comentario, guardar en tabla novedades
      if (comentario.trim()) {
        const { error: errorNovedad } = await supabase
          .from('novedades')
          .insert({
            guia_id: guia.id,
            usuario_id: user.id,
            comentario: comentario.trim(),
            fecha_creacion: new Date().toISOString(),
          })

        if (errorNovedad) {
          console.error('Error guardando novedad:', errorNovedad)
          // No lanzar error, solo loguear
        }
      }

      clearCache(`guia-${id}`)
      clearCache(`guia-historial-${id}`)
      clearCache(`guia-novedades-${id}`)
      await fetchGuiaDetalle()
      alert('Estado actualizado correctamente')
    } catch (error) {
      console.error('Error al actualizar estado:', error)
      alert('Error al actualizar el estado')
    } finally {
      setActualizando(false)
    }
  }

  const handleConfirmarNovedad = async (comentario: string) => {
    setModalNovedad(prev => ({ ...prev, loading: true }))
    
    await ejecutarCambioEstado(
      modalNovedad.estadoNuevo!,
      modalNovedad.estadoAnterior!,
      comentario
    )

    setModalNovedad({
      isOpen: false,
      estadoAnterior: null,
      estadoNuevo: null,
      loading: false,
    })
  }

  const abrirModalReasignar = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'motorizado')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setMotorizados(data || [])
      setMostrarModalMotorizado(true)
    } catch (error) {
      console.error('Error al cargar motorizados:', error)
      alert('Error al cargar motorizados')
    }
  }

  const reasignarMotorizado = async () => {
    if (!guia || !motorizadoSeleccionado || !id) return
    
    setActualizando(true)
    try {
      const { error } = await supabase
        .from('guias')
        .update({ motorizado_asignado: motorizadoSeleccionado })
        .eq('id', guia.id)

      if (error) throw error

      clearCache(`guia-${id}`)
      await fetchGuiaDetalle()
      setMostrarModalMotorizado(false)
      setMotorizadoSeleccionado('')
      alert('Motorizado reasignado correctamente')
    } catch (error) {
      console.error('Error al reasignar motorizado:', error)
      alert('Error al reasignar motorizado')
    } finally {
      setActualizando(false)
    }
  }

  const getEstadoBadgeColor = (estado: string) => {
    const colores: Record<string, string> = {
      'pendiente': 'bg-yellow-100 text-yellow-800',
      'en_ruta': 'bg-blue-100 text-blue-800',
      'entregada': 'bg-green-100 text-green-800',
      'rechazada': 'bg-orange-100 text-orange-800',
      'cancelada': 'bg-red-100 text-red-800',
      'finalizada': 'bg-purple-100 text-purple-800',
      'novedad': 'bg-pink-100 text-pink-800'
    }
    return colores[estado] || 'bg-gray-100 text-gray-800'
  }

  const getEstadoTexto = (estado: string) => {
    const textos: Record<string, string> = {
      'pendiente': 'Pendiente',
      'en_ruta': 'En Ruta',
      'entregada': 'Entregada',
      'rechazada': 'Rechazada',
      'cancelada': 'Cancelada',
      'finalizada': 'Finalizada',
      'novedad': 'Novedad'
    }
    return textos[estado] || estado
  }

  // Mostrar loading solo si auth está cargando o si estamos cargando datos iniciales
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <div className="text-lg text-gray-600">Cargando...</div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!guia) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Guía no encontrada</p>
          <button
            onClick={() => router.push('/dashboard/guias')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Volver a guías
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/dashboard/guias')}
              className="text-blue-600 hover:text-blue-800 mb-2 text-sm"
            >
              ← Volver a guías
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Guía #{guia.numero_guia}
            </h1>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadgeColor(guia.estado)}`}>
            {getEstadoTexto(guia.estado)}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Cliente</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nombre</p>
                  <p className="text-sm font-medium text-gray-900">{guia.nombre_cliente}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="text-sm font-medium text-gray-900">{guia.telefono_cliente}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Dirección</p>
                  <p className="text-sm font-medium text-gray-900">{guia.direccion}</p>
                </div>
                {guia.referencia && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Referencia</p>
                    <p className="text-sm font-medium text-gray-900">{guia.referencia}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Productos</h2>
              <div className="space-y-3">
                {productos.map((item) => (
                  <div key={item.id} className="flex justify-between items-center border-b border-gray-200 pb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.producto.nombre}</p>
                      <p className="text-xs text-gray-600">Cantidad: {item.cantidad}</p>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      ${(item.precio_unitario * item.cantidad).toFixed(2)}
                    </p>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <p className="text-base font-semibold text-gray-900">Total a Recaudar</p>
                  <p className="text-base font-bold text-green-600">${guia.monto_recaudar.toFixed(2)}</p>
                </div>
              </div>
            </div>


            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Novedades</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {historialNovedades.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No hay novedades registradas
                  </p>
                ) : (
                  historialNovedades
                    .filter(item => item.estado_nuevo === 'novedad' || item.estado_anterior === 'novedad' || item.novedad)
                    .map((item) => (
                      <div 
                        key={item.id} 
                        className={`border-l-4 pl-4 py-3 ${
                          item.estado_nuevo === 'novedad' 
                            ? 'border-pink-500 bg-pink-50' 
                            : item.estado_anterior === 'novedad'
                            ? 'border-green-500 bg-green-50'
                            : 'border-blue-500 bg-blue-50'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {item.estado_anterior 
                                ? `${getEstadoTexto(item.estado_anterior)} → ${getEstadoTexto(item.estado_nuevo)}`
                                : getEstadoTexto(item.estado_nuevo)
                              }
                            </p>
                            {item.usuario && (
                              <p className="text-xs text-gray-500 mt-1">
                                Por: {item.usuario.nombre}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {new Date(item.fecha).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        {item.novedad && (
                          <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Descripción:</p>
                            <p className="text-sm text-gray-800">{item.novedad.comentario}</p>
                          </div>
                        )}
                        {!item.novedad && item.comentario && (
                          <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Comentario:</p>
                            <p className="text-sm text-gray-800">{item.comentario}</p>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Entrega</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Motorizado Asignado</p>
                  <p className="text-sm font-medium text-gray-900">
                    {motorizado?.nombre || 'No asignado'}
                  </p>
                  {user?.rol === 'administrador' && (
                    <button
                      onClick={abrirModalReasignar}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                    >
                      Reasignar
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha de Creación</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(guia.fecha_creacion).toLocaleString('es-ES')}
                  </p>
                </div>
                {guia.fecha_entrega && (
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Entrega</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(guia.fecha_entrega).toLocaleString('es-ES')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Creado por</p>
                  <p className="text-sm font-medium text-gray-900">
                    {creador?.nombre || 'Desconocido'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>
              <div className="space-y-2">
                {user?.rol === 'motorizado' && guia.estado === 'en_ruta' && (
                  <>
                    <button
                      onClick={() => actualizarEstado('entregada')}
                      disabled={actualizando}
                      className="w-full bg-green-600 text-white py-2.5 text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Marcar Entregada
                    </button>
                    <button
                      onClick={() => actualizarEstado('rechazada')}
                      disabled={actualizando}
                      className="w-full bg-orange-600 text-white py-2.5 text-sm rounded-md hover:bg-orange-700 disabled:bg-gray-400"
                    >
                      Marcar Rechazada
                    </button>
                    <button
                      onClick={() => actualizarEstado('novedad')}
                      disabled={actualizando}
                      className="w-full bg-pink-600 text-white py-2.5 text-sm rounded-md hover:bg-pink-700 disabled:bg-gray-400"
                    >
                      Reportar Novedad
                    </button>
                  </>
                )}

                {user?.rol === 'motorizado' && guia.estado === 'asignada' && (
                  <button
                    onClick={() => actualizarEstado('novedad')}
                    disabled={actualizando}
                    className="w-full bg-pink-600 text-white py-2.5 text-sm rounded-md hover:bg-pink-700 disabled:bg-gray-400"
                  >
                    Reportar Novedad
                  </button>
                )}

                {user?.rol === 'motorizado' && guia.estado === 'novedad' && (
                  <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 py-3 px-4 rounded-md text-sm">
                    <p className="font-medium">⚠️ Guía en estado Novedad</p>
                    <p className="text-xs mt-1">Solo un administrador puede cambiar el estado de esta guía.</p>
                  </div>
                )}
                
                {user?.rol === 'administrador' && guia.estado !== 'entregada' && guia.estado !== 'finalizada' && (
                  <button
                    onClick={() => actualizarEstado('finalizada')}
                    disabled={actualizando}
                    className="w-full bg-green-600 text-white py-2.5 text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Finalizar Guía
                  </button>
                )}

                {user?.rol === 'administrador' && (guia.estado === 'asignada' || guia.estado === 'en_ruta') && (
                  <button
                    onClick={() => actualizarEstado('novedad')}
                    disabled={actualizando}
                    className="w-full bg-pink-600 text-white py-2.5 text-sm rounded-md hover:bg-pink-700 disabled:bg-gray-400"
                  >
                    Marcar como Novedad
                  </button>
                )}

                {user?.rol === 'administrador' && guia.estado === 'novedad' && (
                  <>
                    <button
                      onClick={() => actualizarEstado('asignada')}
                      disabled={actualizando}
                      className="w-full bg-blue-600 text-white py-2.5 text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      Volver a Asignada
                    </button>
                    <button
                      onClick={() => actualizarEstado('en_ruta')}
                      disabled={actualizando}
                      className="w-full bg-yellow-600 text-white py-2.5 text-sm rounded-md hover:bg-yellow-700 disabled:bg-gray-400"
                    >
                      Volver a En Ruta
                    </button>
                    <button
                      onClick={() => actualizarEstado('cancelada')}
                      disabled={actualizando}
                      className="w-full bg-red-600 text-white py-2.5 text-sm rounded-md hover:bg-red-700 disabled:bg-gray-400"
                    >
                      Cancelar Guía
                    </button>
                    <button
                      onClick={() => actualizarEstado('rechazada')}
                      disabled={actualizando}
                      className="w-full bg-orange-600 text-white py-2.5 text-sm rounded-md hover:bg-orange-700 disabled:bg-gray-400"
                    >
                      Rechazar Guía
                    </button>
                  </>
                )}

                {user?.rol === 'administrador' && guia.estado !== 'entregada' && guia.estado !== 'finalizada' && guia.estado !== 'novedad' && (
                  <button
                    onClick={() => actualizarEstado('cancelada')}
                    disabled={actualizando}
                    className="w-full bg-red-600 text-white py-2.5 text-sm rounded-md hover:bg-red-700 disabled:bg-gray-400"
                  >
                    Cancelar Guía
                  </button>
                )}
                
              </div>
            </div>
          </div>
        </div>
      </div>

      {mostrarModalMotorizado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reasignar Motorizado</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar Motorizado
              </label>
              <select
                value={motorizadoSeleccionado}
                onChange={(e) => setMotorizadoSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Seleccionar --</option>
                {motorizados.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} (@{m.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModalMotorizado(false)}
                disabled={actualizando}
                className="flex-1 bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600 disabled:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={reasignarMotorizado}
                disabled={actualizando || !motorizadoSeleccionado}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {actualizando ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comentario para Novedad */}
      <ModalComentarioNovedad
        isOpen={modalNovedad.isOpen}
        onClose={() => setModalNovedad(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmarNovedad}
        titulo={
          modalNovedad.estadoNuevo === 'novedad'
            ? 'Reportar Novedad'
            : 'Resolver Novedad'
        }
        estadoAnterior={modalNovedad.estadoAnterior}
        estadoNuevo={modalNovedad.estadoNuevo || undefined}
        loading={modalNovedad.loading}
      />
    </DashboardLayout>
  )
}