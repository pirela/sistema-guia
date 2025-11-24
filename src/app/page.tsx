'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    }
  }, [user, loading, router])

  // Mostrar un estado de carga mientras se verifica la autenticación
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-lg">Cargando...</div>
    </div>
  )
}