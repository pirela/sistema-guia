'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Usuario } from '@/types/database'

interface SidebarProps {
  user: Usuario
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const adminLinks = [
    { href: '/dashboard', label: 'Inicio', icon: '🏠' },
    { href: '/dashboard/guias', label: 'Guías', icon: '📋' },
    { href: '/dashboard/guias/crear', label: 'Crear Guía', icon: '➕' },
    { href: '/dashboard/productos', label: 'Productos', icon: '📦' },
    { href: '/dashboard/inventario', label: 'Inventario', icon: '🧾' },
    { href: '/dashboard/usuarios', label: 'Usuarios', icon: '👥' },
    { href: '/dashboard/reportes', label: 'Reportes', icon: '📊' },
  ]

  const motorizadoLinks = [
    { href: '/dashboard', label: 'Inicio', icon: '🏠' },
    { href: '/dashboard/mis-guias', label: 'Mis Guías', icon: '📋' },
  ]

  const links = user.rol === 'administrador' ? adminLinks : motorizadoLinks

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-md transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Sistema de Guías</h2>
            <p className="text-sm text-gray-600">{user.nombre}</p>
            <p className="text-xs text-gray-500 capitalize">{user.rol}</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-600 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-4 py-2 rounded-md transition-colors ${
                    isActive(link.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}