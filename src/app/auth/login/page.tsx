'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()

  // Verificar si ya hay una sesión activa (sin usar useAuth para evitar bucles)
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout | null = null

    const checkSession = async () => {
      try {
        // Timeout de seguridad: máximo 3 segundos
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Timeout verificando sesión en login')
            setCheckingSession(false)
          }
        }, 3000)

        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        if (error) {
          console.error('Error verificando sesión:', error)
          if (mounted) {
            setCheckingSession(false)
          }
          return
        }

        if (session) {
          if (mounted) {
            router.push('/dashboard')
          }
        } else {
          if (mounted) {
            setCheckingSession(false)
          }
        }
      } catch (err) {
        console.error('Error verificando sesión:', err)
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        if (mounted) {
          setCheckingSession(false)
        }
      }
    }
    
    checkSession()

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        // Manejo especial para rate limit
        if (authError.code === 'over_request_rate_limit' || authError.message?.includes('rate limit')) {
          setError('Demasiados intentos. Por favor espera unos segundos antes de intentar nuevamente.')
          // Esperar 5 segundos antes de permitir otro intento
          await new Promise(resolve => setTimeout(resolve, 5000))
        } else {
          throw authError
        }
        return
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="text-center">
          <div className="text-lg mb-2">Verificando sesión...</div>
          <div className="text-sm text-gray-500 mb-4">Si esto tarda mucho, puedes continuar</div>
          <button
            onClick={() => setCheckingSession(false)}
            className="text-blue-600 hover:text-blue-800 underline text-sm"
          >
            Continuar al formulario de login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Sistema de Guías</h1>
          <p className="text-sm text-gray-600 mt-2">Ingresa tus credenciales</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 text-base font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        <div className='flex justify-center mt-4'>
          <span className="text-xs text-gray-500 text-center"> Versión 24-11-25 02 </span>
        </div>
      </div>
    </div>
  )
}