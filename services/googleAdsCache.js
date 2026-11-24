const entries = new Map()
const listeners = new Map()

export const GOOGLE_ADS_CACHE_TTL = 30_000

export function isGoogleAdsCancellation(error, signal) {
  return Boolean(
    signal?.aborted ||
    error?.name === 'AbortError' ||
    error?.code === 'ABORT_ERR' ||
    error?.code === 'ERR_CANCELED' ||
    /(?:abort|cancell?ed|cancell?ation)/i.test(String(error?.message || '')),
  )
}

const notify = (key) => (listeners.get(key) || []).forEach((listener) => listener())

export function readGoogleAdsCache(key, maxAge = Infinity) {
  const entry = entries.get(key)
  if (!entry || Date.now() - entry.updatedAt > maxAge) return undefined
  return entry.data
}

export function writeGoogleAdsCache(key, data) {
  entries.set(key, { data, updatedAt: Date.now(), promise: null })
  notify(key)
  return data
}

export function subscribeGoogleAdsCache(key, listener) {
  const current = listeners.get(key) || []
  listeners.set(key, [...current, listener])
  return () => listeners.set(key, (listeners.get(key) || []).filter((item) => item !== listener))
}

export function invalidateGoogleAdsCache(prefix = '') {
  for (const key of entries.keys()) if (!prefix || key.startsWith(prefix)) {
    entries.delete(key)
    notify(key)
  }
}

export function clearGoogleAdsCache() {
  entries.clear()
  listeners.forEach((_, key) => notify(key))
}

export function fetchGoogleAdsCache(key, fetcher, { ttl = GOOGLE_ADS_CACHE_TTL, force = false } = {}) {
  const current = entries.get(key)
  const fresh = current && Date.now() - current.updatedAt <= ttl
  if (!force && fresh) return Promise.resolve(current.data)
  if (current?.promise) return current.promise

  // A component's controller belongs to that component, not to the shared
  // request. Otherwise unmounting one consumer aborts the request for all
  // consumers (and is especially visible during StrictMode effect replay).
  const requestController = typeof AbortController === 'function' ? new AbortController() : null
  const promise = Promise.resolve().then(() => fetcher(requestController?.signal)).then((data) => writeGoogleAdsCache(key, data)).finally(() => {
    const latest = entries.get(key)
    if (latest?.promise === promise) entries.set(key, { ...latest, promise: null })
  })
  entries.set(key, { ...(current || {}), promise, data: current?.data, updatedAt: current?.updatedAt || 0 })
  return promise
}

export function refreshGoogleAdsCache(key, fetcher, options = {}) {
  return fetchGoogleAdsCache(key, fetcher, { ...options, force: true })
}
