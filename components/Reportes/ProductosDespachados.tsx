interface ProductosDespachados {
  producto_id: string
  codigo_sku: string | null
  producto_nombre: string
  precio: number
  veces_despachado: number
  cantidad_total_despachada: number
  ultima_vez_despachado: string | null
}

interface ProductosDespachadosProps {
  productosDespachados: ProductosDespachados[]
}

export default function ProductosDespachados({ productosDespachados }: ProductosDespachadosProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">📦 Top 10 Productos Más Despachados</h3>
      
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Producto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Precio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Veces Despachado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cantidad Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Última Vez
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productosDespachados.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              productosDespachados.map((producto, index) => (
                <tr key={producto.producto_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {producto.codigo_sku || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span className="mr-2 text-gray-400">#{index + 1}</span>
                    {producto.producto_nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${producto.precio.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                    {producto.veces_despachado}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                    {producto.cantidad_total_despachada}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {producto.ultima_vez_despachado 
                      ? new Date(producto.ultima_vez_despachado).toLocaleDateString()
                      : 'N/A'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {productosDespachados.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No hay datos disponibles
          </div>
        ) : (
          productosDespachados.map((producto, index) => (
            <div key={producto.producto_id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                    <h4 className="font-bold text-gray-900">{producto.producto_nombre}</h4>
                  </div>
                  <p className="text-xs text-gray-500">SKU: {producto.codigo_sku || 'N/A'}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">${producto.precio.toFixed(2)}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-xs text-blue-600">Veces</p>
                  <p className="font-bold text-blue-600">{producto.veces_despachado}</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-xs text-green-600">Cantidad</p>
                  <p className="font-bold text-green-600">{producto.cantidad_total_despachada}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-xs text-gray-600">Última</p>
                  <p className="font-semibold text-xs text-gray-900">
                    {producto.ultima_vez_despachado 
                      ? new Date(producto.ultima_vez_despachado).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}






