'use client'

import DashboardLayout from '@/components/DashboardLayout'
import ModalComentarioNovedad from '@/components/ModalComentarioNovedad'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Guia, Producto, EstadoGuia, Usuario } from '@/types/database'
import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface GuiaProducto {
  id: string
  guia_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  producto: Producto
}

interface GuiaConProductos extends Guia {
  productos?: GuiaProducto[]
  cantidad_novedades?: number
  ultimo_usuario_novedad_id?: string | null
}

const REGISTROS_POR_PAGINA = 20

const LOCALIDADES = [
  'Usaquén',
  'Chapinero',
  'Santa Fe',
  'San Cristóbal',
  'Usme',
  'Tunjuelito',
  'Bosa',
  'Kennedy',
  'Fontibón',
  'Engativá',
  'Suba',
  'Barrios Unidos',
  'Teusaquillo',
  'Los Mártires',
  'Martires',
  'Antonio Nariño',
  'Puente Aranda',
  'La Candelaria',
  'Candelaria',
  'Rafael Uribe Uribe',
  'Rafael Uribe',
  'Ciudad Bolívar',
  'Sumapaz',
  'SIN LOCALIDAD'
]

// Función para normalizar texto removiendo acentos y convirtiendo a mayúsculas
const normalizarTexto = (texto: string): string => {
  return texto
    .normalize('NFD') // Descompone caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Remueve los diacríticos (acentos)
    .toUpperCase()
}

export default function MisGuiasPage() {
  const { user, loading: authLoading } = useAuth()
  const [guias, setGuias] = useState<GuiaConProductos[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>('asignada')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>('')
  const [filtroLocalidades, setFiltroLocalidades] = useState<string[]>([])
  const [mostrarFiltroLocalidades, setMostrarFiltroLocalidades] = useState(false)
  const filtroLocalidadesRef = useRef<HTMLDivElement>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [totalGuias, setTotalGuias] = useState(0)
  const [usuarios, setUsuarios] = useState<{ [key: string]: Usuario }>({})
  const observerTarget = useRef<HTMLDivElement>(null)
  
  // Estados para modal de novedad
  const [modalNovedad, setModalNovedad] = useState({
    isOpen: false,
    guiaId: '',
    estadoAnterior: null as EstadoGuia | null,
    estadoNuevo: null as EstadoGuia | null,
    loading: false,
  })

  const fetchMisGuias = useCallback(async (pageOffset: number = 0, reset: boolean = false) => {
    if (!user?.id) return

    try {
      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      // Construir query base
      let query = supabase
        .from('guias')
        .select('*', { count: 'exact' })
        .eq('motorizado_asignado', user.id)
        .eq('eliminado', false)

      // Aplicar filtro de estado si no es 'todas'
      if (filtroEstado !== 'todas') {
        query = query.eq('estado', filtroEstado)
      } else {
        // Cuando es 'todas', excluir el estado 'finalizada' que los motorizados no deben ver
        query = query.neq('estado', 'finalizada')
      }

      // Aplicar filtro de fecha desde
      if (filtroFechaDesde) {
        query = query.gte('fecha_creacion', filtroFechaDesde + 'T00:00:00.000Z')
      }

      // Aplicar filtro de fecha hasta
      if (filtroFechaHasta) {
        query = query.lte('fecha_creacion', filtroFechaHasta + 'T23:59:59.999Z')
      }

      // Aplicar paginación
      // Nota: El filtro de localidades se aplica en el cliente después de obtener los datos
      // porque Supabase no soporta fácilmente OR con múltiples condiciones ilike
      const result = await query
        .order('fecha_creacion', { ascending: false })
        .range(pageOffset, pageOffset + REGISTROS_POR_PAGINA - 1)

      if (result.error) throw result.error

      let guiasData = result.data || []
      
      // Aplicar filtro de localidades en el cliente
      if (filtroLocalidades.length > 0) {
        const tieneSinLocalidad = filtroLocalidades.includes('SIN LOCALIDAD')
        const localidadesNormales = filtroLocalidades.filter(l => l !== 'SIN LOCALIDAD')
        const todasLasLocalidades = LOCALIDADES.filter(l => l !== 'SIN LOCALIDAD')
        
        guiasData = guiasData.filter(guia => {
          const direccionNormalizada = normalizarTexto(guia.direccion || '')
          
          if (tieneSinLocalidad && localidadesNormales.length > 0) {
            // Si hay "SIN LOCALIDAD" y otras localidades: OR
            // La guía debe contener alguna localidad normal O no contener ninguna localidad
            const contieneLocalidadNormal = localidadesNormales.some(loc => 
              direccionNormalizada.includes(normalizarTexto(loc))
            )
            const noContieneNingunaLocalidad = !todasLasLocalidades.some(loc => 
              direccionNormalizada.includes(normalizarTexto(loc))
            )
            return contieneLocalidadNormal || noContieneNingunaLocalidad
          } else if (tieneSinLocalidad) {
            // Solo "SIN LOCALIDAD": la guía NO debe contener ninguna localidad
            return !todasLasLocalidades.some(loc => 
              direccionNormalizada.includes(normalizarTexto(loc))
            )
          } else {
            // Solo localidades normales: la guía debe contener al menos una de las localidades seleccionadas
            return localidadesNormales.some(loc => 
              direccionNormalizada.includes(normalizarTexto(loc))
            )
          }
        })
      }
      
      const total = result.count || 0

      setTotalGuias(total)

      // Verificar si hay más registros
      const nextOffset = pageOffset + REGISTROS_POR_PAGINA
      setHasMore(nextOffset < total)

      // Helper para crear una promesa con timeout (funciona con cualquier promesa)
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
        return Promise.race([
          Promise.resolve(promise),
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
          )
        ])
      }

      // Obtener productos y novedades para cada guía usando Promise.allSettled para manejar errores individuales
      const resultados = await Promise.allSettled(
        guiasData.map(async (guia: Guia) => {
          try {
            // Obtener productos con timeout de 8 segundos (sin caché)
            let productosResult: { data: GuiaProducto[] | null; error: any } = { data: [], error: null }
            try {
              const productosQueryPromise = supabase
                .from('guias_productos')
                .select(`
                  *,
                  producto:productos(*)
                `)
                .eq('guia_id', guia.id)
              
              productosResult = await Promise.race([
                productosQueryPromise,
                new Promise<{ data: null; error: Error }>((_, reject) => 
                  setTimeout(() => reject(new Error(`Timeout obteniendo productos para guía ${guia.id}`)), 8000)
                )
              ]) as { data: GuiaProducto[] | null; error: any }
              
              if (productosResult.error) throw productosResult.error
            } catch (error) {
              console.error(`Error obteniendo productos para guía ${guia.id}:`, error)
              productosResult = { data: [], error: null }
            }

            // Contar novedades con timeout de 5 segundos
            let novedadesCount = 0
            try {
              const countQuery = supabase
                .from('novedades')
                .select('*', { count: 'exact', head: true })
                .eq('guia_id', guia.id)
              
              const countResult = await Promise.race([
                countQuery,
                new Promise<{ count: null; error: Error }>((_, reject) => 
                  setTimeout(() => reject(new Error(`Timeout contando novedades para guía ${guia.id}`)), 5000)
                )
              ]) as { count: number | null; error?: any }
              
              if (countResult.error) throw countResult.error
              novedadesCount = countResult?.count || 0
            } catch (error) {
              console.error(`Error contando novedades para guía ${guia.id}:`, error)
              novedadesCount = 0
            }

            // Obtener última novedad con timeout de 5 segundos
            let ultimoUsuarioNovedadId: string | null = null
            try {
              const ultimaNovedadQuery = supabase
                .from('novedades')
                .select('usuario_id')
                .eq('guia_id', guia.id)
                .order('fecha_creacion', { ascending: false })
                .limit(1)
                .maybeSingle()
              
              const ultimaNovedadResult = await Promise.race([
                ultimaNovedadQuery,
                new Promise<{ data: null; error: Error }>((_, reject) => 
                  setTimeout(() => reject(new Error(`Timeout obteniendo última novedad para guía ${guia.id}`)), 5000)
                )
              ]) as { data: { usuario_id: string } | null; error?: any }
              
              if (ultimaNovedadResult.error) throw ultimaNovedadResult.error
              ultimoUsuarioNovedadId = ultimaNovedadResult?.data?.usuario_id || null
            } catch (error) {
              console.error(`Error obteniendo última novedad para guía ${guia.id}:`, error)
              ultimoUsuarioNovedadId = null
            }

            return {
              ...guia,
              productos: productosResult.data as GuiaProducto[] || [],
              cantidad_novedades: novedadesCount,
              ultimo_usuario_novedad_id: ultimoUsuarioNovedadId,
            }
          } catch (error) {
            console.error(`Error procesando guía ${guia.id}:`, error)
            // Retornar guía con datos mínimos si hay error
            return {
              ...guia,
              productos: [],
              cantidad_novedades: 0,
              ultimo_usuario_novedad_id: null,
            }
          }
        })
      )

      // Procesar resultados de Promise.allSettled
      const guiasConProductos = resultados
        .map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value
          } else {
            console.error(`Error en guía ${guiasData[index]?.id}:`, result.reason)
            // Retornar guía con datos mínimos si falló
            return {
              ...guiasData[index],
              productos: [],
              cantidad_novedades: 0,
              ultimo_usuario_novedad_id: null,
            } as GuiaConProductos
          }
        })
        .filter(Boolean) as GuiaConProductos[]

      if (reset) {
        setGuias(guiasConProductos)
      } else {
        setGuias(prev => [...prev, ...guiasConProductos])
      }

      setOffset(nextOffset)
    } catch (error) {
      console.error('Error fetching mis guias:', error)
      // Resetear estados en caso de error para evitar estados inconsistentes
      if (reset) {
        setGuias([])
        setOffset(0)
      }
      setHasMore(false)
    } finally {
      // Siempre resetear estados de carga, incluso si hay error
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.id, filtroEstado, filtroFechaDesde, filtroFechaHasta, filtroLocalidades])

  const loadMoreGuias = useCallback(() => {
    if (!loadingMore && hasMore && user?.id) {
      fetchMisGuias(offset, false)
    }
  }, [offset, loadingMore, hasMore, user?.id, fetchMisGuias])

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('eliminado', false)

      if (error) throw error
      
      const usuariosMap: { [key: string]: Usuario } = {}
      data?.forEach((u) => {
        usuariosMap[u.id] = u
      })
      setUsuarios(usuariosMap)
    } catch (error) {
      console.error('Error fetching usuarios:', error)
    }
  }

  // Cargar usuarios al inicio
  useEffect(() => {
    if (!authLoading && user) {
      fetchUsuarios()
    }
  }, [user, authLoading])

  // Cerrar el dropdown de filtro de localidades al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtroLocalidadesRef.current && !filtroLocalidadesRef.current.contains(event.target as Node)) {
        setMostrarFiltroLocalidades(false)
      }
    }

    if (mostrarFiltroLocalidades) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mostrarFiltroLocalidades])

  // Resetear cuando cambia el filtro o cuando user está disponible
  useEffect(() => {
    if (!authLoading && user?.rol === 'motorizado') {
      setGuias([])
      setOffset(0)
      setHasMore(true)
      fetchMisGuias(0, true)
    } else if (!authLoading && !user) {
      // Si no hay usuario después de que auth termine de cargar, resetear loading
      setLoading(false)
    }
  }, [user, authLoading, filtroEstado, filtroFechaDesde, filtroFechaHasta, filtroLocalidades, fetchMisGuias])

  // Timeout de seguridad: si después de 15 segundos aún está cargando, forzar setLoading(false) y setLoadingMore(false)
  useEffect(() => {
    if ((loading || loadingMore) && !authLoading) {
      const timeoutId = setTimeout(() => {
        console.warn('Timeout en mis-guias, forzando loading y loadingMore a false')
        setLoading(false)
        setLoadingMore(false)
        // También resetear hasMore si hay timeout para evitar bucles
        setHasMore(false)
      }, 15000)

      return () => clearTimeout(timeoutId)
    }
  }, [loading, loadingMore, authLoading])

  // Intersection Observer para infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMoreGuias()
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loadingMore, loading, loadMoreGuias])

  const actualizarEstado = async (guiaId: string, nuevoEstado: EstadoGuia) => {
    // Buscar la guía actual para obtener su estado
    const guiaActual = guias.find(g => g.id === guiaId)
    const estadoAnterior = guiaActual?.estado || null

    // Verificar si necesita comentario (cambiar a novedad o desde novedad)
    const necesitaComentario = nuevoEstado === 'novedad' || estadoAnterior === 'novedad'

    if (necesitaComentario) {
      // Mostrar modal para pedir comentario
      setModalNovedad({
        isOpen: true,
        guiaId,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        loading: false,
      })
    } else {
      // Cambio normal, confirmar y proceder
      if (!confirm(`¿Confirmar cambio de estado a "${nuevoEstado}"?`)) return
      await ejecutarCambioEstado(guiaId, nuevoEstado, estadoAnterior, '')
    }
  }

  const ejecutarCambioEstado = async (
    guiaId: string,
    nuevoEstado: EstadoGuia,
    estadoAnterior: EstadoGuia | null,
    comentario: string
  ) => {
    try {
      // Actualizar estado de la guía
      const { error: errorGuia } = await supabase
        .from('guias')
        .update({ 
          estado: nuevoEstado,
          actualizado_por: user?.id,
          ...(nuevoEstado === 'entregada' ? { fecha_entrega: new Date().toISOString() } : {})
        })
        .eq('id', guiaId)

      if (errorGuia) throw errorGuia

      // Si hay comentario, guardar en tabla novedades
      if (comentario.trim() && user?.id) {
        const { error: errorNovedad } = await supabase
          .from('novedades')
          .insert({
            guia_id: guiaId,
            usuario_id: user.id,
            comentario: comentario.trim(),
            fecha_creacion: new Date().toISOString(),
          })

        if (errorNovedad) {
          console.error('Error guardando novedad:', errorNovedad)
          // No lanzar error, solo loguear, porque el cambio de estado ya se hizo
        }
      }
      
      // Refrescar contadores y recargar guías
      fetchContadores().then(setContadores)
      setGuias([])
      setOffset(0)
      setHasMore(true)
      fetchMisGuias(0, true)
      
      alert('Estado actualizado correctamente')
    } catch (error) {
      console.error('Error actualizando estado:', error)
      alert('Error al actualizar estado')
    }
  }

  const handleConfirmarNovedad = async (comentario: string) => {
    setModalNovedad(prev => ({ ...prev, loading: true }))
    
    await ejecutarCambioEstado(
      modalNovedad.guiaId,
      modalNovedad.estadoNuevo!,
      modalNovedad.estadoAnterior,
      comentario
    )

    setModalNovedad({
      isOpen: false,
      guiaId: '',
      estadoAnterior: null,
      estadoNuevo: null,
      loading: false,
    })
  }

  const getEstadoColor = (estado: string) => {
    const colors: { [key: string]: string } = {
      pendiente: 'bg-gray-100 text-gray-800',
      asignada: 'bg-blue-100 text-blue-800',
      en_ruta: 'bg-yellow-100 text-yellow-800',
      entregada: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800',
      rechazada: 'bg-orange-100 text-orange-800',
      novedad: 'bg-pink-100 text-pink-800',
    }
    return colors[estado] || 'bg-gray-100 text-gray-800'
  }

  // Obtener contadores totales (sin paginación)
  const fetchContadores = async (): Promise<{ todas: number; pendiente: number; asignada: number; en_ruta: number; entregada: number; rechazada: number; cancelada: number; novedad: number }> => {
    if (!user?.id) return { todas: 0, pendiente: 0, asignada: 0, en_ruta: 0, entregada: 0, rechazada: 0, cancelada: 0, novedad: 0 }

    try {
      const estados = ['pendiente', 'asignada', 'en_ruta', 'entregada', 'rechazada', 'cancelada', 'novedad'] as const
      const contadores: { todas: number; pendiente: number; asignada: number; en_ruta: number; entregada: number; rechazada: number; cancelada: number; novedad: number } = { 
        todas: 0, 
        pendiente: 0,
        asignada: 0, 
        en_ruta: 0, 
        entregada: 0, 
        rechazada: 0,
        cancelada: 0,
        novedad: 0 
      }

      // Contar todas (excluyendo 'finalizada' que los motorizados no deben ver)
      const { count: total } = await supabase
        .from('guias')
        .select('*', { count: 'exact', head: true })
        .eq('motorizado_asignado', user.id)
        .eq('eliminado', false)
        .neq('estado', 'finalizada')

      contadores.todas = total || 0

      // Contar por estado
      for (const estado of estados) {
        const { count } = await supabase
          .from('guias')
          .select('*', { count: 'exact', head: true })
          .eq('motorizado_asignado', user.id)
          .eq('estado', estado)
          .eq('eliminado', false)

        contadores[estado] = count || 0
      }

      return contadores
    } catch (error) {
      console.error('Error fetching contadores:', error)
      return { todas: 0, pendiente: 0, asignada: 0, en_ruta: 0, entregada: 0, rechazada: 0, cancelada: 0, novedad: 0 }
    }
  }

  const [contadores, setContadores] = useState({
    todas: 0,
    pendiente: 0,
    asignada: 0,
    en_ruta: 0,
    entregada: 0,
    rechazada: 0,
    cancelada: 0,
    novedad: 0,
  })

  const [contadoresLocalidades, setContadoresLocalidades] = useState<{ [key: string]: number }>({})

  // Obtener contadores por localidad
  const fetchContadoresLocalidades = useCallback(async (): Promise<{ [key: string]: number }> => {
    if (!user?.id) return {}

    try {
      // Obtener todas las guías del motorizado (sin paginación, pero respetando filtros de fecha y estado)
      let query = supabase
        .from('guias')
        .select('direccion')
        .eq('motorizado_asignado', user.id)
        .eq('eliminado', false)

      // Aplicar filtro de estado si no es 'todas'
      if (filtroEstado !== 'todas') {
        query = query.eq('estado', filtroEstado)
      } else {
        // Cuando es 'todas', excluir el estado 'finalizada' que los motorizados no deben ver
        query = query.neq('estado', 'finalizada')
      }

      // Aplicar filtro de fecha desde
      if (filtroFechaDesde) {
        query = query.gte('fecha_creacion', filtroFechaDesde + 'T00:00:00.000Z')
      }

      // Aplicar filtro de fecha hasta
      if (filtroFechaHasta) {
        query = query.lte('fecha_creacion', filtroFechaHasta + 'T23:59:59.999Z')
      }

      const { data: guiasData, error } = await query

      if (error) throw error

      const contadores: { [key: string]: number } = {}
      const todasLasLocalidades = LOCALIDADES.filter(l => l !== 'SIN LOCALIDAD')

      // Inicializar contadores
      LOCALIDADES.forEach(localidad => {
        contadores[localidad] = 0
      })

      // Contar por localidad
      if (guiasData) {
        guiasData.forEach(guia => {
          const direccionNormalizada = normalizarTexto(guia.direccion || '')
          let encontrada = false

          // Buscar en cada localidad normal (usando normalización sin acentos)
          todasLasLocalidades.forEach(localidad => {
            if (direccionNormalizada.includes(normalizarTexto(localidad))) {
              contadores[localidad]++
              encontrada = true
            }
          })

          // Si no se encontró ninguna localidad, cuenta como "SIN LOCALIDAD"
          if (!encontrada) {
            contadores['SIN LOCALIDAD']++
          }
        })
      }

      return contadores
    } catch (error) {
      console.error('Error fetching contadores localidades:', error)
      return {}
    }
  }, [user?.id, filtroEstado, filtroFechaDesde, filtroFechaHasta])

  useEffect(() => {
    if (user?.rol === 'motorizado') {
      fetchContadores().then(setContadores)
      fetchContadoresLocalidades().then(setContadoresLocalidades)
    }
  }, [user, fetchContadoresLocalidades])
  /*
  if (!user || user.rol !== 'motorizado') {
    return <div>No tienes permisos para ver esta página</div>
  }
  */
  // Mostrar loading solo si auth está cargando o si estamos cargando datos iniciales
  if (authLoading || (loading && guias.length === 0)) {
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
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Mis Guías Asignadas</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gestiona tus entregas</p>
        </div>

        {/* Filtros Minimalistas */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Filtro por Estado - Minimalista */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 whitespace-nowrap">Estado:</span>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setFiltroEstado('todas')}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    filtroEstado === 'todas' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas ({contadores.todas})
                </button>
                <button
                  onClick={() => setFiltroEstado('pendiente')}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    filtroEstado === 'pendiente' 
                      ? 'bg-gray-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pendientes ({contadores.pendiente})
                </button>
                <button
                  onClick={() => setFiltroEstado('asignada')}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    filtroEstado === 'asignada' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Asignadas ({contadores.asignada})
                </button>
                <button
                  onClick={() => setFiltroEstado('en_ruta')}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    filtroEstado === 'en_ruta' 
                      ? 'bg-yellow-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  En Ruta ({contadores.en_ruta})
                </button>
                <button
                  onClick={() => setFiltroEstado('entregada')}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    filtroEstado === 'entregada' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Entregadas ({contadores.entregada})
                </button>
                <button
                  onClick={() => setFiltroEstado('rechazada')}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    filtroEstado === 'rechazada' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Rechazadas ({contadores.rechazada})
                </button>
                <button
                  onClick={() => setFiltroEstado('cancelada')}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    filtroEstado === 'cancelada' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Canceladas ({contadores.cancelada})
                </button>
                <button
                  onClick={() => setFiltroEstado('novedad')}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    filtroEstado === 'novedad' 
                      ? 'bg-pink-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Novedad ({contadores.novedad})
                </button>
              </div>
            </div>

            {/* Filtro por Fecha */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 whitespace-nowrap">Fecha:</span>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Desde"
                />
                <span className="text-xs text-gray-400">-</span>
                <input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Hasta"
                />
                {(filtroFechaDesde || filtroFechaHasta) && (
                  <button
                    onClick={() => {
                      setFiltroFechaDesde('')
                      setFiltroFechaHasta('')
                    }}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                    title="Limpiar fechas"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filtro por Localidad */}
            <div className="flex items-center gap-2 flex-wrap relative" ref={filtroLocalidadesRef}>
              <span className="text-xs text-gray-500 whitespace-nowrap">Localidad:</span>
              <button
                type="button"
                onClick={() => setMostrarFiltroLocalidades(!mostrarFiltroLocalidades)}
                className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center gap-1"
              >
                <span>
                  {filtroLocalidades.length === 0 
                    ? 'Todas' 
                    : filtroLocalidades.length === 1 
                    ? filtroLocalidades[0] 
                    : `${filtroLocalidades.length} seleccionadas`}
                </span>
                <svg
                  className={`w-3 h-3 text-gray-500 transition-transform ${mostrarFiltroLocalidades ? 'transform rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {mostrarFiltroLocalidades && (
                <div className="absolute z-20 top-full left-0 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-auto">
                  <div className="p-2 space-y-1">
                    {LOCALIDADES.map((localidad) => (
                      <label
                        key={localidad}
                        className="flex items-center justify-between space-x-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="checkbox"
                            checked={filtroLocalidades.includes(localidad)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFiltroLocalidades([...filtroLocalidades, localidad])
                              } else {
                                setFiltroLocalidades(filtroLocalidades.filter(l => l !== localidad))
                              }
                            }}
                            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-700">{localidad}</span>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">
                          ({contadoresLocalidades[localidad] || 0})
                        </span>
                      </label>
                    ))}
                    {filtroLocalidades.length > 0 && (
                      <div className="pt-1.5 border-t border-gray-200 mt-1">
                        <button
                          type="button"
                          onClick={() => setFiltroLocalidades([])}
                          className="w-full text-xs text-blue-600 hover:text-blue-800 text-center py-1"
                        >
                          Limpiar filtros
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {filtroLocalidades.length > 0 && (
                <button
                  onClick={() => setFiltroLocalidades([])}
                  className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                  title="Limpiar localidades"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {filtroLocalidades.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-200">
              {filtroLocalidades.map((localidad) => (
                <span
                  key={localidad}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {localidad}
                  <button
                    type="button"
                    onClick={() => setFiltroLocalidades(filtroLocalidades.filter(l => l !== localidad))}
                    className="ml-1.5 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Contador Total */}
        <div className="flex items-center justify-end">
          <div className="bg-blue-50 border border-blue-200 rounded px-3 py-1.5">
            <p className="text-xs text-blue-600">Total: <span className="font-bold text-blue-700">{totalGuias}</span></p>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {loading && guias.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-white rounded-lg">
              Cargando guías...
            </div>
          ) : guias.length === 0 ? (
            <div className="text-center text-gray-500 py-8 bg-white rounded-lg">
              No hay guías {filtroEstado !== 'todas' && `en estado "${filtroEstado}"`}
            </div>
          ) : (
            <>
              {guias.map((guia) => (
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

                <div className="flex flex-col sm:flex-row gap-2">
                  {guia.estado === 'asignada' && (
                    <>
                      <button
                        onClick={() => actualizarEstado(guia.id, 'en_ruta')}
                        className="flex-1 bg-yellow-600 text-white py-2.5 sm:py-2 text-sm rounded-md hover:bg-yellow-700 font-medium"
                      >
                        🚚 Iniciar Ruta
                      </button>
                      <button
                        onClick={() => actualizarEstado(guia.id, 'novedad')}
                        className="flex-1 bg-pink-600 text-white py-2.5 sm:py-2 text-sm rounded-md hover:bg-pink-700 font-medium"
                      >
                        ⚠️ Reportar Novedad
                      </button>
                    </>
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
                      <button
                        onClick={() => actualizarEstado(guia.id, 'novedad')}
                        className="flex-1 bg-pink-600 text-white py-2.5 sm:py-2 text-sm rounded-md hover:bg-pink-700 font-medium"
                      >
                        ⚠️ Reportar Novedad
                      </button>
                    </>
                  )}
                  {guia.estado === 'novedad' && (
                    <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 py-3 px-4 rounded-md text-sm">
                      <p className="font-medium">⚠️ Guía en estado Novedad</p>
                      <p className="text-xs mt-1">Solo un administrador puede cambiar el estado de esta guía.</p>
                    </div>
                  )}
                  <Link
                    href={`/dashboard/guias/${guia.id}`}
                    className="flex-1 sm:flex-none sm:w-32 bg-gray-200 text-gray-700 py-2.5 sm:py-2 text-sm rounded-md hover:bg-gray-300 text-center font-medium"
                  >
                    Ver Detalle
                  </Link>
                </div>
              </div>
              ))}

              {/* Indicador de carga y trigger para infinite scroll */}
              <div ref={observerTarget} className="py-4">
                {loadingMore && (
                  <div className="text-center text-gray-500 py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    <p className="mt-2 text-sm">Cargando más guías...</p>
                  </div>
                )}
                {!hasMore && guias.length > 0 && (
                  <div className="text-center text-gray-500 py-4 text-sm">
                    No hay más guías para mostrar
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

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