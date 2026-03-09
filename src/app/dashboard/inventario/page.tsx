'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Usuario, Producto } from '@/types/database'
import { useEffect, useState } from 'react'

interface InventarioRow {
  motorizado_id: string
  producto_id: string
  cantidad: number
  fecha_actualizacion: string
  producto: { id: string; nombre: string; codigo_sku: string | null }
}

export default function InventarioPage() {
  const { user } = useAuth()
  const [motorizados, setMotorizados] = useState<Usuario[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [motorizadoId, setMotorizadoId] = useState<string>('')
  const [stock, setStock] = useState<InventarioRow[]>([])
  const [loadingMotorizados, setLoadingMotorizados] = useState(true)
  const [loadingStock, setLoadingStock] = useState(false)

  const [cargarForm, setCargarForm] = useState({
    producto_id: '',
    cantidad: '',
  })
  const [restarForm, setRestarForm] = useState({
    producto_id: '',
    cantidad: '',
    comentario: '',
  })
  const [enviandoCargar, setEnviandoCargar] = useState(false)
  const [enviandoRestar, setEnviandoRestar] = useState(false)

  useEffect(() => {
    if (user?.rol === 'administrador') {
      fetchMotorizados()
      fetchProductos()
    }
  }, [user])

  useEffect(() => {
    if (motorizadoId) {
      fetchStock()
    } else {
      setStock([])
    }
  }, [motorizadoId])

  const fetchMotorizados = async () => {
    try {
      setLoadingMotorizados(true)
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('rol', 'motorizado')
        .eq('eliminado', false)
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setMotorizados(data ?? [])
    } catch (e) {
      console.error(e)
      alert('Error al cargar motorizados')
    } finally {
      setLoadingMotorizados(false)
    }
  }

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('eliminado', false)
        .eq('activo', true)
        .order('nombre')

      if (error) throw error
      setProductos(data ?? [])
    } catch (e) {
      console.error(e)
    }
  }

  const fetchStock = async () => {
    if (!motorizadoId) return
    try {
      setLoadingStock(true)
      const res = await fetch(
        `/api/inventario?motorizado_id=${encodeURIComponent(motorizadoId)}`
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || res.statusText)
      }
      const data = await res.json()
      setStock(data)
    } catch (e) {
      console.error(e)
      alert('Error al cargar stock: ' + (e instanceof Error ? e.message : ''))
      setStock([])
    } finally {
      setLoadingStock(false)
    }
  }

  const handleCargar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !motorizadoId || !cargarForm.producto_id || !cargarForm.cantidad) {
      alert('Selecciona motorizado, producto y cantidad')
      return
    }
    const cantidad = parseInt(cargarForm.cantidad, 10)
    if (isNaN(cantidad) || cantidad < 1) {
      alert('Cantidad debe ser un número positivo')
      return
    }
    setEnviandoCargar(true)
    try {
      const res = await fetch('/api/inventario/cargar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motorizado_id: motorizadoId,
          producto_id: cargarForm.producto_id,
          cantidad,
          usuario_id: user.id,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || res.statusText)
      alert('Stock cargado correctamente')
      setCargarForm({ producto_id: '', cantidad: '' })
      fetchStock()
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Error al cargar'))
    } finally {
      setEnviandoCargar(false)
    }
  }

  const handleRestar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !motorizadoId || !restarForm.producto_id || !restarForm.cantidad) {
      alert('Selecciona motorizado, producto y cantidad')
      return
    }
    const cantidad = parseInt(restarForm.cantidad, 10)
    if (isNaN(cantidad) || cantidad < 1) {
      alert('Cantidad debe ser un número positivo')
      return
    }
    setEnviandoRestar(true)
    try {
      const res = await fetch('/api/inventario/restar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motorizado_id: motorizadoId,
          producto_id: restarForm.producto_id,
          cantidad,
          comentario: restarForm.comentario || undefined,
          usuario_id: user.id,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || res.statusText)
      alert('Stock restado correctamente')
      setRestarForm({ producto_id: '', cantidad: '', comentario: '' })
      fetchStock()
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Error al restar'))
    } finally {
      setEnviandoRestar(false)
    }
  }

  if (!user) return null
  if (user.rol !== 'administrador') {
    return (
      <DashboardLayout>
        <div className="p-4 text-gray-600">No tienes permiso para ver esta página.</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventario por motorizado</h2>

        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Motorizado
          </label>
          <select
            value={motorizadoId}
            onChange={(e) => setMotorizadoId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar motorizado</option>
            {motorizados.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        {motorizadoId && (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h3 className="px-4 py-3 font-semibold text-gray-800 border-b">
                Stock actual
              </h3>
              {loadingStock ? (
                <div className="p-6 text-center text-gray-500">Cargando...</div>
              ) : stock.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Sin stock cargado para este motorizado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Producto
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          SKU
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Cantidad
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stock.map((row) => (
                        <tr key={`${row.motorizado_id}-${row.producto_id}`}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {row.producto?.nombre ?? row.producto_id}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {row.producto?.codigo_sku ?? '—'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right font-medium">
                            {row.cantidad}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Cargar stock</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Sumar productos al inventario del motorizado.
                </p>
                <form onSubmit={handleCargar} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Producto
                    </label>
                    <select
                      value={cargarForm.producto_id}
                      onChange={(e) =>
                        setCargarForm((f) => ({ ...f, producto_id: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Seleccionar</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cargarForm.cantidad}
                      onChange={(e) =>
                        setCargarForm((f) => ({ ...f, cantidad: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={enviandoCargar}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {enviandoCargar ? 'Cargando...' : 'Cargar stock'}
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Restar manual</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Devolución, pérdida u otro motivo. Resta del stock del motorizado.
                </p>
                <form onSubmit={handleRestar} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Producto
                    </label>
                    <select
                      value={restarForm.producto_id}
                      onChange={(e) =>
                        setRestarForm((f) => ({ ...f, producto_id: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Seleccionar</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={restarForm.cantidad}
                      onChange={(e) =>
                        setRestarForm((f) => ({ ...f, cantidad: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comentario (opcional)
                    </label>
                    <input
                      type="text"
                      value={restarForm.comentario}
                      onChange={(e) =>
                        setRestarForm((f) => ({ ...f, comentario: e.target.value }))
                      }
                      placeholder="Ej. Devolución, pérdida"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={enviandoRestar}
                    className="w-full bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 disabled:opacity-50"
                  >
                    {enviandoRestar ? 'Restando...' : 'Restar stock'}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
