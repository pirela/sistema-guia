'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

interface EstadisticasMotorizado {
  motorizado_id: string
  motorizado_nombre: string
  motorizado_username: string
  total_guias: number
  guias_asignadas: number
  guias_en_ruta: number
  guias_entregadas: number
  guias_canceladas: number
  guias_rechazadas: number
  monto_total_recaudado: number
  monto_pendiente_recaudar: number
  ultima_entrega: string | null
}

interface GuiasPorEstado {
  estado: string
  total_guias: number
  monto_total: number
  monto_promedio: number
  primera_guia: string
  ultima_guia: string
}

interface ProductosDespachados {
  producto_id: string
  codigo_sku: string | null
  producto_nombre: string
  precio: number
  veces_despachado: number
  cantidad_total_despachada: number
  ultima_vez_despachado: string | null
}

export default function ReportesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [estadisticasMotorizados, setEstadisticasMotorizados] = useState<EstadisticasMotorizado[]>([])
  const [guiasPorEstado, setGuiasPorEstado] = useState<GuiasPorEstado[]>([])
  const [productosDespachados, setProductosDespachados] = useState<ProductosDespachados[]>([])

  useEffect(() => {
    if (user?.rol === 'administrador') {
      fetchReportes()
    }
  }, [user])

   const fetchReportes = async () => {
    try {
      const estadisticasResult = await cachedFetch(
        'reportes-estadisticas',
        async () => supabase.from('vista_estadisticas_motorizado').select('*'),
        20000
      )

      const estadosResult = await cachedFetch(
        'reportes-estados',
        async () => supabase.from('vista_guias_por_estado').select('*'),
        20000
      )

      const productosResult = await cachedFetch(
        'reportes-productos',
        async () => supabase.from('vista_productos_mas_despachados').select('*').limit(10),
        20000
      )

      if (estadisticasResult.error) throw estadisticasResult.error
      if (estadosResult.error) throw estadosResult.error
      if (productosResult.error) throw productosResult.error

      setEstadisticasMotorizados(estadisticasResult.data || [])
      setGuiasPorEstado(estadosResult.data || [])
      setProductosDespachados(productosResult.data || [])
    } catch (error) {
      console.error('Error fetching reportes:', error)
    } finally {
      setLoading(false)
    }
  }

  const refrescarVistas = async () => {
    setRefrescando(true)
    try {
      const { error } = await supabase.rpc('refrescar_vistas_materializadas')
      
      if (error) throw error
      
      clearCache('reportes-estadisticas')
      clearCache('reportes-estados')
      clearCache('reportes-productos')
      await fetchReportes()
      alert('Vistas actualizadas correctamente')
    } catch (error) {
      console.error('Error refrescando vistas:', error)
      alert('Error al actualizar vistas')
    } finally {
      setRefrescando(false)
    }
  }

  const getEstadoColor = (estado: string) => {
    const colors: { [key: string]: string } = {
      pendiente: 'bg-gray-100 text-gray-800',
      asignada: 'bg-blue-100 text-blue-800',
      en_ruta: 'bg-yellow-100 text-yellow-800',
      entregada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800',
      rechazada: 'bg-orange-100 text-orange-800',
    }
    return colors[estado] || 'bg-gray-100 text-gray-800'
  }
  /*
  if (!user || user.rol !== 'administrador') {
    return <div>No tienes permisos para ver esta página</div>
  }
  */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center">Cargando reportes...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Reportes y Estadísticas</h2>
            <p className="text-sm text-gray-600">Análisis de rendimiento del sistema</p>
          </div>
          <button
            onClick={refrescarVistas}
            disabled={refrescando}
            className="bg-green-600 text-white px-4 sm:px-6 py-2.5 sm:py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 text-sm sm:text-base font-medium"
          >
            {refrescando ? 'Actualizando...' : '🔄 Actualizar Datos'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📊 Guías por Estado</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {guiasPorEstado.map((estado) => (
              <div key={estado.estado} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${getEstadoColor(estado.estado)}`}>
                    {estado.estado}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-gray-800">{estado.total_guias}</span>
                </div>
                <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                  <p>Monto Total: <span className="font-semibold">${estado.monto_total.toFixed(2)}</span></p>
                  <p>Promedio: <span className="font-semibold">${estado.monto_promedio.toFixed(2)}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">👥 Estadísticas por Motorizado</h3>
          
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Motorizado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Asignadas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    En Ruta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Entregadas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Canceladas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rechazadas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Recaudado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pendiente
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {estadisticasMotorizados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                ) : (
                  estadisticasMotorizados.map((motorizado) => (
                    <tr key={motorizado.motorizado_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {motorizado.motorizado_nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {motorizado.total_guias}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        {motorizado.guias_asignadas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                        {motorizado.guias_en_ruta}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {motorizado.guias_entregadas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {motorizado.guias_canceladas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                        {motorizado.guias_rechazadas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                        ${motorizado.monto_total_recaudado.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ${motorizado.monto_pendiente_recaudar.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {estadisticasMotorizados.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No hay datos disponibles
              </div>
            ) : (
              estadisticasMotorizados.map((motorizado) => (
                <div key={motorizado.motorizado_id} className="border rounded-lg p-4 space-y-3">
                  <div className="border-b pb-2">
                    <h4 className="font-bold text-gray-900">{motorizado.motorizado_nombre}</h4>
                    <p className="text-xs text-gray-500">@{motorizado.motorizado_username}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-600">Total Guías</p>
                      <p className="font-bold text-lg">{motorizado.total_guias}</p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs text-blue-600">Asignadas</p>
                      <p className="font-bold text-lg text-blue-600">{motorizado.guias_asignadas}</p>
                    </div>
                    <div className="bg-yellow-50 p-2 rounded">
                      <p className="text-xs text-yellow-600">En Ruta</p>
                      <p className="font-bold text-lg text-yellow-600">{motorizado.guias_en_ruta}</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <p className="text-xs text-green-600">Entregadas</p>
                      <p className="font-bold text-lg text-green-600">{motorizado.guias_entregadas}</p>
                    </div>
                    <div className="bg-red-50 p-2 rounded">
                      <p className="text-xs text-red-600">Canceladas</p>
                      <p className="font-bold text-lg text-red-600">{motorizado.guias_canceladas}</p>
                    </div>
                    <div className="bg-orange-50 p-2 rounded">
                      <p className="text-xs text-orange-600">Rechazadas</p>
                      <p className="font-bold text-lg text-orange-600">{motorizado.guias_rechazadas}</p>
                    </div>
                  </div>

                  <div className="border-t pt-2 space-y-1 text-sm">
                    <p className="flex justify-between">
                      <span className="text-gray-600">Recaudado:</span>
                      <span className="font-bold text-green-700">${motorizado.monto_total_recaudado.toFixed(2)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-600">Pendiente:</span>
                      <span className="font-semibold text-gray-600">${motorizado.monto_pendiente_recaudar.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📦 Top 10 Productos Más Despachados</h3>
          
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Precio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Veces Despachado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cantidad Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Última Vez
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productosDespachados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                ) : (
                  productosDespachados.map((producto, index) => (
                    <tr key={producto.producto_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {producto.codigo_sku || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span className="mr-2 text-gray-400">#{index + 1}</span>
                        {producto.producto_nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${producto.precio.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                        {producto.veces_despachado}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                        {producto.cantidad_total_despachada}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {producto.ultima_vez_despachado 
                          ? new Date(producto.ultima_vez_despachado).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {productosDespachados.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No hay datos disponibles
              </div>
            ) : (
              productosDespachados.map((producto, index) => (
                <div key={producto.producto_id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                        <h4 className="font-bold text-gray-900">{producto.producto_nombre}</h4>
                      </div>
                      <p className="text-xs text-gray-500">SKU: {producto.codigo_sku || 'N/A'}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">${producto.precio.toFixed(2)}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs text-blue-600">Veces</p>
                      <p className="font-bold text-blue-600">{producto.veces_despachado}</p>
                    </div>
                    <div className="bg-green-50 p-2 rounded">
                      <p className="text-xs text-green-600">Cantidad</p>
                      <p className="font-bold text-green-600">{producto.cantidad_total_despachada}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-600">Última</p>
                      <p className="font-semibold text-xs text-gray-900">
                        {producto.ultima_vez_despachado 
                          ? new Date(producto.ultima_vez_despachado).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}