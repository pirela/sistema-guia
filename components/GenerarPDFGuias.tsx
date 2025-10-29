'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { generarPDFGuiasAsignadas } from '@/lib/pdf-generator'

export default function GenerarPDFGuias() {
  const [generando, setGenerando] = useState(false)

  const handleGenerarPDF = async () => {
    setGenerando(true)
    try {
      const { data: guias, error: guiasError } = await supabase
        .from('guias')
        .select('*')
        .eq('estado', 'asignada')
        .eq('eliminado', false)
        .order('numero_guia', { ascending: true })

      if (guiasError) throw guiasError

      if (!guias || guias.length === 0) {
        alert('No hay guías asignadas para generar PDF')
        return
      }

      const guiasCompletas = await Promise.all(
        guias.map(async (guia) => {
          const { data: motorizado } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', guia.motorizado_asignado)
            .single()

          const { data: guiasProductos } = await supabase
            .from('guias_productos')
            .select(`
              cantidad,
              producto:productos(*)
            `)
            .eq('guia_id', guia.id)

          return {
            ...guia,
            motorizado: motorizado || { nombre: 'N/A', email: 'N/A' },
            productos: guiasProductos || []
          }
        })
      )

      await generarPDFGuiasAsignadas(guiasCompletas as any)
      alert('PDF generado exitosamente')
    } catch (error) {
      console.error('Error generando PDF:', error)
      alert('Error al generar el PDF')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <button
      onClick={handleGenerarPDF}
      disabled={generando}
      className="bg-green-600 text-white px-4 py-2.5 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
    >
      {generando ? 'Generando PDF...' : '📄 Generar PDF Guías Asignadas'}
    </button>
  )
}