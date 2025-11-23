'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Guia, Usuario, Producto } from '@/types/database'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import GenerarPDFGuias from '@/components/GenerarPDFGuias'

interface GuiaProducto {
  id: string
  guia_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  producto: Producto
}

interface GuiaConInfo extends Guia {
  productos?: GuiaProducto[]
  cantidad_novedades?: number
  ultimo_usuario_id?: string | null
  ultimo_usuario_novedad_id?: string | null
}

export default function GuiasPage() {
  const { user, loading: authLoading } = useAuth()
  const [guias, setGuias] = useState<GuiaConInfo[]>([])
  const [motorizados, setMotorizados] = useState<{ [key: string]: Usuario }>({})
  const [usuarios, setUsuarios] = useState<{ [key: string]: Usuario }>({})
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string[]>([])
  const [filtroNombreCliente, setFiltroNombreCliente] = useState<string>('')
  const [mostrarFiltroEstado, setMostrarFiltroEstado] = useState(false)
  const [filtroNombreClienteDebounced, setFiltroNombreClienteDebounced] = useState<string>('')
  const filtroEstadoRef = useRef<HTMLDivElement>(null)
  
  // Obtener fecha de hoy en formato YYYY-MM-DD para el input date + 7 días
  const hoy = new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0]
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>(hoy)

  // Debounce para el filtro de nombre del cliente
  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltroNombreClienteDebounced(filtroNombreCliente)
    }, 500) // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timer)
  }, [filtroNombreCliente])

  // Cerrar el dropdown de filtro de estado al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtroEstadoRef.current && !filtroEstadoRef.current.contains(event.target as Node)) {
        setMostrarFiltroEstado(false)
      }
    }

    if (mostrarFiltroEstado) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mostrarFiltroEstado])

  const fetchGuias = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('guias')
        .select('*')
        .eq('eliminado', false)

      // Aplicar filtro por nombre del cliente si existe
      if (filtroNombreClienteDebounced.trim()) {
        query = query.ilike('nombre_cliente', `%${filtroNombreClienteDebounced.trim()}%`)
      }

      // Aplicar filtro por fecha desde
      if (filtroFechaDesde) {
        // Incluir todo el día desde (00:00:00)
        const fechaDesdeInicio = new Date(filtroFechaDesde)
        fechaDesdeInicio.setHours(0, 0, 0, 0)
        query = query.gte('fecha_creacion', fechaDesdeInicio.toISOString())
      }

      // Aplicar filtro por fecha hasta
      if (filtroFechaHasta) {
        // Incluir todo el día hasta (23:59:59)
        const fechaHastaFin = new Date(filtroFechaHasta)
        fechaHastaFin.setHours(23, 59, 59, 999)
        query = query.lte('fecha_creacion', fechaHastaFin.toISOString())
      }

      query = query.order('fecha_creacion', { ascending: false })

      const result = await cachedFetch(
        `guias-${filtroNombreClienteDebounced}-${filtroFechaDesde}-${filtroFechaHasta}`,
        async () => {
          return await query
        }
      )

      if (result.error) throw result.error
      const guiasData = result.data || []

      // Obtener productos, conteo de novedades y último usuario que modificó para cada guía
      const guiasConInfo = await Promise.all(
        guiasData.map(async (guia: Guia) => {
          // Obtener productos
          const productosResult = await cachedFetch(
            `guia-productos-${guia.id}`,
            async () => {
              return await supabase
                .from('guias_productos')
                .select(`
                  *,
                  producto:productos(*)
                `)
                .eq('guia_id', guia.id)
            },
            15000
          )

          // Contar novedades
          const { count: novedadesCount } = await supabase
            .from('novedades')
            .select('*', { count: 'exact', head: true })
            .eq('guia_id', guia.id)

          // Obtener última novedad para saber quién la creó
          const { data: ultimaNovedadData } = await supabase
            .from('novedades')
            .select('usuario_id')
            .eq('guia_id', guia.id)
            .order('fecha_creacion', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Obtener último usuario que creó una novedad
          const ultimoUsuarioNovedadId = ultimaNovedadData?.usuario_id || null

          // Obtener último usuario que modificó desde historial_estado
          const { data: ultimoHistorialData } = await supabase
            .from('historial_estado')
            .select('usuario_id')
            .eq('guia_id', guia.id)
            .order('fecha_cambio', { ascending: false })
            .limit(1)

          // Usar el usuario del historial o null si no hay
          const usuarioIdModifico = ultimoHistorialData && ultimoHistorialData.length > 0 
            ? ultimoHistorialData[0].usuario_id 
            : null

          return {
            ...guia,
            productos: productosResult.data as GuiaProducto[] || [],
            cantidad_novedades: novedadesCount || 0,
            ultimo_usuario_id: usuarioIdModifico,
            ultimo_usuario_novedad_id: ultimoUsuarioNovedadId,
          }
        })
      )

      setGuias(guiasConInfo)
    } catch (error) {
      console.error('Error fetching guias:', error)
    } finally {
      setLoading(false)
    }
  }, [filtroNombreClienteDebounced, filtroFechaDesde, filtroFechaHasta])

  useEffect(() => {
    if (!authLoading && user?.rol === 'administrador') {
      fetchGuias()
      fetchMotorizados()
      fetchUsuarios()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading, fetchGuias])

  // Timeout de seguridad: si después de 15 segundos aún está cargando, forzar setLoading(false)
  useEffect(() => {
    if (loading && !authLoading) {
      const timeoutId = setTimeout(() => {
        console.warn('Timeout en guias, forzando loading a false')
        setLoading(false)
      }, 15000)

      return () => clearTimeout(timeoutId)
    }
  }, [loading, authLoading])


  const fetchMotorizados = async () => {
    try {
      const result = await cachedFetch(
        'motorizados',
        async () => {
          return await supabase
            .from('usuarios')
            .select('*')
            .eq('rol', 'motorizado')
            .eq('eliminado', false)
        }
      )

      if (result.error) throw result.error
      
      const motorizadosMap: { [key: string]: Usuario } = {}
      result.data?.forEach((m) => {
        motorizadosMap[m.id] = m
      })
      setMotorizados(motorizadosMap)
    } catch (error) {
      console.error('Error fetching motorizados:', error)
    }
  }

  const fetchUsuarios = async () => {
    try {
      const result = await cachedFetch(
        'usuarios-todos',
        async () => {
          return await supabase
            .from('usuarios')
            .select('*')
            .eq('eliminado', false)
        }
      )

      if (result.error) throw result.error
      
      const usuariosMap: { [key: string]: Usuario } = {}
      result.data?.forEach((u) => {
        usuariosMap[u.id] = u
      })
      setUsuarios(usuariosMap)
    } catch (error) {
      console.error('Error fetching usuarios:', error)
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
      novedad: 'bg-purple-100 text-purple-800',
    }
    return colors[estado] || 'bg-gray-100 text-gray-800'
  }

  const guiasFiltradas = filtroEstado.length === 0
    ? guias 
    : guias.filter(g => filtroEstado.includes(g.estado))
  /*
  if (!user || user.rol !== 'administrador') {
    return <div>No tienes permisos para ver esta página</div>
  }
  */

  // Mostrar loading solo si auth está cargando o si estamos cargando datos iniciales
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <div className="text-gray-600">Cargando guías...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Guías de Despacho</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <GenerarPDFGuias />
            <Link
              href="/dashboard/guias/crear"
              className="bg-blue-600 text-white px-4 py-2.5 rounded-md hover:bg-blue-700 transition-colors text-center text-sm sm:text-base"
            >
              + Crear Guía
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por nombre del cliente:
              </label>
              <input
                type="text"
                value={filtroNombreCliente}
                onChange={(e) => setFiltroNombreCliente(e.target.value)}
                placeholder="Escribe el nombre del cliente..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:w-64 relative" ref={filtroEstadoRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por estado:
              </label>
              <button
                type="button"
                onClick={() => setMostrarFiltroEstado(!mostrarFiltroEstado)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex justify-between items-center"
              >
                <span className="text-gray-700">
                  {filtroEstado.length === 0 
                    ? 'Todos los estados' 
                    : filtroEstado.length === 1 
                    ? filtroEstado[0] 
                    : `${filtroEstado.length} estados seleccionados`}
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${mostrarFiltroEstado ? 'transform rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {mostrarFiltroEstado && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  <div className="p-2 space-y-2">
                    {[
                      { value: 'pendiente', label: 'Pendiente' },
                      { value: 'asignada', label: 'Asignada' },
                      { value: 'en_ruta', label: 'En Ruta' },
                      { value: 'entregada', label: 'Entregada' },
                      { value: 'novedad', label: 'Novedad' },
                      { value: 'cancelada', label: 'Cancelada' },
                      { value: 'rechazada', label: 'Rechazada' },
                    ].map((estado) => (
                      <label
                        key={estado.value}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filtroEstado.includes(estado.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFiltroEstado([...filtroEstado, estado.value])
                            } else {
                              setFiltroEstado(filtroEstado.filter(e => e !== estado.value))
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{estado.label}</span>
                      </label>
                    ))}
                    {filtroEstado.length > 0 && (
                      <div className="pt-2 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setFiltroEstado([])}
                          className="w-full text-sm text-blue-600 hover:text-blue-800 text-center py-1"
                        >
                          Limpiar filtros
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha desde:
              </label>
              <input
                type="date"
                value={filtroFechaDesde}
                onChange={(e) => setFiltroFechaDesde(e.target.value)}
                max={filtroFechaHasta || hoy}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha hasta:
              </label>
              <input
                type="date"
                value={filtroFechaHasta}
                onChange={(e) => setFiltroFechaHasta(e.target.value)}
                max={hoy}
                min={filtroFechaDesde || undefined}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(filtroFechaDesde || filtroFechaHasta !== hoy) && (
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setFiltroFechaDesde('')
                    setFiltroFechaHasta(hoy)
                  }}
                  className="px-4 py-2.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
                >
                  Limpiar fechas
                </button>
              </div>
            )}
          </div>
          {filtroEstado.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filtroEstado.map((estado) => (
                <span
                  key={estado}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {estado}
                  <button
                    type="button"
                    onClick={() => setFiltroEstado(filtroEstado.filter(e => e !== estado))}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motorizado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Novedades
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {guiasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No hay guías registradas
                  </td>
                </tr>
              ) : (
                guiasFiltradas.map((guia) => (
                  <tr key={guia.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {guia.numero_guia}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {guia.nombre_cliente}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {motorizados[guia.motorizado_asignado]?.nombre || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(guia.estado)}`}>
                        {guia.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${guia.monto_recaudar.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(guia.fecha_creacion).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col gap-1">
                        {guia.cantidad_novedades ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 w-fit">
                            {guia.cantidad_novedades}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                        {guia.ultimo_usuario_novedad_id && usuarios[guia.ultimo_usuario_novedad_id] && (
                          <span className="text-xs text-gray-500">
                            Por: {usuarios[guia.ultimo_usuario_novedad_id].nombre}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/dashboard/guias/${guia.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Ver detalles
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden space-y-3">
          {guiasFiltradas.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No hay guías registradas
            </div>
          ) : (
            guiasFiltradas.map((guia) => (
              <div key={guia.id} className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex items-stretch justify-between gap-3">
                  <div className="flex flex-col">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800">
                      {guia.numero_guia}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {new Date(guia.fecha_creacion).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-2 text-xs font-semibold rounded-full ${getEstadoColor(guia.estado)} whitespace-nowrap flex items-center justify-center`}>
                    {guia.estado}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <p className="flex-1"><span className="font-semibold">Cliente:</span> {guia.nombre_cliente}</p>
                    <p className="sm:w-40"><span className="font-semibold">Tel:</span> {guia.telefono_cliente}</p>
                  </div>
                  <p><span className="font-semibold">Dirección:</span> {guia.direccion}</p>
                  <div>
                    <p className="text-xs text-gray-500">Motorizado</p>
                    <p className="text-sm text-gray-900">{motorizados[guia.motorizado_asignado]?.nombre || 'N/A'}</p>
                  </div>
                  
                  {/* Productos */}
                  {guia.productos && guia.productos.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="font-semibold text-xs sm:text-sm mb-2 text-gray-700">Productos a entregar:</p>
                      <div className="space-y-1">
                        {guia.productos.map((gp) => (
                          <div key={gp.id} className="flex justify-between items-center text-xs sm:text-sm">
                            <span className="text-gray-700">
                              {gp.producto?.nombre || 'Producto no encontrado'}
                            </span>
                            <span className="font-semibold text-gray-900">
                              x{gp.cantidad}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Novedades */}
                  {guia.cantidad_novedades !== undefined && guia.cantidad_novedades > 0 && (
                    <div className="bg-pink-50 p-3 rounded-md border border-pink-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-xs sm:text-sm mb-1 text-pink-700">Novedades:</p>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                            {guia.cantidad_novedades} {guia.cantidad_novedades === 1 ? 'novedad' : 'novedades'}
                          </span>
                        </div>
                        {guia.ultimo_usuario_novedad_id && usuarios[guia.ultimo_usuario_novedad_id] && (
                          <p className="text-xs text-pink-600">
                            Última por:<br />
                            <span className="font-semibold">{usuarios[guia.ultimo_usuario_novedad_id].nombre}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-base sm:text-lg font-bold text-green-600">
                    Monto: ${guia.monto_recaudar.toFixed(2)}
                  </p>
                  {guia.observacion && (
                    <p className="text-xs sm:text-sm bg-yellow-50 p-2 rounded">
                      <span className="font-semibold">Obs:</span> {guia.observacion}
                    </p>
                  )}
                </div>
                
                <Link
                  href={`/dashboard/guias/${guia.id}`}
                  className="block w-full text-center bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Ver detalles
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}