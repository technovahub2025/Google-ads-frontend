const VERSION = 1
const STORAGE_PREFIX = 'nexion:pmax-draft:'
const DATABASE = 'nexion-performance-max-drafts'
const STORE = 'images'
const imageFields = ['logos', 'landscapeLogos']
const groupImageFields = ['landscape', 'square', 'portrait']

const browserStorage = () => {
  try { return window.localStorage } catch { return null }
}

export function performanceMaxDraftKey(userId, account) {
  if (!userId || !account?.connectionId || !/^\d{10}$/.test(String(account.id || ''))) return ''
  return STORAGE_PREFIX + [VERSION, userId, account.connectionId, account.id].map(encodeURIComponent).join(':')
}

const openDatabase = () => new Promise((resolve, reject) => {
  if (!globalThis.indexedDB) return reject(new Error('IndexedDB is unavailable'))
  const request = indexedDB.open(DATABASE, 1)
  request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' })
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error || new Error('Could not open image storage'))
})

async function imageStore(mode, task) {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, mode)
      const store = transaction.objectStore(STORE)
      task(store, resolve, reject)
      transaction.onerror = () => reject(transaction.error || new Error('Image storage failed'))
    })
  } finally { database.close() }
}

const imageId = (key, path, index) => key + ':' + path + ':' + index
const imageMetadata = (image, id) => ({ id, name: image.name, size: image.size, width: image.width, height: image.height })

export function draftRecord(key, state) {
  const draft = JSON.parse(JSON.stringify(state.draft))
  const images = []
  const replace = (target, field, path) => {
    target[field] = target[field].map((image, index) => {
      const id = imageId(key, path, index)
      images.push({ id, image: { name: image.name, size: image.size, width: image.width, height: image.height, source: image.source } })
      return imageMetadata(image, id)
    })
  }
  for (const field of imageFields) replace(draft, field, field)
  draft.groups.forEach((group, groupIndex) => groupImageFields.forEach((field) => replace(group, field, 'groups.' + groupIndex + '.' + field)))
  return { version: VERSION, updatedAt: Date.now(), step: state.step, groupKey: state.groupKey, reviewing: Boolean(state.reviewing), draft, images }
}

async function saveImages(key, images) {
  await imageStore('readwrite', (store, resolve, reject) => {
    const request = store.getAllKeys()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      for (const id of request.result) if (String(id).startsWith(key + ':')) store.delete(id)
      for (const image of images) store.put(image)
      resolve()
    }
  })
}

async function readImage(id) {
  return imageStore('readonly', (store, resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result?.image || null)
    request.onerror = () => reject(request.error)
  })
}

async function restoreImages(draft) {
  let missing = false
  const restore = async (target, field) => {
    const values = await Promise.all(target[field].map(async (metadata) => {
      const image = metadata?.id && await readImage(metadata.id)
      if (!image?.source) { missing = true; return null }
      return image
    }))
    target[field] = values.filter(Boolean)
  }
  for (const field of imageFields) await restore(draft, field)
  for (const group of draft.groups) for (const field of groupImageFields) await restore(group, field)
  return { draft, missing }
}

export function hasPerformanceMaxDraft(key) {
  try {
    const value = browserStorage()?.getItem(key)
    return Boolean(value && JSON.parse(value).version === VERSION)
  } catch { return false }
}

export async function savePerformanceMaxDraft(key, state) {
  if (!key) return
  const record = draftRecord(key, state)
  try { await saveImages(key, record.images) } catch { /* Metadata remains useful even if image storage is unavailable. */ }
  try { browserStorage()?.setItem(key, JSON.stringify({ ...record, images: undefined })) } catch { /* Private browsing or quota limits may block local persistence. */ }
}

export async function loadPerformanceMaxDraft(key) {
  if (!key) return null
  let saved
  try { saved = JSON.parse(browserStorage()?.getItem(key) || 'null') } catch { return null }
  if (!saved || saved.version !== VERSION || !saved.draft || !Number.isInteger(saved.step) || saved.step < 0 || saved.step > 8) return null
  try {
    const restored = await restoreImages(saved.draft)
    return { ...saved, draft: restored.draft, imagesMissing: restored.missing }
  } catch {
    // Keep all non-image campaign entries when IndexedDB is unavailable.
    for (const field of imageFields) saved.draft[field] = []
    for (const group of saved.draft.groups || []) for (const field of groupImageFields) group[field] = []
    return { ...saved, imagesMissing: true }
  }
}

export async function clearPerformanceMaxDraft(key) {
  if (!key) return
  try { browserStorage()?.removeItem(key) } catch { /* Nothing further to do. */ }
  try { await imageStore('readwrite', (store, resolve, reject) => {
    const request = store.getAllKeys()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => { for (const id of request.result) if (String(id).startsWith(key + ':')) store.delete(id); resolve() }
  }) } catch { /* The saved draft metadata is already gone. */ }
}
