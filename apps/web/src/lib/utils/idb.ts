/**
 * Built-in IndexedDB wrapper for caching Base64 images for Chat Messages.
 * 
 * Allows the UI to render user-uploaded screenshots locally without taxing the
 * Postgres database or blowing up the network with Base64 strings.
 */

const DB_NAME = 'must-iq-chat-assets';
const STORE_NAME = 'message-images';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Store a Base64 image payload linked to a local message ID */
export async function saveLocalImage(messageId: string, base64Data: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(base64Data, messageId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed:', err);
  }
}

/** Retrieve a Base64 image payload for a given message ID */
export async function getLocalImage(messageId: string): Promise<string | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(messageId);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB read failed:', err);
    return null;
  }
}

/** Delete an image if needed (e.g. session deleted) */
export async function deleteLocalImage(messageId: string): Promise<void> {
  try {
    const db = await getDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(messageId);
  } catch (err) {
    // Ignore IDB errors quietly
  }
}
