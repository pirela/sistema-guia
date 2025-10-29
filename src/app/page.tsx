'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Bienvenido
          </h3>
          <p className="text-3xl font-bold text-blue-600">{user.nombre}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Rol</h3>
          <p className="text-3xl font-bold text-green-600 capitalize">
            {user.rol}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Estado</h3>
          <p className="text-3xl font-bold text-purple-600">
            {user.activo ? 'Activo' : 'Inactivo'}
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}