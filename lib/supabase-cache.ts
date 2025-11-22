const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 segundos
const REQUEST_DELAY = 1000 // 1000ms (1 segundo) entre requests para evitar rate limits
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 segundos entre reintentos
const REQUEST_TIMEOUT = 10000 // 10 segundos timeout por request
const STALE_REQUEST_CLEANUP_INTERVAL = 30000 // Limpiar requests antiguos cada 30 segundos

let lastRequestTime = 0
const pendingRequests = new Map<string, { promise: Promise<any>; startTime: number }>()

// Limpieza periódica de requests antiguos
setInterval(() => {
  const now = Date.now()
  for (const [key, requestInfo] of pendingRequests.entries()) {
    // Si un request lleva más del doble del timeout, considerarlo obsoleto y eliminarlo
    if (now - requestInfo.startTime > REQUEST_TIMEOUT * 2) {
      console.warn(`Eliminando request obsoleto para clave: ${key}`)
      pendingRequests.delete(key)
    }
  }
}, STALE_REQUEST_CLEANUP_INTERVAL)

export async function cachedFetch<T>(
  key: string,
  fn: () => Promise<T>,
  cacheDuration = CACHE_DURATION
): Promise<T> {
  // Verificar caché primero
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.data
  }

  // Si ya hay una petición pendiente para esta clave, esperar a que termine
  const pending = pendingRequests.get(key)
  if (pending) {
    return pending.promise
  }

  // Crear nueva petición con timeout
  const requestStartTime = Date.now()
  const requestPromise = (async () => {
    try {
      // Rate limiting: esperar entre requests
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTime
      if (timeSinceLastRequest < REQUEST_DELAY) {
        await new Promise(resolve => 
          setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest)
        )
      }

      lastRequestTime = Date.now()
      
      // Crear promesa con timeout
      const timeoutPromise = new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout en cachedFetch para clave: ${key}`)), REQUEST_TIMEOUT)
      )
      
      // Retry logic con exponential backoff
      let lastError: any
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const fnPromise = fn()
          const data = await Promise.race([fnPromise, timeoutPromise])
          cache.set(key, { data, timestamp: Date.now() })
          pendingRequests.delete(key)
          return data
        } catch (error: any) {
          lastError = error
          
          // Si es timeout o rate limit, esperar más tiempo
          if (error?.message?.includes('Timeout') || 
              error?.code === 'over_request_rate_limit' || 
              error?.message?.includes('rate limit')) {
            const delay = RETRY_DELAY * Math.pow(2, attempt) // Exponential backoff
            console.warn(`Error en cachedFetch (intento ${attempt + 1}/${MAX_RETRIES}), esperando ${delay}ms...`, error?.message)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
          
          // Para otros errores, no reintentar
          break
        }
      }
      
      pendingRequests.delete(key)
      throw lastError
    } catch (error) {
      // Asegurar que siempre se elimine del mapa de pending requests
      pendingRequests.delete(key)
      throw error
    }
  })()

  pendingRequests.set(key, { promise: requestPromise, startTime: requestStartTime })
  return requestPromise
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}