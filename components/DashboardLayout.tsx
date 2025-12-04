'use client'

import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [forceShow, setForceShow] = useState(false)

  // Timeout de seguridad: si loading tarda más de 5 segundos, mostrar contenido de todas formas
  useEffect(() => {
    if (loading) {
      const timeoutId = setTimeout(() => {
        console.warn('Timeout en DashboardLayout - forzando mostrar contenido')
        setForceShow(true)
      }, 5000)

      return () => clearTimeout(timeoutId)
    } else {
      setForceShow(false)
    }
  }, [loading])

  useEffect(() => {
    if (!loading && !user) {
      // Usar window.location.href para forzar recarga completa y evitar pantalla en blanco
      window.location.href = '/auth/login'
    }
  }, [user, loading])

  if (loading && !forceShow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Cargando...</div>
          <div className="text-sm text-gray-500">Si esto tarda mucho, recarga la página</div>
        </div>
      </div>
    )
  }

  // Si después del timeout no hay usuario, redirigir al login
  if (forceShow && !user) {
    window.location.href = '/auth/login'
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Redirigiendo...</div>
      </div>
    )
  }

  // Si no hay usuario después de cargar, mostrar estado de carga mientras se redirige
  // Esto evita la pantalla en blanco
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Redirigiendo...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col w-full lg:ml-64">
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-800 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Dashboard</h1>
            </div>
            <button
              onClick={signOut}
              className="bg-red-600 text-white px-3 py-2 text-sm lg:px-4 lg:text-base rounded-md hover:bg-red-700 transition-colors"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}