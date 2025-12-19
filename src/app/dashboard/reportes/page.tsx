'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef, useCallback } from 'react'
import { EstadoGuia, Guia, Usuario } from '@/types/database'
import GuiasPorEstado from '@/components/Reportes/GuiasPorEstado'
import EstadisticasMotorizados from '@/components/Reportes/EstadisticasMotorizados'
import ProductosDespachados from '@/components/Reportes/ProductosDespachados'
import { getEstadoColor, getEstadoTexto } from '@/components/Reportes/helpers'

interface EstadisticasMotorizado {
  motorizado_id: string
  motorizado_nombre: string
  motorizado_username: string
  total_guias: number
  guias_asignadas: number
  guias_en_ruta: number
  guias_entregadas: number
  guias_finalizadas?: number
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
  
  // Estados para eliminación de guías
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [cantidadGuiasAEliminar, setCantidadGuiasAEliminar] = useState(0)
  
  // Estados para finalizar guías
  const [mostrarModalFinalizar, setMostrarModalFinalizar] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [cantidadGuiasAFinalizar, setCantidadGuiasAFinalizar] = useState(0)
  
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
  // Función auxiliar para construir la query base con filtros
  const construirQueryConFiltros = () => {
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

    return queryBuilder
  }

  // Función para contar guías que se eliminarán
  const contarGuiasAEliminar = async () => {
    try {
      const queryBuilder = construirQueryConFiltros()
      const { data, error } = await queryBuilder

      if (error) throw error
      return data?.length || 0
    } catch (error) {
      console.error('Error contando guías a eliminar:', error)
      return 0
    }
  }

  // Función para eliminar guías según los filtros
  const eliminarGuiasPorFiltros = async () => {
    if (!filtroEstados.length) {
      alert('Debes seleccionar al menos un estado para eliminar guías')
      return
    }

    if (!filtroMotorizado) {
      alert('Debes seleccionar un motorizado para eliminar guías')
      return
    }

    setEliminando(true)
    try {
      // Guardar la cantidad antes de eliminar
      const cantidadEliminadas = cantidadGuiasAEliminar

      // Construir la query de actualización con los mismos filtros
      let queryBuilder = supabase
        .from('guias')
        .update({ eliminado: true })
        .eq('eliminado', false)

      // Aplicar filtro por estados (multiselect)
      if (filtroEstados.length > 0) {
        queryBuilder = queryBuilder.in('estado', filtroEstados)
      }

      // Aplicar filtro por fecha desde
      if (filtroFechaDesde) {
        const fechaDesdeInicio = new Date(filtroFechaDesde)
        fechaDesdeInicio.setHours(0, 0, 0, 0)
        queryBuilder = queryBuilder.gte('fecha_actualizacion', fechaDesdeInicio.toISOString())
      }

      // Aplicar filtro por fecha hasta
      if (filtroFechaHasta) {
        const fechaHastaFin = new Date(filtroFechaHasta)
        fechaHastaFin.setHours(23, 59, 59, 999)
        queryBuilder = queryBuilder.lte('fecha_actualizacion', fechaHastaFin.toISOString())
      }

      // Aplicar filtro por motorizado
      if (filtroMotorizado) {
        queryBuilder = queryBuilder.eq('motorizado_asignado', filtroMotorizado)
      }

      const { error } = await queryBuilder

      if (error) throw error
      
      // Limpiar cache y refrescar datos
      clearCache('reportes-estadisticas')
      clearCache('reportes-estados')
      clearCache('reportes-productos')
      setGuiasReporte([])
      await fetchReportes()
      
      setMostrarModalEliminar(false)
      alert(`Se eliminaron ${cantidadEliminadas} guía(s) correctamente`)
    } catch (error) {
      console.error('Error eliminando guías:', error)
      alert('Error al eliminar las guías')
    } finally {
      setEliminando(false)
    }
  }

  // Función para abrir modal de confirmación
  const abrirModalEliminar = async () => {
    if (!filtroEstados.length) {
      alert('Debes seleccionar al menos un estado para eliminar guías')
      return
    }

    if (!filtroMotorizado) {
      alert('Debes seleccionar un motorizado para eliminar guías')
      return
    }

    const cantidad = await contarGuiasAEliminar()
    if (cantidad === 0) {
      alert('No hay guías que coincidan con los filtros seleccionados')
      return
    }

    setCantidadGuiasAEliminar(cantidad)
    setMostrarModalEliminar(true)
  }

  // Función para finalizar guías según los filtros
  const finalizarGuiasPorFiltros = async () => {
    if (!filtroEstados.length) {
      alert('Debes seleccionar al menos un estado para finalizar guías')
      return
    }

    if (!filtroMotorizado) {
      alert('Debes seleccionar un motorizado para finalizar guías')
      return
    }

    if (!user) {
      alert('No se pudo identificar al usuario')
      return
    }

    setFinalizando(true)
    try {
      // Guardar la cantidad antes de finalizar
      const cantidadFinalizadas = cantidadGuiasAFinalizar

      // Primero obtener las guías que se van a actualizar para registrar el historial
      const queryBuilder = construirQueryConFiltros()
      const { data: guiasAActualizar, error: errorSelect } = await queryBuilder

      if (errorSelect) throw errorSelect

      if (!guiasAActualizar || guiasAActualizar.length === 0) {
        alert('No hay guías que coincidan con los filtros seleccionados')
        return
      }

      const fechaEntrega = new Date().toISOString()

      // Actualizar cada guía y registrar en historial
      for (const guia of guiasAActualizar) {
        // Actualizar estado de la guía
        const { error: updateError } = await supabase
          .from('guias')
          .update({ 
            estado: 'finalizada',
            fecha_entrega: fechaEntrega
          })
          .eq('id', guia.id)

        if (updateError) {
          console.error(`Error actualizando guía ${guia.id}:`, updateError)
          continue
        }

        // Insertar en historial_estado
        const { error: historialError } = await supabase
          .from('historial_estado')
          .insert({
            guia_id: guia.id,
            estado_anterior: guia.estado,
            estado_nuevo: 'finalizada',
            usuario_id: user.id
          })

        if (historialError) {
          console.warn(`Error insertando historial para guía ${guia.id} (puede ser que el trigger ya lo hizo):`, historialError)
        }
      }
      
      // Limpiar cache y refrescar datos
      clearCache('reportes-estadisticas')
      clearCache('reportes-estados')
      clearCache('reportes-productos')
      setGuiasReporte([])
      await fetchReportes()
      
      setMostrarModalFinalizar(false)
      alert(`Se finalizaron ${cantidadFinalizadas} guía(s) correctamente`)
    } catch (error) {
      console.error('Error finalizando guías:', error)
      alert('Error al finalizar las guías')
    } finally {
      setFinalizando(false)
    }
  }

  // Función para abrir modal de confirmación de finalizar
  const abrirModalFinalizar = async () => {
    if (!filtroEstados.length) {
      alert('Debes seleccionar al menos un estado para finalizar guías')
      return
    }

    if (!filtroMotorizado) {
      alert('Debes seleccionar un motorizado para finalizar guías')
      return
    }

    const cantidad = await contarGuiasAEliminar() // Reutilizamos la misma función de conteo
    if (cantidad === 0) {
      alert('No hay guías que coincidan con los filtros seleccionados')
      return
    }

    setCantidadGuiasAFinalizar(cantidad)
    setMostrarModalFinalizar(true)
  }

  const buscarGuiasReporte = async () => {
    // Resetear estado de carga
    setLoadingReporte(true)
    
    try {
      // Construir la query base
      const queryBuilder = construirQueryConFiltros()
      
      // Aplicar ordenamiento
      const queryConOrden = queryBuilder.order('fecha_actualizacion', { ascending: false })

      // Ejecutar la query
      const { data, error } = await queryConOrden

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

              {/* Botón Finalizar Guías */}
              {filtroEstados.length > 0 && filtroMotorizado && (
                <button
                  onClick={abrirModalFinalizar}
                  disabled={finalizando}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Finalizar guías según los filtros seleccionados"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Finalizar Guías
                </button>
              )}

              {/* Botón Eliminar Guías */}
              {filtroEstados.length > 0 && filtroMotorizado && (
                <button
                  onClick={abrirModalEliminar}
                  disabled={eliminando}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Eliminar guías según los filtros seleccionados"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Eliminar Guías
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

        <GuiasPorEstado guiasPorEstado={guiasPorEstado} />

        <EstadisticasMotorizados estadisticasMotorizados={estadisticasMotorizados} />

        <ProductosDespachados productosDespachados={productosDespachados} />
      </div>

      {/* Modal de Confirmación para Eliminar Guías */}
      {mostrarModalEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                ¿Estás seguro de que deseas eliminar <span className="font-bold text-red-600">{cantidadGuiasAEliminar}</span> guía(s)?
              </p>
              
              <div className="bg-gray-50 rounded-md p-3 space-y-2 text-xs text-gray-600">
                <p>
                  <span className="font-semibold">Estados:</span>{' '}
                  {filtroEstados.map(e => getEstadoTexto(e)).join(', ')}
                </p>
                {filtroMotorizado && (
                  <p>
                    <span className="font-semibold">Motorizado:</span>{' '}
                    {motorizados.find(m => m.id === filtroMotorizado)?.nombre || 'N/A'}
                  </p>
                )}
                {filtroFechaDesde && (
                  <p>
                    <span className="font-semibold">Desde:</span>{' '}
                    {new Date(filtroFechaDesde).toLocaleDateString('es-ES')}
                  </p>
                )}
                {filtroFechaHasta && (
                  <p>
                    <span className="font-semibold">Hasta:</span>{' '}
                    {new Date(filtroFechaHasta).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>
              
              <p className="text-xs text-red-600 mt-3 font-semibold">
                ⚠️ Esta acción no se puede deshacer
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setMostrarModalEliminar(false)}
                disabled={eliminando}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarGuiasPorFiltros}
                disabled={eliminando}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {eliminando ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Finalizar Guías */}
      {mostrarModalFinalizar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Finalización</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                ¿Estás seguro de que deseas finalizar <span className="font-bold text-green-600">{cantidadGuiasAFinalizar}</span> guía(s)?
              </p>
              
              <div className="bg-gray-50 rounded-md p-3 space-y-2 text-xs text-gray-600">
                <p>
                  <span className="font-semibold">Estados:</span>{' '}
                  {filtroEstados.map(e => getEstadoTexto(e)).join(', ')}
                </p>
                {filtroMotorizado && (
                  <p>
                    <span className="font-semibold">Motorizado:</span>{' '}
                    {motorizados.find(m => m.id === filtroMotorizado)?.nombre || 'N/A'}
                  </p>
                )}
                {filtroFechaDesde && (
                  <p>
                    <span className="font-semibold">Desde:</span>{' '}
                    {new Date(filtroFechaDesde).toLocaleDateString('es-ES')}
                  </p>
                )}
                {filtroFechaHasta && (
                  <p>
                    <span className="font-semibold">Hasta:</span>{' '}
                    {new Date(filtroFechaHasta).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>
              
              <p className="text-xs text-green-600 mt-3 font-semibold">
                ✓ Todas las guías seleccionadas cambiarán a estado "Finalizada"
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setMostrarModalFinalizar(false)}
                disabled={finalizando}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={finalizarGuiasPorFiltros}
                disabled={finalizando}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {finalizando ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Finalizando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Finalizar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}