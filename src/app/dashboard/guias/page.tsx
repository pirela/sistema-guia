'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Guia, Usuario } from '@/types/database'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import GenerarPDFGuias from '@/components/GenerarPDFGuias'

export default function GuiasPage() {
  const { user } = useAuth()
  const [guias, setGuias] = useState<Guia[]>([])
  const [motorizados, setMotorizados] = useState<{ [key: string]: Usuario }>({})
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  useEffect(() => {
    if (user?.rol === 'administrador') {
      fetchGuias()
      fetchMotorizados()
    }
  }, [user])

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
      setGuias(result.data || [])
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

  const guiasFiltradas = filtroEstado === 'todos' 
    ? guias 
    : guias.filter(g => g.estado === filtroEstado)
  /*
  if (!user || user.rol !== 'administrador') {
    return <div>No tienes permisos para ver esta página</div>
  }
  */

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center">Cargando guías...</div>
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
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {guiasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
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