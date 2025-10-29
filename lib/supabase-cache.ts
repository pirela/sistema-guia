const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 segundos
const REQUEST_DELAY = 500 // 500ms entre requests

let lastRequestTime = 0

export async function cachedFetch<T>(
  key: string,
  fn: () => Promise<T>,
  cacheDuration = CACHE_DURATION
): Promise<T> {
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.data
  }

  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < REQUEST_DELAY) {
    await new Promise(resolve => 
      setTimeout(resolve, REQUEST_DELAY - timeSinceLastRequest)
    )
  }

  lastRequestTime = Date.now()
  const data = await fn()
  
  cache.set(key, { data, timestamp: Date.now() })
  
  return data
}

export function clearCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}