'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Usuario } from '@/types/database'

export function useAuth() {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const isSigningOutRef = useRef(false) // Bandera para evitar conflictos con el listener

  // Función para obtener datos del usuario (sin caché)
  const fetchUserData = async (userId: string, isMounted: () => boolean) => {
    let fetchTimeoutId: NodeJS.Timeout | null = null
    let timedOut = false

    try {
      // Timeout de seguridad para fetchUserData - más corto para evitar esperas largas
      fetchTimeoutId = setTimeout(() => {
        if (isMounted() && !timedOut) {
          timedOut = true
          console.warn('Timeout en fetchUserData después de 3 segundos')
          // Verificar sesión antes de decidir qué hacer
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (isMounted()) {
              if (!session) {
                setUser(null)
                setLoading(false)
                window.location.href = '/auth/login'
              } else {
                // Si hay sesión pero no pudimos obtener datos del usuario,
                // establecer loading=false para que la UI pueda manejar el estado
                setUser(null)
                setLoading(false)
                // Redirigir al login ya que no podemos obtener los datos del usuario
                window.location.href = '/auth/login'
              }
            }
          }).catch(() => {
            if (isMounted()) {
              setUser(null)
              setLoading(false)
              window.location.href = '/auth/login'
            }
          })
        }
      }, 3000)

      // Obtener datos del usuario directamente sin caché
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .eq('activo', true)
        .eq('eliminado', false)
        .single()

      // Si ya hubo timeout, no procesar la respuesta
      if (timedOut) {
        return
      }

      if (fetchTimeoutId) {
        clearTimeout(fetchTimeoutId)
      }

      if (error) {
        throw error
      }

      if (isMounted() && !timedOut) {
        setUser(data)
        setLoading(false)
      }
    } catch (error: any) {
      // Si ya hubo timeout, no hacer nada más
      if (timedOut) {
        return
      }

      if (fetchTimeoutId) {
        clearTimeout(fetchTimeoutId)
      }

      console.error('Error fetching user data:', error)
      
      if (isMounted()) {
        // Cerrar sesión y limpiar estados
        try {
          await supabase.auth.signOut()
        } catch (signOutError) {
          console.error('Error al cerrar sesión:', signOutError)
        }
        setUser(null)
        setLoading(false)
        
        // Redirigir al login
        window.location.href = '/auth/login'
      }
    }
  }

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null

    const isMounted = () => mounted

    const checkUser = async () => {
      try {
        // Timeout de seguridad: máximo 4 segundos para verificar sesión
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Timeout en checkUser después de 4 segundos')
            // Si hay timeout, establecer loading=false y redirigir al login
            // para evitar que la página se quede cargando indefinidamente
            setUser(null)
            setLoading(false)
            // Intentar verificar sesión una vez más antes de redirigir
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (!session && mounted) {
                window.location.href = '/auth/login'
              }
            }).catch(() => {
              if (mounted) {
                window.location.href = '/auth/login'
              }
            })
          }
        }, 4000)

        // Verificar sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error obteniendo sesión:', sessionError)
          if (mounted) {
            setUser(null)
            setLoading(false)
            await supabase.auth.signOut()
            window.location.href = '/auth/login'
          }
          return
        }

        // Validar si la sesión existe y no está expirada
        if (!session) {
          if (mounted) {
            setUser(null)
            setLoading(false)
            // Si no hay sesión, redirigir al login
            window.location.href = '/auth/login'
          }
          return
        }

        // Verificar si el token está expirado
        const now = Math.floor(Date.now() / 1000)
        if (session.expires_at && session.expires_at < now) {
          console.warn('Token expirado, cerrando sesión')
          if (mounted) {
            setUser(null)
            setLoading(false)
            await supabase.auth.signOut()
            window.location.href = '/auth/login'
          }
          return
        }

        // Si hay sesión válida, obtener datos del usuario
        await fetchUserData(session.user.id, isMounted)
      } catch (error) {
        console.error('Error checking user:', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
          // Si hay error, cerrar sesión y redirigir
          try {
            await supabase.auth.signOut()
          } catch (signOutError) {
            console.error('Error al cerrar sesión:', signOutError)
          }
          window.location.href = '/auth/login'
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        // No establecer loading=false en el finally si ya se redirigió
        // El loading se maneja en cada caso específico
      }
    }

    // Verificar usuario al montar
    checkUser()

    // Listener para cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        // Si estamos haciendo logout manual, ignorar el evento del listener
        // para evitar conflictos y múltiples redirecciones
        if (isSigningOutRef.current && event === 'SIGNED_OUT') {
          return
        }

        if (event === 'SIGNED_IN' && session) {
          // Verificar que el token no esté expirado
          const now = Math.floor(Date.now() / 1000)
          if (session.expires_at && session.expires_at < now) {
            console.warn('Token expirado en SIGNED_IN, cerrando sesión')
            setUser(null)
            setLoading(false)
            await supabase.auth.signOut()
            window.location.href = '/auth/login'
            return
          }
          await fetchUserData(session.user.id, isMounted)
        } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            setUser(null)
            setLoading(false)
            // Solo redirigir si no estamos haciendo logout manual
            if (!isSigningOutRef.current) {
              window.location.href = '/auth/login'
            }
          } else if (event === 'TOKEN_REFRESHED' && session) {
            // Si el token se refrescó, verificar que el usuario siga siendo válido
            await fetchUserData(session.user.id, isMounted)
          }
        } else if (event === 'USER_UPDATED' && session) {
          // Si el usuario se actualizó, refrescar datos
          await fetchUserData(session.user.id, isMounted)
        }
      }
    )

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      subscription.unsubscribe()
    }
  }, [router])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    
    if (data.user && data.session) {
      // Verificar que el token no esté expirado
      const now = Math.floor(Date.now() / 1000)
      if (data.session.expires_at && data.session.expires_at < now) {
        throw new Error('La sesión expiró inmediatamente')
      }
      
      // Obtener datos del usuario usando la función fetchUserData
      await fetchUserData(data.user.id, () => true)
    }
    
    return data
  }

  const signOut = async () => {
    try {
      // Marcar que estamos haciendo logout manual para evitar conflictos con el listener
      isSigningOutRef.current = true
      setLoading(true)
      
      // Cerrar sesión en Supabase
      const { error: signOutError } = await supabase.auth.signOut()
      
      if (signOutError) {
        console.error('Error al cerrar sesión:', signOutError)
      }
      
      // Esperar un momento para asegurar que el logout se propague
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Verificar una vez más que la sesión se cerró
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Si aún hay sesión, forzar cierre nuevamente
        await supabase.auth.signOut()
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      // Limpiar estados locales
      setUser(null)
      setLoading(false)
      
      // Usar window.location.href para forzar recarga completa
      // Esto evita problemas con el middleware y Next.js router
      window.location.href = '/auth/login'
      
    } catch (error) {
      console.error('Error en signOut:', error)
      // En caso de error, limpiar estados y forzar redirección
      setUser(null)
      setLoading(false)
      window.location.href = '/auth/login'
    } finally {
      // Resetear la bandera después de un momento (por si acaso)
      setTimeout(() => {
        isSigningOutRef.current = false
      }, 1000)
    }
  }

  return { user, loading, signIn, signOut }
}