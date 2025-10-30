'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Producto } from '@/types/database'
import { useEffect, useState } from 'react'

export default function ProductosPage() {
  const { user } = useAuth()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [busqueda, setBusqueda] = useState('')
  
  const [formData, setFormData] = useState({
    codigo_sku: '',
    nombre: '',
    descripcion: '',
    precio: '',
  })

  useEffect(() => {
    if (user?.rol === 'administrador') {
      fetchProductos()
    }
  }, [user])

  const fetchProductos = async () => {
    try {
      const result = await cachedFetch(
        'productos',
        async () => {
          return await supabase
            .from('productos')
            .select('*')
            .eq('eliminado', false)
            .order('nombre', { ascending: true })
        }
      )

      if (result.error) throw result.error
      setProductos(result.data || [])
    } catch (error) {
      console.error('Error fetching productos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const abrirModal = (producto?: Producto) => {
    if (producto) {
      setEditingProducto(producto)
      setFormData({
        codigo_sku: producto.codigo_sku || '',
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        precio: producto.precio.toString(),
      })
    } else {
      setEditingProducto(null)
      setFormData({
        codigo_sku: '',
        nombre: '',
        descripcion: '',
        precio: '',
      })
    }
    setShowModal(true)
  }

  const cerrarModal = () => {
    setShowModal(false)
    setEditingProducto(null)
    setFormData({
      codigo_sku: '',
      nombre: '',
      descripcion: '',
      precio: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingProducto) {
        const { error } = await supabase
          .from('productos')
          .update({
            codigo_sku: formData.codigo_sku || null,
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            precio: parseFloat(formData.precio),
            actualizado_por: user?.id,
          })
          .eq('id', editingProducto.id)

        if (error) throw error
        alert('Producto actualizado exitosamente')
      } else {
        const { error } = await supabase
          .from('productos')
          .insert({
            codigo_sku: formData.codigo_sku || null,
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            precio: parseFloat(formData.precio),
            creado_por: user?.id,
          })

        if (error) throw error
        alert('Producto creado exitosamente')
      }

      clearCache('productos')
      fetchProductos()
      cerrarModal()
    } catch (error: any) {
      console.error('Error guardando producto:', error)
      alert('Error al guardar producto: ' + error.message)
    }
  }

  const toggleActivo = async (producto: Producto) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({
          activo: !producto.activo,
          actualizado_por: user?.id,
        })
        .eq('id', producto.id)

      if (error) throw error
      clearCache('productos')
      fetchProductos()
    } catch (error) {
      console.error('Error actualizando producto:', error)
      alert('Error al actualizar producto')
    }
  }

  const eliminarProducto = async (producto: Producto) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('productos')
        .update({
          eliminado: true,
          actualizado_por: user?.id,
        })
        .eq('id', producto.id)

      if (error) throw error
      alert('Producto eliminado exitosamente')
      clearCache('productos')
      fetchProductos()
    } catch (error) {
      console.error('Error eliminando producto:', error)
      alert('Error al eliminar producto')
    }
  }

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo_sku?.toLowerCase().includes(busqueda.toLowerCase())
  )
  /*
  if (!user || user.rol !== 'administrador') {
    return <div>No tienes permisos para ver esta página</div>
  }
  */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center">Cargando productos...</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Productos</h2>
            <p className="text-sm text-gray-600">{productos.length} productos registrados</p>
          </div>
          <button
            onClick={() => abrirModal()}
            className="bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-2 rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
          >
            + Crear Producto
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <input
            type="text"
            placeholder="Buscar por nombre o SKU..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
        </div>

        <div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No hay productos registrados
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((producto) => (
                  <tr key={producto.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {producto.codigo_sku || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {producto.nombre}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {producto.descripcion || 'Sin descripción'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${producto.precio.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        producto.activo 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => abrirModal(producto)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActivo(producto)}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        {producto.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => eliminarProducto(producto)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden space-y-3">
          {productosFiltrados.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No hay productos registrados
            </div>
          ) : (
            productosFiltrados.map((producto) => (
              <div key={producto.id} className="bg-white rounded-lg shadow p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{producto.nombre}</h3>
                    <p className="text-xs text-gray-500">SKU: {producto.codigo_sku || 'N/A'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                    producto.activo 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  {producto.descripcion || 'Sin descripción'}
                </div>

                <div className="text-lg font-bold text-green-600">
                  ${producto.precio.toFixed(2)}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => abrirModal(producto)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActivo(producto)}
                    className="flex-1 bg-yellow-600 text-white py-2 rounded-md hover:bg-yellow-700 text-sm font-medium"
                  >
                    {producto.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => eliminarProducto(producto)}
                    className="px-4 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 text-sm font-medium"
                  >
                    🗑️
                  </button>
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
              {editingProducto ? 'Editar Producto' : 'Crear Producto'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código SKU
                </label>
                <input
                  type="text"
                  name="codigo_sku"
                  value={formData.codigo_sku}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
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
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio *
                </label>
                <input
                  type="number"
                  name="precio"
                  value={formData.precio}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 sm:py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base font-medium"
                >
                  {editingProducto ? 'Actualizar' : 'Crear'}
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