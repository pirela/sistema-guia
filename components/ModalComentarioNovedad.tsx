'use client'

import { useState, useEffect } from 'react'
import { EstadoGuia } from '@/types/database'

interface ModalComentarioNovedadProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (comentario: string) => void
  titulo: string
  estadoAnterior?: EstadoGuia | null
  estadoNuevo?: EstadoGuia
  loading?: boolean
}

export default function ModalComentarioNovedad({
  isOpen,
  onClose,
  onConfirm,
  titulo,
  estadoAnterior,
  estadoNuevo,
  loading = false,
}: ModalComentarioNovedadProps) {
  const [comentario, setComentario] = useState('')

  useEffect(() => {
    if (isOpen) {
      setComentario('')
    }
  }, [isOpen])

  const handleConfirm = () => {
    if (!comentario.trim()) {
      alert('El comentario es obligatorio')
      return
    }
    onConfirm(comentario.trim())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{titulo}</h3>
        
        {(estadoAnterior || estadoNuevo) && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              {estadoAnterior && estadoNuevo && (
                <>Cambio de estado: <span className="font-semibold">{estadoAnterior}</span> → <span className="font-semibold">{estadoNuevo}</span></>
              )}
              {!estadoAnterior && estadoNuevo && (
                <>Nuevo estado: <span className="font-semibold">{estadoNuevo}</span></>
              )}
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comentario <span className="text-red-500">*</span>
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Describe la novedad o el motivo del cambio de estado..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            disabled={loading}
            autoFocus
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !comentario.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

