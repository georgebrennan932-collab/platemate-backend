const DB_NAME = 'platemate_cache';
const DB_VERSION = 1;
const STORES = {
  images: 'images',
  analyses: 'analyses',
  diary: 'diary',
};

class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.images)) {
          db.createObjectStore(STORES.images, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.analyses)) {
          db.createObjectStore(STORES.analyses, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.diary)) {
          db.createObjectStore(STORES.diary, { keyPath: 'id' });
        }
      };
    });
  }

  async set<T>(store: keyof typeof STORES, key: string, value: T): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES[store]], 'readwrite');
      const objectStore = transaction.objectStore(STORES[store]);
      const request = objectStore.put({ id: key, data: value, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(store: keyof typeof STORES, key: string): Promise<T | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES[store]], 'readonly');
      const objectStore = transaction.objectStore(STORES[store]);
      const request = objectStore.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(store: keyof typeof STORES, key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES[store]], 'readwrite');
      const objectStore = transaction.objectStore(STORES[store]);
      const request = objectStore.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(store: keyof typeof STORES): Promise<T[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES[store]], 'readonly');
      const objectStore = transaction.objectStore(STORES[store]);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        const results = request.result.map((item: any) => item.data);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clear(store: keyof typeof STORES): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES[store]], 'readwrite');
      const objectStore = transaction.objectStore(STORES[store]);
      const request = objectStore.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const idbStorage = new IndexedDBStorage();
