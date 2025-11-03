'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function ImportarOrdenShopify() {
  const { user } = useAuth()
  const router = useRouter()
  const [orderNumber, setOrderNumber] = useState('')
  const [importando, setImportando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null)

  const handleImportar = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orderNumber.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ingresa un número de orden' })
      return
    }

    setImportando(true)
    setMensaje(null)

    try {
      const response = await fetch('/api/shopify/importar-orden', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          userId: user?.id
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMensaje({ tipo: 'success', texto: data.mensaje })
        setOrderNumber('')
        /*
        setTimeout(() => {
          router.push(`/dashboard/guias/${data.guia.id}`)
        }, 1500)
        */
      } else {
        setMensaje({ tipo: 'error', texto: data.error })
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje({ tipo: 'error', texto: 'Error al importar la orden ...' })
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <span className="text-2xl">🛍️</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Importar desde Shopify</h3>
          <p className="text-sm text-gray-600">Crea una guía desde una orden de Shopify</p>
        </div>
      </div>

      <form onSubmit={handleImportar} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Orden de Shopify
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Ej: #1001 o 1001"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={importando}
          />
          <p className="text-xs text-gray-500 mt-1">
            Puedes usar el número de orden con o sin el símbolo #
          </p>
        </div>

        {mensaje && (
          <div className={`p-3 rounded-md ${
            mensaje.tipo === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <p className="text-sm font-medium">{mensaje.texto}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={importando}
          className="w-full bg-green-600 text-white px-4 py-2.5 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {importando ? 'Importando...' : '📥 Importar Orden'}
        </button>
      </form>

      <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>💡 Tip:</strong> La orden debe existir en tu tienda Shopify y tener una dirección de envío válida.
        </p>
      </div>
    </div>
  )
}