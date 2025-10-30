'use client'

import { cachedFetch, clearCache } from '@/lib/supabase-cache'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Usuario, Producto } from '@/types/database'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import ImportarOrdenShopify from '@/components/ImportarOrdenShopify'

interface ProductoSeleccionado {
  producto_id: string
  cantidad: number
  nombre: string
}

export default function CrearGuiaPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [motorizados, setMotorizados] = useState<Usuario[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([])

  const [formData, setFormData] = useState({
    nombre_cliente: '',
    telefono_cliente: '',
    direccion: '',
    observacion: '',
    motorizado_asignado: '',
    monto_recaudar: '',
  })

  useEffect(() => {
    if (user?.rol === 'administrador') {
      fetchMotorizados()
      fetchProductos()
    }
  }, [user])

  const fetchMotorizados = async () => {
    try {
      const result = await cachedFetch(
        'motorizados-activos',
        async () => {
          return await supabase
            .from('usuarios')
            .select('*')
            .eq('rol', 'motorizado')
            .eq('activo', true)
            .eq('eliminado', false)
        }
      )

      if (result.error) throw result.error
      setMotorizados(result.data || [])
    } catch (error) {
      console.error('Error fetching motorizados:', error)
    }
  }

  const fetchProductos = async () => {
    try {
      const result = await cachedFetch(
        'productos-activos',
        async () => {
          return await supabase
            .from('productos')
            .select('*')
            .eq('activo', true)
            .eq('eliminado', false)
        }
      )

      if (result.error) throw result.error
      setProductos(result.data || [])
    } catch (error) {
      console.error('Error fetching productos:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const agregarProducto = (productoId: string) => {
    const producto = productos.find(p => p.id === productoId)
    if (!producto) return

    const yaExiste = productosSeleccionados.find(p => p.producto_id === productoId)
    if (yaExiste) {
      alert('Este producto ya está agregado')
      return
    }

    setProductosSeleccionados([
      ...productosSeleccionados,
      {
        producto_id: productoId,
        cantidad: 1,
        nombre: producto.nombre
      }
    ])
  }

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    setProductosSeleccionados(
      productosSeleccionados.map(p =>
        p.producto_id === productoId ? { ...p, cantidad } : p
      )
    )
  }

  const eliminarProducto = (productoId: string) => {
    setProductosSeleccionados(
      productosSeleccionados.filter(p => p.producto_id !== productoId)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.motorizado_asignado) {
        alert('Debes seleccionar un motorizado')
        return
      }

      if (productosSeleccionados.length === 0) {
        alert('Debes agregar al menos un producto')
        return
      }

      const { data: guiaData, error: guiaError } = await supabase
        .from('guias')
        .insert({
          nombre_cliente: formData.nombre_cliente,
          telefono_cliente: formData.telefono_cliente,
          direccion: formData.direccion,
          observacion: formData.observacion || null,
          motorizado_asignado: formData.motorizado_asignado,
          monto_recaudar: parseFloat(formData.monto_recaudar),
          creado_por: user?.id,
          numero_guia: ''
        })
        .select()
        .single()

      if (guiaError) throw guiaError

      const productosInsert = productosSeleccionados.map(p => ({
        guia_id: guiaData.id,
        producto_id: p.producto_id,
        cantidad: p.cantidad
      }))

      const { error: productosError } = await supabase
        .from('guias_productos')
        .insert(productosInsert)

      if (productosError) throw productosError

      clearCache('guias')
      alert('Guía creada exitosamente')
      router.push('/dashboard/guias')
    } catch (error: any) {
      console.error('Error creando guía:', error)
      alert('Error al crear guía: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  /*
  if (!user || user.rol !== 'administrador') {
    return <div>No tienes permisos para ver esta página</div>
  }
  */
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Crear Nueva Guía</h2>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
  <ImportarOrdenShopify />
  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
        <span className="text-2xl text-white">📝</span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-gray-800">Crear Manualmente</h3>
        <p className="text-sm text-gray-600">Completa el formulario abajo</p>
      </div>
    </div>
  </div>
</div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                name="nombre_cliente"
                value={formData.nombre_cliente}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono del Cliente *
              </label>
              <input
                type="text"
                name="telefono_cliente"
                value={formData.telefono_cliente}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección *
            </label>
            <textarea
              name="direccion"
              value={formData.direccion}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              name="observacion"
              value={formData.observacion}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motorizado Asignado *
              </label>
              <select
                name="motorizado_asignado"
                value={formData.motorizado_asignado}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar motorizado</option>
                {motorizados.map((motorizado) => (
                  <option key={motorizado.id} value={motorizado.id}>
                    {motorizado.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto a Recaudar *
              </label>
              <input
                type="number"
                name="monto_recaudar"
                value={formData.monto_recaudar}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="border-t pt-4 sm:pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agregar Producto
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    agregarProducto(e.target.value)
                    e.target.value = ''
                  }
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar producto</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} - ${producto.precio}
                  </option>
                ))}
              </select>
            </div>

            {productosSeleccionados.length > 0 && (
              <div className="space-y-2">
                {productosSeleccionados.map((producto) => (
                  <div key={producto.producto_id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-gray-50 p-3 rounded-md">
                    <span className="flex-1 font-medium text-sm sm:text-base">{producto.nombre}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={producto.cantidad}
                        onChange={(e) => actualizarCantidad(producto.producto_id, parseInt(e.target.value))}
                        min="1"
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => eliminarProducto(producto.producto_id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 bg-blue-600 text-white py-2.5 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Creando...' : 'Crear Guía'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard/guias')}
              className="w-full sm:w-auto px-6 bg-gray-300 text-gray-700 py-2.5 rounded-md hover:bg-gray-400 font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}