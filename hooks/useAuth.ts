'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Usuario } from '@/types/database'
import { cachedFetch, clearCache } from '@/lib/supabase-cache'

export function useAuth() {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const checkingRef = useRef(false)
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (checkingRef.current) return
    checkingRef.current = true
    
    checkUser()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          await fetchUserData(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
          clearCache()
          router.push('/auth/login')
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
      checkingRef.current = false
    }
  }, [])

  const checkUser = async () => {
    // Timeout de seguridad: si después de 10 segundos aún está cargando, forzar setLoading(false)
    const timeoutId = setTimeout(() => {
      console.warn('Timeout en checkUser, forzando loading a false')
      setLoading(false)
    }, 10000)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        await fetchUserData(session.user.id)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Error checking user:', error)
      setLoading(false)
    } finally {
      clearTimeout(timeoutId)
      // Asegurar que loading siempre se setee a false
      setLoading(false)
    }
  }

  const fetchUserData = async (userId: string) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    
    // Timeout de seguridad para fetchUserData
    const timeoutId = setTimeout(() => {
      console.warn('Timeout en fetchUserData, forzando loading a false')
      setLoading(false)
      fetchingRef.current = false
    }, 10000)
    
    try {
      const result = await cachedFetch(
        `user-${userId}`,
        async () => {
          return await supabase
            .from('usuarios')
            .select('*')
            .eq('id', userId)
            .eq('activo', true)
            .eq('eliminado', false)
            .single()
        },
        60000 // 60 segundos de caché para datos de usuario
      )

      if (result.error) throw result.error
      setUser(result.data)
      setLoading(false)
      clearTimeout(timeoutId)
    } catch (error: any) {
      console.error('Error fetching user data:', error)
      clearTimeout(timeoutId)
      
      // Si es rate limit, esperar antes de hacer signOut
      if (error?.code === 'over_request_rate_limit' || error?.message?.includes('rate limit')) {
        console.warn('Rate limit alcanzado, esperando antes de reintentar...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
      
      setUser(null)
      setLoading(false)
      
      // Solo hacer signOut si no es rate limit
      if (error?.code !== 'over_request_rate_limit' && !error?.message?.includes('rate limit')) {
        await supabase.auth.signOut()
      }
    } finally {
      fetchingRef.current = false
      // Asegurar que loading siempre se setee a false
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    if (data.user) {
      await fetchUserData(data.user.id)
    }
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    clearCache()
    router.push('/auth/login')
  }

  return { user, loading, signIn, signOut }
}