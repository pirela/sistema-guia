'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Usuario } from '@/types/database'
import { useEffect, useState } from 'react'
import { cachedFetch, clearCache } from '@/lib/supabase-cache'


export default function UsuariosPage() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null)
  const [filtroRol, setFiltroRol] = useState<string>('todos')
  
  // Estados para ordenamiento
  const [ordenarPor, setOrdenarPor] = useState<string>('nombre')
  const [ordenDireccion, setOrdenDireccion] = useState<'asc' | 'desc'>('asc')
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    nombre: '',
    rol: 'motorizado' as 'administrador' | 'motorizado',
  })

  useEffect(() => {
    if (user?.rol === 'administrador') {
      fetchUsuarios()
    }
  }, [user])

  const fetchUsuarios = async () => {
    try {
      const result = await cachedFetch(
        'usuarios',
        async () => {
          return await supabase
            .from('usuarios')
            .select('*')
            .eq('eliminado', false)
            .order('nombre', { ascending: true })
        }
      )

      if (result.error) throw result.error
      setUsuarios(result.data || [])
    } catch (error) {
      console.error('Error fetching usuarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const abrirModal = (usuario?: Usuario) => {
    if (usuario) {
      setEditingUsuario(usuario)
      setFormData({
        username: usuario.username,
        email: usuario.email,
        password: '',
        nombre: usuario.nombre,
        rol: usuario.rol,
      })
    } else {
      setEditingUsuario(null)
      setFormData({
        username: '',
        email: '',
        password: '',
        nombre: '',
        rol: 'motorizado',
      })
    }
    setShowModal(true)
  }

  const cerrarModal = () => {
    setShowModal(false)
    setEditingUsuario(null)
    setFormData({
      username: '',
      email: '',
      password: '',
      nombre: '',
      rol: 'motorizado',
    })
  }

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingUsuario) {
        const updateData: any = {
          username: formData.username,
          email: formData.email,
          nombre: formData.nombre,
          rol: formData.rol,
          actualizado_por: user?.id,
        }

        if (formData.password) {
          const { data: hashData, error: hashError } = await supabase
            .rpc('crypt', { password: formData.password, salt: await supabase.rpc('gen_salt', { type: 'bf' }) })
          
          if (hashError) throw hashError
          updateData.password_hash = hashData
        }

        const { error } = await supabase
          .from('usuarios')
          .update(updateData)
          .eq('id', editingUsuario.id)

        if (error) throw error
        alert('Usuario actualizado exitosamente')
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })

        if (authError) throw authError

        if (authData.user) {
          const { error: insertError } = await supabase
            .from('usuarios')
            .insert({
              id: authData.user.id,
              username: formData.username,
              email: formData.email,
              password_hash: '',
              nombre: formData.nombre,
              rol: formData.rol,
              creado_por: user?.id,
            })

          if (insertError) throw insertError
        }

        alert('Usuario creado exitosamente')
      }

      clearCache('usuarios')
      fetchUsuarios()
      cerrarModal()
    } catch (error: any) {
      console.error('Error guardando usuario:', error)
      alert('Error al guardar usuario: ' + error.message)
    }
  }

  
  const toggleActivo = async (usuario: Usuario) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          activo: !usuario.activo,
          actualizado_por: user?.id,
        })
        .eq('id', usuario.id)

      if (error) throw error
      clearCache('usuarios')
      fetchUsuarios()
    } catch (error) {
      console.error('Error actualizando usuario:', error)
      alert('Error al actualizar usuario')
    }
  }

  const eliminarUsuario = async (usuario: Usuario) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${usuario.nombre}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          eliminado: true,
          actualizado_por: user?.id,
        })
        .eq('id', usuario.id)

      if (error) throw error
      alert('Usuario eliminado exitosamente')
      clearCache('usuarios')
      fetchUsuarios()
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      alert('Error al eliminar usuario')
    }
  }

  // Función para ordenar los usuarios
  const ordenarUsuarios = (usuariosParaOrdenar: Usuario[]) => {
    const usuariosOrdenados = [...usuariosParaOrdenar]
    
    usuariosOrdenados.sort((a, b) => {
      let valorA: any
      let valorB: any
      
      switch (ordenarPor) {
        case 'username':
          valorA = a.username.toLowerCase()
          valorB = b.username.toLowerCase()
          break
        case 'nombre':
          valorA = a.nombre.toLowerCase()
          valorB = b.nombre.toLowerCase()
          break
        case 'email':
          valorA = a.email.toLowerCase()
          valorB = b.email.toLowerCase()
          break
        case 'rol':
          valorA = a.rol
          valorB = b.rol
          break
        case 'activo':
          valorA = a.activo ? 1 : 0
          valorB = b.activo ? 1 : 0
          break
        default:
          return 0
      }
      
      if (valorA < valorB) return ordenDireccion === 'asc' ? -1 : 1
      if (valorA > valorB) return ordenDireccion === 'asc' ? 1 : -1
      return 0
    })
    
    return usuariosOrdenados
  }

  // Filtrar y ordenar los usuarios
  const usuariosFiltrados = ordenarUsuarios(
    filtroRol === 'todos' 
      ? usuarios 
      : usuarios.filter(u => u.rol === filtroRol)
  )

  // Función para manejar el clic en el header de ordenamiento
  const handleOrdenar = (campo: string) => {
    if (ordenarPor === campo) {
      setOrdenDireccion(ordenDireccion === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdenarPor(campo)
      setOrdenDireccion('asc')
    }
  }

  // Función para obtener el icono de ordenamiento
  const getSortIcon = (campo: string) => {
    if (ordenarPor !== campo) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    if (ordenDireccion === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      )
    } else {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )
    }
  }

  const contadores = {
    todos: usuarios.length,
    administrador: usuarios.filter(u => u.rol === 'administrador').length,
    motorizado: usuarios.filter(u => u.rol === 'motorizado').length,
  }
  /*
  if (!user || user.rol !== 'administrador') {
    return <div>No tienes permisos para ver esta página</div>
  }
  */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center">Cargando usuarios...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Usuarios</h2>
            <p className="text-sm text-gray-600">{usuarios.length} usuarios registrados</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
          >
            + Crear Usuario
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <button
            onClick={() => setFiltroRol('todos')}
            className={`p-3 sm:p-4 rounded-lg text-center transition-all ${
              filtroRol === 'todos' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-xl sm:text-2xl font-bold">{contadores.todos}</p>
            <p className="text-xs sm:text-sm">Todos</p>
          </button>
          <button
            onClick={() => setFiltroRol('administrador')}
            className={`p-3 sm:p-4 rounded-lg text-center transition-all ${
              filtroRol === 'administrador' 
                ? 'bg-purple-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-xl sm:text-2xl font-bold">{contadores.administrador}</p>
            <p className="text-xs sm:text-sm">Admins</p>
          </button>
          <button
            onClick={() => setFiltroRol('motorizado')}
            className={`p-3 sm:p-4 rounded-lg text-center transition-all ${
              filtroRol === 'motorizado' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <p className="text-xl sm:text-2xl font-bold">{contadores.motorizado}</p>
            <p className="text-xs sm:text-sm">Motorizados</p>
          </button>
        </div>

        <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleOrdenar('username')}
                >
                  <div className="flex items-center gap-2">
                    Username
                    {getSortIcon('username')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleOrdenar('nombre')}
                >
                  <div className="flex items-center gap-2">
                    Nombre
                    {getSortIcon('nombre')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleOrdenar('email')}
                >
                  <div className="flex items-center gap-2">
                    Email
                    {getSortIcon('email')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleOrdenar('rol')}
                >
                  <div className="flex items-center gap-2">
                    Rol
                    {getSortIcon('rol')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleOrdenar('activo')}
                >
                  <div className="flex items-center gap-2">
                    Estado
                    {getSortIcon('activo')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {usuario.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usuario.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {usuario.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        usuario.rol === 'administrador'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {usuario.rol}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        usuario.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {usuario.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => abrirModal(usuario)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActivo(usuario)}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        {usuario.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      {usuario.rol === 'motorizado' && (
                        <button
                          onClick={() => eliminarUsuario(usuario)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden space-y-3">
          {usuariosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No hay usuarios registrados
            </div>
          ) : (
            usuariosFiltrados.map((usuario) => (
              <div key={usuario.id} className="bg-white rounded-lg shadow p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{usuario.nombre}</h3>
                    <p className="text-sm text-gray-600">@{usuario.username}</p>
                    <p className="text-xs text-gray-500">{usuario.email}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                      usuario.rol === 'administrador'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {usuario.rol}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      usuario.activo 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => abrirModal(usuario)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActivo(usuario)}
                    className="flex-1 bg-yellow-600 text-white py-2 rounded-md hover:bg-yellow-700 text-sm font-medium"
                  >
                    {usuario.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  {usuario.rol === 'motorizado' && (
                    <button
                      onClick={() => eliminarUsuario(usuario)}
                      className="px-4 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 text-sm font-medium"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
              {editingUsuario ? 'Editar Usuario' : 'Crear Usuario'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {editingUsuario && '(dejar vacío para no cambiar)'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  required={!editingUsuario}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol *
                </label>
                <select
                  name="rol"
                  value={formData.rol}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  required
                >
                  <option value="motorizado">Motorizado</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 sm:py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base font-medium"
                >
                  {editingUsuario ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="flex-1 sm:flex-none sm:px-6 bg-gray-300 text-gray-700 py-2.5 sm:py-2 rounded-md hover:bg-gray-400 text-sm sm:text-base font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}