'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Usuario } from '@/types/database'

export function useAuth() {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Función para obtener datos del usuario (sin caché)
  const fetchUserData = async (userId: string, isMounted: () => boolean) => {
    try {
      // Timeout de seguridad para fetchUserData
      const fetchTimeoutId = setTimeout(() => {
        if (isMounted()) {
          console.warn('Timeout en fetchUserData, forzando loading a false')
          setLoading(false)
        }
      }, 5000)

      // Obtener datos del usuario directamente sin caché
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .eq('activo', true)
        .eq('eliminado', false)
        .single()

      clearTimeout(fetchTimeoutId)

      if (error) {
        throw error
      }

      if (isMounted()) {
        setUser(data)
        setLoading(false)
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error)
      
      if (isMounted()) {
        setUser(null)
        setLoading(false)
        
        // Si el error indica que el usuario no existe o no está activo, cerrar sesión
        if (error?.code === 'PGRST116' || // No encontrado
            error?.message?.includes('No rows returned') ||
            error?.code === '23505') { // Violación de constraint
          await supabase.auth.signOut()
          router.push('/auth/login')
        } else {
          // Para otros errores, también cerrar sesión por seguridad
          await supabase.auth.signOut()
          router.push('/auth/login')
        }
      }
    }
  }

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null

    const isMounted = () => mounted

    const checkUser = async () => {
      try {
        // Timeout de seguridad: máximo 5 segundos para verificar sesión
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Timeout en checkUser, forzando loading a false')
            setLoading(false)
          }
        }, 5000)

        // Verificar sesión actual
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error obteniendo sesión:', sessionError)
          if (mounted) {
            setUser(null)
            setLoading(false)
            await supabase.auth.signOut()
            router.push('/auth/login')
          }
          return
        }

        // Validar si la sesión existe y no está expirada
        if (!session) {
          if (mounted) {
            setUser(null)
            setLoading(false)
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
            router.push('/auth/login')
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
            router.push('/auth/login')
          } catch (signOutError) {
            console.error('Error al cerrar sesión:', signOutError)
          }
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Verificar usuario al montar
    checkUser()

    // Listener para cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_IN' && session) {
          // Verificar que el token no esté expirado
          const now = Math.floor(Date.now() / 1000)
          if (session.expires_at && session.expires_at < now) {
            console.warn('Token expirado en SIGNED_IN, cerrando sesión')
            setUser(null)
            setLoading(false)
            await supabase.auth.signOut()
            router.push('/auth/login')
            return
          }
          await fetchUserData(session.user.id, isMounted)
        } else if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            setUser(null)
            setLoading(false)
            router.push('/auth/login')
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
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setLoading(false)
    router.push('/auth/login')
  }

  return { user, loading, signIn, signOut }
}