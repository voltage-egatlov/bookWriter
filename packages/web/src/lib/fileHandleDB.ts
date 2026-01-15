const DB_NAME = 'bookwriter-files'
const STORE_NAME = 'file-handles'
const DB_VERSION = 1

interface FileHandleEntry {
  bookId: string
  fileHandle: FileSystemFileHandle
  fileName: string
  lastOpened: number
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'bookId' })
      }
    }
  })
}

export async function storeFileHandle(
  bookId: string,
  fileHandle: FileSystemFileHandle,
  fileName: string
): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  const entry: FileHandleEntry = {
    bookId,
    fileHandle,
    fileName,
    lastOpened: Date.now(),
  }

  store.put(entry)

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

export async function getFileHandle(bookId: string): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    const request = store.get(bookId)

    const entry = await new Promise<FileHandleEntry | undefined>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    db.close()

    if (!entry) return null

    // Request permission if needed
    const permission = await (entry.fileHandle as any).queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') {
      return entry.fileHandle
    }

    // Try to request permission
    const requestedPermission = await (entry.fileHandle as any).requestPermission({
      mode: 'readwrite',
    })
    if (requestedPermission === 'granted') {
      return entry.fileHandle
    }

    return null // Permission denied
  } catch (err) {
    console.error('Failed to retrieve file handle:', err)
    return null
  }
}

export async function removeFileHandle(bookId: string): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  store.delete(bookId)

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}
