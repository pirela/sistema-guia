interface EstadisticasMotorizado {
  motorizado_id: string
  motorizado_nombre: string
  motorizado_username: string
  total_guias: number
  guias_asignadas: number
  guias_en_ruta: number
  guias_entregadas: number
  guias_finalizadas?: number
  guias_canceladas: number
  guias_rechazadas: number
  monto_total_recaudado: number
  monto_pendiente_recaudar: number
  ultima_entrega: string | null
}

interface EstadisticasMotorizadosProps {
  estadisticasMotorizados: EstadisticasMotorizado[]
}

export default function EstadisticasMotorizados({ estadisticasMotorizados }: EstadisticasMotorizadosProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">👥 Estadísticas por Motorizado</h3>
      
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Motorizado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Asignadas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                En Ruta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Entregadas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Finalizadas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Canceladas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rechazadas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Recaudado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Pendiente
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {estadisticasMotorizados.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              estadisticasMotorizados.map((motorizado) => (
                <tr key={motorizado.motorizado_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {motorizado.motorizado_nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {motorizado.total_guias}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    {motorizado.guias_asignadas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                    {motorizado.guias_en_ruta}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {motorizado.guias_entregadas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                    {motorizado.guias_finalizadas || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {motorizado.guias_canceladas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                    {motorizado.guias_rechazadas}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-700">
                    ${motorizado.monto_total_recaudado.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${motorizado.monto_pendiente_recaudar.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden space-y-3">
        {estadisticasMotorizados.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No hay datos disponibles
          </div>
        ) : (
          estadisticasMotorizados.map((motorizado) => (
            <div key={motorizado.motorizado_id} className="border rounded-lg p-4 space-y-3">
              <div className="border-b pb-2">
                <h4 className="font-bold text-gray-900">{motorizado.motorizado_nombre}</h4>
                <p className="text-xs text-gray-500">@{motorizado.motorizado_username}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Total Guías</p>
                  <p className="font-bold text-lg">{motorizado.total_guias}</p>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-xs text-blue-600">Asignadas</p>
                  <p className="font-bold text-lg text-blue-600">{motorizado.guias_asignadas}</p>
                </div>
                <div className="bg-yellow-50 p-2 rounded">
                  <p className="text-xs text-yellow-600">En Ruta</p>
                  <p className="font-bold text-lg text-yellow-600">{motorizado.guias_en_ruta}</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-xs text-green-600">Entregadas</p>
                  <p className="font-bold text-lg text-green-600">{motorizado.guias_entregadas}</p>
                </div>
                <div className="bg-indigo-50 p-2 rounded">
                  <p className="text-xs text-indigo-600">Finalizadas</p>
                  <p className="font-bold text-lg text-indigo-600">{motorizado.guias_finalizadas || 0}</p>
                </div>
                <div className="bg-red-50 p-2 rounded">
                  <p className="text-xs text-red-600">Canceladas</p>
                  <p className="font-bold text-lg text-red-600">{motorizado.guias_canceladas}</p>
                </div>
                <div className="bg-orange-50 p-2 rounded">
                  <p className="text-xs text-orange-600">Rechazadas</p>
                  <p className="font-bold text-lg text-orange-600">{motorizado.guias_rechazadas}</p>
                </div>
              </div>

              <div className="border-t pt-2 space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-gray-600">Recaudado:</span>
                  <span className="font-bold text-green-700">${motorizado.monto_total_recaudado.toFixed(2)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-600">Pendiente:</span>
                  <span className="font-semibold text-gray-600">${motorizado.monto_pendiente_recaudar.toFixed(2)}</span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

