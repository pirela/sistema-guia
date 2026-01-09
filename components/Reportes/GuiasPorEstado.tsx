import { getEstadoColor } from './helpers'

interface GuiasPorEstado {
  estado: string
  total_guias: number
  monto_total: number
  monto_promedio: number
  primera_guia: string
  ultima_guia: string
}

interface GuiasPorEstadoProps {
  guiasPorEstado: GuiasPorEstado[]
}

export default function GuiasPorEstado({ guiasPorEstado }: GuiasPorEstadoProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📊 Guías por Estado</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {guiasPorEstado.map((estado) => (
          <div key={estado.estado} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${getEstadoColor(estado.estado)}`}>
                {estado.estado}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-gray-800">{estado.total_guias}</span>
            </div>
            <div className="space-y-1 text-xs sm:text-sm text-gray-600">
              <p>Monto Total: <span className="font-semibold">${estado.monto_total.toFixed(2)}</span></p>
              <p>Promedio: <span className="font-semibold">${estado.monto_promedio.toFixed(2)}</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}






