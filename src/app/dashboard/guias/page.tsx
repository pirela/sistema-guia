'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Guia, Usuario } from '@/types/database'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import GenerarPDFGuias from '@/components/GenerarPDFGuias'

interface GuiaConInfo extends Guia {
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
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  useEffect(() => {
    if (!authLoading && user?.rol === 'administrador') {
      fetchGuias()
      fetchMotorizados()
      fetchUsuarios()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading])

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

  const fetchGuias = async () => {
    try {
      const result = await cachedFetch(
        'guias',
        async () => {
          return await supabase
            .from('guias')
            .select('*')
            .eq('eliminado', false)
            .order('fecha_creacion', { ascending: false })
        }
      )

      if (result.error) throw result.error
      const guiasData = result.data || []

      // Obtener conteo de novedades y último usuario que modificó para cada guía
      const guiasConInfo = await Promise.all(
        guiasData.map(async (guia: Guia) => {
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
  }

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

  const guiasFiltradas = filtroEstado === 'todos' 
    ? guias 
    : guias.filter(g => g.estado === filtroEstado)
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

        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por estado:
          </label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="asignada">Asignada</option>
            <option value="en_ruta">En Ruta</option>
            <option value="entregada">Entregada</option>
            <option value="novedad">Novedad</option>
            <option value="cancelada">Cancelada</option>
            <option value="rechazada">Rechazada</option>
          </select>
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
              <div key={guia.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Número</p>
                    <p className="font-semibold text-gray-900">{guia.numero_guia}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEstadoColor(guia.estado)}`}>
                    {guia.estado}
                  </span>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="text-sm text-gray-900">{guia.nombre_cliente}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Motorizado</p>
                    <p className="text-sm text-gray-900">{motorizados[guia.motorizado_asignado]?.nombre || 'N/A'}</p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Monto</p>
                      <p className="text-sm font-semibold text-gray-900">${guia.monto_recaudar.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Fecha</p>
                      <p className="text-sm text-gray-900">{new Date(guia.fecha_creacion).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Novedades</p>
                      {guia.cantidad_novedades ? (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 w-fit">
                            {guia.cantidad_novedades}
                          </span>
                          {guia.ultimo_usuario_novedad_id && usuarios[guia.ultimo_usuario_novedad_id] && (
                            <p className="text-xs text-gray-500">
                              Por: {usuarios[guia.ultimo_usuario_novedad_id].nombre}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">0</p>
                      )}
                    </div>
                  </div>
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