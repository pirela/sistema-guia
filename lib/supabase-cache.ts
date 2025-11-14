const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 segundos
const REQUEST_DELAY = 1000 // 1000ms (1 segundo) entre requests para evitar rate limits
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 segundos entre reintentos

let lastRequestTime = 0
const pendingRequests = new Map<string, Promise<any>>()

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
    return pending
  }

  // Crear nueva petición
  const requestPromise = (async () => {
    // Rate limiting: esperar entre requests
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime
    if (timeSinceLastRequest < REQUEST_DELAY) {
      await new Promise(resolve => 
        setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest)
      )
    }

    lastRequestTime = Date.now()
    
    // Retry logic con exponential backoff
    let lastError: any
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const data = await fn()
        cache.set(key, { data, timestamp: Date.now() })
        pendingRequests.delete(key)
        return data
      } catch (error: any) {
        lastError = error
        
        // Si es rate limit, esperar más tiempo
        if (error?.code === 'over_request_rate_limit' || error?.message?.includes('rate limit')) {
          const delay = RETRY_DELAY * Math.pow(2, attempt) // Exponential backoff
          console.warn(`Rate limit alcanzado (intento ${attempt + 1}/${MAX_RETRIES}), esperando ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        // Para otros errores, no reintentar
        break
      }
    }
    
    pendingRequests.delete(key)
    throw lastError
  })()

  pendingRequests.set(key, requestPromise)
  return requestPromise
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}