export const getEstadoColor = (estado: string) => {
  const colors: { [key: string]: string } = {
    pendiente: 'bg-gray-100 text-gray-800',
    asignada: 'bg-blue-100 text-blue-800',
    en_ruta: 'bg-yellow-100 text-yellow-800',
    entregada: 'bg-green-100 text-green-800',
    finalizada: 'bg-indigo-100 text-indigo-800',
    cancelada: 'bg-red-100 text-red-800',
    rechazada: 'bg-orange-100 text-orange-800',
    novedad: 'bg-pink-100 text-pink-800',
  }
  return colors[estado] || 'bg-gray-100 text-gray-800'
}

export const getEstadoTexto = (estado: string) => {
  const textos: { [key: string]: string } = {
    pendiente: 'Pendiente',
    asignada: 'Asignada',
    en_ruta: 'En Ruta',
    entregada: 'Entregada',
    finalizada: 'Finalizada',
    cancelada: 'Cancelada',
    rechazada: 'Rechazada',
    novedad: 'Novedad',
  }
  return textos[estado] || estado
}






