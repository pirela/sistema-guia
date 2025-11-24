'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef, useCallback } from 'react'
import { EstadoGuia, Guia, Usuario } from '@/types/database'

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

interface GuiaReporte extends Guia {
  // Hereda todos los campos de Guia, incluyendo:
  // numero_guia, monto_recaudar, fecha_actualizacion, estado
}

export default function ReportesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refrescando, setRefrescando] = useState(false)
  const [estadisticasMotorizados, setEstadisticasMotorizados] = useState<EstadisticasMotorizado[]>([])
  const [guiasPorEstado, setGuiasPorEstado] = useState<GuiasPorEstado[]>([])
  const [productosDespachados, setProductosDespachados] = useState<ProductosDespachados[]>([])
  
  // Estados para el reporte de guías con filtros
  const [guiasReporte, setGuiasReporte] = useState<GuiaReporte[]>([])
  const [loadingReporte, setLoadingReporte] = useState(false)
  const [filtroEstados, setFiltroEstados] = useState<EstadoGuia[]>([])
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('')
  const [filtroMotorizado, setFiltroMotorizado] = useState<string>('')
  const [motorizados, setMotorizados] = useState<Usuario[]>([])
  const [cargandoMotorizados, setCargandoMotorizados] = useState(false)
  const [mostrarFiltroEstados, setMostrarFiltroEstados] = useState(false)
  const filtroEstadosRef = useRef<HTMLDivElement>(null)
  
  // Estados para ordenamiento del reporte
  const [ordenarPor, setOrdenarPor] = useState<string>('fecha_actualizacion')
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('desc')
  
  const ESTADOS_DISPONIBLES: EstadoGuia[] = ['pendiente', 'asignada', 'en_ruta', 'entregada', 'finalizada', 'cancelada', 'rechazada', 'novedad']

  // Función para ordenar las guías del reporte
  const ordenarGuiasReporte = (guiasParaOrdenar: GuiaReporte[]) => {
    const guiasOrdenadas = [...guiasParaOrdenar]
    
    guiasOrdenadas.sort((a, b) => {
      let valorA: any
      let valorB: any
      
      switch (ordenarPor) {
        case 'numero_guia':
          valorA = a.numero_guia
          valorB = b.numero_guia
          break
        case 'monto_recaudar':
          valorA = a.monto_recaudar
          valorB = b.monto_recaudar
          break
        case 'fecha_actualizacion':
          valorA = new Date(a.fecha_actualizacion).getTime()
          valorB = new Date(b.fecha_actualizacion).getTime()
          break
        case 'estado':
          valorA = a.estado
          valorB = b.estado
          break
        default:
          return 0
      }
      
      if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1
      if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1
      return 0
    })
    
    return guiasOrdenadas
  }

  // Función para manejar el clic en el header de ordenamiento
  const handleOrdenar = (campo: string) => {
    if (ordenarPor === campo) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenarPor(campo)
      setOrdenDireccion('asc')
    }
  }

  // Función para obtener el icono de ordenamiento
  const getSortIcon = (campo: string) => {
    if (ordenarPor !== campo) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    if (ordenDireccion === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )
    } else {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )
    }
  }

  const guiasReporteOrdenadas = ordenarGuiasReporte(guiasReporte)

  useEffect(() => {
    if (user?.rol === 'administrador') {
      fetchReportes()
      fetchMotorizados()
    }
  }, [user])

  const fetchMotorizados = async () => {
    setCargandoMotorizados(true)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'motorizado')
        .eq('activo', true)
        .eq('eliminado', false)
        .order('nombre', { ascending: true })

      if (error) throw error
      setMotorizados(data || [])
    } catch (error) {
      console.error('Error fetching motorizados:', error)
    } finally {
      setCargandoMotorizados(false)
    }
  }

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
      finalizada: 'bg-indigo-100 text-indigo-800',
      cancelada: 'bg-red-100 text-red-800',
      rechazada: 'bg-orange-100 text-orange-800',
      novedad: 'bg-pink-100 text-pink-800',
    }
    return colors[estado] || 'bg-gray-100 text-gray-800'
  }

  const getEstadoTexto = (estado: string) => {
    const textos: { [key: string]: string } = {
      pendiente: 'Pendiente',
      asignada: 'Asignada',
      en_ruta: 'En Ruta',
      entregada: 'Entregada',
      finalizada: 'Finalizada',
      cancelada: 'Cancelada',
      rechazada: 'Rechazada',
      novedad: 'Novedad',
    }
    return textos[estado] || estado
  }

  // Cerrar el dropdown de filtro de estados al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtroEstadosRef.current && !filtroEstadosRef.current.contains(event.target as Node)) {
        setMostrarFiltroEstados(false)
      }
    }

    if (mostrarFiltroEstados) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mostrarFiltroEstados])

  // Función para buscar guías con filtros
  const buscarGuiasReporte = async () => {
    // Resetear estado de carga
    setLoadingReporte(true)
    
    try {
      // Construir la query base
      let queryBuilder = supabase
        .from('guias')
        .select('*')
        .eq('eliminado', false)

      // Aplicar filtro por estados (multiselect)
      if (filtroEstados.length > 0) {
        queryBuilder = queryBuilder.in('estado', filtroEstados)
      }

      // Aplicar filtro por fecha desde (inclusivo - desde 00:00:00)
      if (filtroFechaDesde) {
        const fechaDesdeInicio = new Date(filtroFechaDesde)
        fechaDesdeInicio.setHours(0, 0, 0, 0)
        queryBuilder = queryBuilder.gte('fecha_actualizacion', fechaDesdeInicio.toISOString())
      }

      // Aplicar filtro por fecha hasta (inclusivo - hasta 23:59:59)
      if (filtroFechaHasta) {
        const fechaHastaFin = new Date(filtroFechaHasta)
        fechaHastaFin.setHours(23, 59, 59, 999)
        queryBuilder = queryBuilder.lte('fecha_actualizacion', fechaHastaFin.toISOString())
      }

      // Aplicar filtro por motorizado
      if (filtroMotorizado) {
        queryBuilder = queryBuilder.eq('motorizado_asignado', filtroMotorizado)
      }

      // Aplicar ordenamiento
      queryBuilder = queryBuilder.order('fecha_actualizacion', { ascending: false })

      // Ejecutar la query
      const { data, error } = await queryBuilder

      if (error) {
        console.error('Error en la query de Supabase:', error)
        throw error
      }

      // Actualizar el estado con los datos
      setGuiasReporte(data || [])
    } catch (error) {
      console.error('Error buscando guías para reporte:', error)
      // Resetear los resultados en caso de error
      setGuiasReporte([])
    } finally {
      // SIEMPRE resetear el estado de carga, incluso si hay error
      setLoadingReporte(false)
    }
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

        {/* Nuevo Reporte de Guías con Filtros */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📋 Reporte de Guías</h3>
          
          {/* Filtros */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
              {/* Filtro por Estados (Multiselect) */}
              <div className="flex items-center gap-2 relative" ref={filtroEstadosRef}>
                <span className="text-sm text-gray-600 whitespace-nowrap">Estados:</span>
                <button
                  type="button"
                  onClick={() => setMostrarFiltroEstados(!mostrarFiltroEstados)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 min-w-[200px]"
                >
                  <span className="flex-1 text-left">
                    {filtroEstados.length === 0 
                      ? 'Todos los estados' 
                      : filtroEstados.length === 1 
                      ? getEstadoTexto(filtroEstados[0]) 
                      : `${filtroEstados.length} estados seleccionados`}
                  </span>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${mostrarFiltroEstados ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {mostrarFiltroEstados && (
                  <div className="absolute z-20 top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-auto">
                    <div className="p-2 space-y-1">
                      {ESTADOS_DISPONIBLES.map((estado) => (
                        <label
                          key={estado}
                          className="flex items-center justify-between space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="checkbox"
                              checked={filtroEstados.includes(estado)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFiltroEstados([...filtroEstados, estado])
                                } else {
                                  setFiltroEstados(filtroEstados.filter(e => e !== estado))
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(estado)}`}>
                              {getEstadoTexto(estado)}
                            </span>
                          </div>
                        </label>
                      ))}
                      {filtroEstados.length > 0 && (
                        <div className="pt-2 border-t border-gray-200 mt-1">
                          <button
                            type="button"
                            onClick={() => setFiltroEstados([])}
                            className="w-full text-sm text-blue-600 hover:text-blue-800 text-center py-1"
                          >
                            Limpiar filtros
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {filtroEstados.length > 0 && (
                  <button
                    onClick={() => setFiltroEstados([])}
                    className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                    title="Limpiar estados"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por Fecha Desde */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Desde:</span>
                <input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {filtroFechaDesde && (
                  <button
                    onClick={() => setFiltroFechaDesde('')}
                    className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                    title="Limpiar fecha desde"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por Fecha Hasta */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Hasta:</span>
                <input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  min={filtroFechaDesde || undefined}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {filtroFechaHasta && (
                  <button
                    onClick={() => setFiltroFechaHasta('')}
                    className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                    title="Limpiar fecha hasta"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por Motorizado */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 whitespace-nowrap">Motorizado:</span>
                <select
                  value={filtroMotorizado}
                  onChange={(e) => setFiltroMotorizado(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                  disabled={cargandoMotorizados}
                >
                  <option value="">Todos los motorizados</option>
                  {motorizados.map((motorizado) => (
                    <option key={motorizado.id} value={motorizado.id}>
                      {motorizado.nombre}
                    </option>
                  ))}
                </select>
                {filtroMotorizado && (
                  <button
                    onClick={() => setFiltroMotorizado('')}
                    className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
                    title="Limpiar motorizado"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Botón Buscar */}
              <button
                onClick={buscarGuiasReporte}
                disabled={loadingReporte}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingReporte ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Buscar
                  </>
                )}
              </button>

              {/* Botón Limpiar Todos los Filtros */}
              {(filtroEstados.length > 0 || filtroFechaDesde || filtroFechaHasta || filtroMotorizado) && (
                <button
                  onClick={() => {
                    setFiltroEstados([])
                    setFiltroFechaDesde('')
                    setFiltroFechaHasta('')
                    setFiltroMotorizado('')
                    setGuiasReporte([])
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Limpiar todos
                </button>
              )}
            </div>

            {/* Info de filtros activos */}
            {(filtroEstados.length > 0 || filtroFechaDesde || filtroFechaHasta || filtroMotorizado) && (
              <div className="text-xs text-gray-500 space-y-1">
                {filtroEstados.length > 0 && (
                  <p>
                    Estados: <span className="font-semibold">{filtroEstados.map(e => getEstadoTexto(e)).join(', ')}</span>
                  </p>
                )}
                {filtroFechaDesde && (
                  <p>
                    Desde: <span className="font-semibold">{new Date(filtroFechaDesde).toLocaleDateString('es-ES')}</span>
                  </p>
                )}
                {filtroFechaHasta && (
                  <p>
                    Hasta: <span className="font-semibold">{new Date(filtroFechaHasta).toLocaleDateString('es-ES')}</span> (ambas fechas inclusivas)
                  </p>
                )}
                {filtroMotorizado && (
                  <p>
                    Motorizado: <span className="font-semibold">{motorizados.find(m => m.id === filtroMotorizado)?.nombre || 'N/A'}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tabla de Resultados */}
          {loadingReporte ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
              <div className="text-gray-600">Buscando guías...</div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                <div className="text-gray-600">
                  Total de guías encontradas: <span className="font-semibold">{guiasReporte.length}</span>
                </div>
                {guiasReporte.length > 0 && (
                  <div className="text-gray-600">
                    Monto total a recaudar: <span className="font-semibold text-green-700">
                      ${guiasReporte.reduce((sum, guia) => sum + guia.monto_recaudar, 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleOrdenar('numero_guia')}
                      >
                        <div className="flex items-center gap-2">
                          Número de Guía
                          {getSortIcon('numero_guia')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleOrdenar('monto_recaudar')}
                      >
                        <div className="flex items-center gap-2">
                          Monto a Recaudar
                          {getSortIcon('monto_recaudar')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleOrdenar('fecha_actualizacion')}
                      >
                        <div className="flex items-center gap-2">
                          Última Fecha de Cambio
                          {getSortIcon('fecha_actualizacion')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleOrdenar('estado')}
                      >
                        <div className="flex items-center gap-2">
                          Estado Actual
                          {getSortIcon('estado')}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {guiasReporteOrdenadas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          No se encontraron guías con los filtros seleccionados
                        </td>
                      </tr>
                    ) : (
                      guiasReporteOrdenadas.map((guia) => (
                        <tr key={guia.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {guia.numero_guia}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${guia.monto_recaudar.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(guia.fecha_actualizacion).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getEstadoColor(guia.estado)}`}>
                              {getEstadoTexto(guia.estado)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>


              {/* Vista móvil */}
              <div className="md:hidden space-y-3">
                {guiasReporteOrdenadas.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No se encontraron guías con los filtros seleccionados
                  </div>
                ) : (
                  guiasReporteOrdenadas.map((guia) => (
                    <div key={guia.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900">{guia.numero_guia}</h4>
                          <p className="text-xs text-gray-500">
                            {new Date(guia.fecha_actualizacion).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(guia.estado)}`}>
                          {getEstadoTexto(guia.estado)}
                        </span>
                      </div>
                      <div className="border-t pt-2">
                        <p className="flex justify-between text-sm">
                          <span className="text-gray-600">Monto a recaudar:</span>
                          <span className="font-bold text-gray-900">${guia.monto_recaudar.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}