'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Usuario } from '@/types/database'
import { cachedFetch, clearCache } from '@/lib/supabase-cache'

export function useAuth() {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
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
    }
  }, [router])

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        await fetchUserData(session.user.id)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserData = async (userId: string) => {
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
        }
      )

      if (result.error) throw result.error
      setUser(result.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching user data:', error)
      setUser(null)
      setLoading(false)
      await supabase.auth.signOut()
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