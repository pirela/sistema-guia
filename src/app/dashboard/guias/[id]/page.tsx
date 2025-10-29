'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Guia, Usuario, GuiaProducto, Producto, HistorialEstado } from '@/types/database'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface GuiaProductoDetalle extends GuiaProducto {
  producto: Producto
}

interface HistorialDetalle extends HistorialEstado {
  usuario: Usuario | null
}

export default function DetalleGuiaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string | undefined
  const [guia, setGuia] = useState<Guia | null>(null)
  const [motorizado, setMotorizado] = useState<Usuario | null>(null)
  const [creador, setCreador] = useState<Usuario | null>(null)
  const [productos, setProductos] = useState<GuiaProductoDetalle[]>([])
  const [historial, setHistorial] = useState<HistorialDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [actualizando, setActualizando] = useState(false)
  const [mostrarModalMotorizado, setMostrarModalMotorizado] = useState(false)
  const [motorizados, setMotorizados] = useState<Usuario[]>([])
  const [motorizadoSeleccionado, setMotorizadoSeleccionado] = useState('')

  useEffect(() => {
    if (user && id) {
      fetchGuiaDetalle()
    }
  }, [user, id])

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

    } catch (error) {
      console.error('Error al cargar guía:', error)
      alert('Error al cargar la guía')
    } finally {
      setLoading(false)
    }
  }

  const actualizarEstado = async (nuevoEstado: string) => {
    if (!guia || !user || !id) return
    
    setActualizando(true)
    try {
      const { error } = await supabase
        .from('guias')
        .update({ 
          estado: nuevoEstado,
          fecha_entrega: nuevoEstado === 'entregada' ? new Date().toISOString() : guia.fecha_entrega
        })
        .eq('id', guia.id)

      if (error) throw error

      const { error: historialError } = await supabase
        .from('historial_estado')
        .insert({
          guia_id: guia.id,
          estado_anterior: guia.estado,
          estado_nuevo: nuevoEstado,
          usuario_id: user.id
        })

      if (historialError) throw historialError

      clearCache(`guia-${id}`)
      clearCache(`guia-historial-${id}`)
      await fetchGuiaDetalle()
      alert('Estado actualizado correctamente')
    } catch (error) {
      console.error('Error al actualizar estado:', error)
      alert('Error al actualizar el estado')
    } finally {
      setActualizando(false)
    }
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
      'finalizada': 'bg-purple-100 text-purple-800'
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
      'finalizada': 'Finalizada'
    }
    return textos[estado] || estado
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Cargando...</div>
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Estados</h2>
              <div className="space-y-3">
                {historial.map((item) => (
                  <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getEstadoTexto(item.estado_anterior || '')} → {getEstadoTexto(item.estado_nuevo)}
                        </p>
                        <p className="text-xs text-gray-600">
                          Por: {item.usuario?.nombre || 'Sistema'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(item.fecha_cambio).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))}
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
                  </>
                )}
                
                {user?.rol === 'administrador' && guia.estado !== 'entregada' && (
                  <button
                    onClick={() => actualizarEstado('finalizada')}
                    disabled={actualizando}
                    className="w-full bg-green-600 text-white py-2.5 text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    Finalizar Guía
                  </button>
                )}

                {user?.rol === 'administrador' && guia.estado !== 'entregada' && (
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
    </DashboardLayout>
  )
}