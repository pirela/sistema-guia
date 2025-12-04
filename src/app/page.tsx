'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // El middleware debería redirigir, pero por si acaso también lo hacemos aquí
    router.push('/auth/login')
  }, [router])

  // Mostrar un estado de carga mientras se redirige
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-lg mb-2">Redirigiendo...</div>
        <div className="text-sm text-gray-500">Si esto tarda mucho, recarga la página</div>
      </div>
    </div>
  )
}