export type RolUsuario = 'administrador' | 'motorizado'
export type EstadoGuia = 'pendiente' | 'asignada' | 'en_ruta' | 'entregada' | 'finalizada' | 'cancelada' | 'rechazada' | 'novedad'

export interface Usuario {
  id: string
  username: string
  email: string
  nombre: string
  rol: RolUsuario
  activo: boolean
  eliminado: boolean
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface Producto {
  id: string
  codigo_sku: string | null
  nombre: string
  descripcion: string | null
  precio: number
  activo: boolean
  eliminado: boolean
}

export interface Guia {
  id: string
  numero_guia: string
  nombre_cliente: string
  telefono_cliente: string
  direccion: string
  referencia: string | null
  observacion: string | null
  estado: EstadoGuia
  motorizado_asignado: string
  creado_por: string
  fecha_asignacion: string
  fecha_entrega: string | null
  monto_recaudar: number
  eliminado: boolean
  fecha_creacion: string
  fecha_actualizacion: string
}

export interface GuiaProducto {
  id: string
  guia_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
}

export interface HistorialEstado {
  id: string
  guia_id: string
  estado_anterior: EstadoGuia | null
  estado_nuevo: EstadoGuia
  usuario_id: string | null
  comentario: string | null
  fecha_cambio: string
}

export interface Novedad {
  id: string
  guia_id: string
  usuario_id: string
  comentario: string
  fecha_creacion: string
}
