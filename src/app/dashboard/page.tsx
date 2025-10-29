'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-lg">Cargando...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  const adminCards = [
    { title: 'Guías', icon: '📋', href: '/dashboard/guias', color: 'bg-blue-500' },
    { title: 'Crear Guía', icon: '➕', href: '/dashboard/guias/crear', color: 'bg-green-500' },
    { title: 'Productos', icon: '📦', href: '/dashboard/productos', color: 'bg-purple-500' },
    { title: 'Usuarios', icon: '👥', href: '/dashboard/usuarios', color: 'bg-orange-500' },
    { title: 'Reportes', icon: '📊', href: '/dashboard/reportes', color: 'bg-pink-500' },
  ]

  const motorizadoCards = [
    { title: 'Mis Guías', icon: '📋', href: '/dashboard/mis-guias', color: 'bg-blue-500' },
  ]

  const cards = user.rol === 'administrador' ? adminCards : motorizadoCards

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            Bienvenido, {user.nombre}
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Rol: <span className="font-semibold capitalize">{user.rol}</span>
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 sm:p-6 flex flex-col items-center justify-center text-center group"
            >
              <div className={`${card.color} w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform`}>
                {card.icon}
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                {card.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}