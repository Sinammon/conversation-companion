// Every tab edits the latest localStorage record while holding the same origin-wide lock.
// Plain HTTP LAN previews lack Web Locks. IndexedDB serializes read-write transactions there.
const name = 'conversation-companion.notebook-writer';
let connection: Promise<IDBDatabase> | undefined;

function openLockDatabase() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('writer');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(error => { connection = undefined; throw error; });
}

export async function withNotebookWriter<T>(write: () => T): Promise<T> {
  if (navigator.locks) return navigator.locks.request(name, write);
  const db = await openLockDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('writer', 'readwrite');
    let result: T;
    tx.objectStore('writer').get(0).onsuccess = () => {
      try { result = write(); }
      catch (error) { tx.abort(); reject(error); }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error ?? new Error('Could not save changes to this notebook.'));
  });
}
