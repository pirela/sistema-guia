'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Guia } from '@/types/database'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function MisGuiasPage() {
  const { user } = useAuth()
  const [guias, setGuias] = useState<Guia[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')

  useEffect(() => {
    if (user?.rol === 'motorizado') {
      fetchMisGuias()
    }
  }, [user])

  const fetchMisGuias = async () => {
    try {
      const result = await cachedFetch(
        `mis-guias-${user?.id}`,
        async () => {
          return await supabase
            .from('guias')
            .select('*')
            .eq('motorizado_asignado', user?.id)
            .eq('eliminado', false)
            .order('fecha_creacion', { ascending: false })
        },
        15000
      )

      if (result.error) throw result.error
      setGuias(result.data || [])
    } catch (error) {
      console.error('Error fetching mis guias:', error)
    } finally {
      setLoading(false)
    }
  }

  const actualizarEstado = async (guiaId: string, nuevoEstado: string) => {
    if (!confirm(`¿Confirmar cambio de estado a "${nuevoEstado}"?`)) return

    try {
      const { error } = await supabase
        .from('guias')
        .update({ 
          estado: nuevoEstado,
          actualizado_por: user?.id,
          ...(nuevoEstado === 'entregada' ? { fecha_entrega: new Date().toISOString() } : {})
        })
        .eq('id', guiaId)

      if (error) throw error
      
      clearCache(`mis-guias-${user?.id}`)
      clearCache(`guia-${guiaId}`)
      clearCache(`guia-historial-${guiaId}`)
      fetchMisGuias()
      alert('Estado actualizado correctamente')
    } catch (error) {
      console.error('Error actualizando estado:', error)
      alert('Error al actualizar estado')
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

  const guiasFiltradas = filtroEstado === 'todas' 
    ? guias 
    : guias.filter(g => g.estado === filtroEstado)

  const contadores = {
    todas: guias.length,
    asignada: guias.filter(g => g.estado === 'asignada').length,
    en_ruta: guias.filter(g => g.estado === 'en_ruta').length,
    entregada: guias.filter(g => g.estado === 'entregada').length,
  }
  /*
  if (!user || user.rol !== 'motorizado') {
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
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Mis Guías Asignadas</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gestiona tus entregas</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <button
            onClick={() => setFiltroEstado('todas')}
            className={`p-3 sm:p-4 rounded-lg text-center transition-all ${
              filtroEstado === 'todas' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-xl sm:text-2xl font-bold">{contadores.todas}</p>
            <p className="text-xs sm:text-sm">Todas</p>
          </button>
          <button
            onClick={() => setFiltroEstado('asignada')}
            className={`p-3 sm:p-4 rounded-lg text-center transition-all ${
              filtroEstado === 'asignada' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-xl sm:text-2xl font-bold">{contadores.asignada}</p>
            <p className="text-xs sm:text-sm">Asignadas</p>
          </button>
          <button
            onClick={() => setFiltroEstado('en_ruta')}
            className={`p-3 sm:p-4 rounded-lg text-center transition-all ${
              filtroEstado === 'en_ruta' 
                ? 'bg-yellow-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-xl sm:text-2xl font-bold">{contadores.en_ruta}</p>
            <p className="text-xs sm:text-sm">En Ruta</p>
          </button>
          <button
            onClick={() => setFiltroEstado('entregada')}
            className={`p-3 sm:p-4 rounded-lg text-center transition-all ${
              filtroEstado === 'entregada' 
                ? 'bg-green-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-xl sm:text-2xl font-bold">{contadores.entregada}</p>
            <p className="text-xs sm:text-sm">Entregadas</p>
          </button>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {guiasFiltradas.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-white rounded-lg">
              No hay guías {filtroEstado !== 'todas' && `en estado "${filtroEstado}"`}
            </div>
          ) : (
            guiasFiltradas.map((guia) => (
              <div key={guia.id} className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-800">
                      {guia.numero_guia}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {new Date(guia.fecha_creacion).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getEstadoColor(guia.estado)} whitespace-nowrap`}>
                    {guia.estado}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex flex-col sm:flex-row sm:gap-4">
                    <p className="flex-1"><span className="font-semibold">Cliente:</span> {guia.nombre_cliente}</p>
                    <p className="sm:w-40"><span className="font-semibold">Tel:</span> {guia.telefono_cliente}</p>
                  </div>
                  <p><span className="font-semibold">Dirección:</span> {guia.direccion}</p>
                  <p className="text-base sm:text-lg font-bold text-green-600">
                    Monto: ${guia.monto_recaudar.toFixed(2)}
                  </p>
                  {guia.observacion && (
                    <p className="text-xs sm:text-sm bg-yellow-50 p-2 rounded">
                      <span className="font-semibold">Obs:</span> {guia.observacion}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {guia.estado === 'asignada' && (
                    <button
                      onClick={() => actualizarEstado(guia.id, 'en_ruta')}
                      className="flex-1 bg-yellow-600 text-white py-2.5 sm:py-2 text-sm rounded-md hover:bg-yellow-700 font-medium"
                    >
                      🚚 Iniciar Ruta
                    </button>
                  )}
                  {guia.estado === 'en_ruta' && (
                    <>
                      <button
                        onClick={() => actualizarEstado(guia.id, 'entregada')}
                        className="flex-1 bg-green-600 text-white py-2.5 sm:py-2 text-sm rounded-md hover:bg-green-700 font-medium"
                      >
                        ✓ Entregada
                      </button>
                      <button
                        onClick={() => actualizarEstado(guia.id, 'rechazada')}
                        className="flex-1 bg-orange-600 text-white py-2.5 sm:py-2 text-sm rounded-md hover:bg-orange-700 font-medium"
                      >
                        ✗ Rechazada
                      </button>
                    </>
                  )}
                  <Link
                    href={`/dashboard/guias/${guia.id}`}
                    className="flex-1 sm:flex-none sm:w-32 bg-gray-200 text-gray-700 py-2.5 sm:py-2 text-sm rounded-md hover:bg-gray-300 text-center font-medium"
                  >
                    Ver Detalle
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}