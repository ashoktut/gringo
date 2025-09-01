import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export interface StorageItem<T = any> {
  id: string;
  data: T;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private readonly DB_NAME = 'GringoAppDB';
  private readonly DB_VERSION = 1;
  private db: IDBDatabase | null = null;

  // Store names for different data types
  public readonly STORES = {
    SUBMISSIONS: 'submissions',
    TEMPLATES: 'templates',
    PDF_TEMPLATES: 'pdf_templates'
  } as const;

  constructor() {
    this.initDatabase();
  }

  /**
   * Initialize IndexedDB database with required object stores
   */
  private initDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('🔄 IndexedDB upgrade needed, creating object stores...');

        // Create submissions store
        if (!db.objectStoreNames.contains(this.STORES.SUBMISSIONS)) {
          const submissionsStore = db.createObjectStore(this.STORES.SUBMISSIONS, { keyPath: 'id' });
          submissionsStore.createIndex('formType', 'formType', { unique: false });
          submissionsStore.createIndex('createdAt', 'createdAt', { unique: false });
          submissionsStore.createIndex('status', 'status', { unique: false });
        }

        // Create templates store
        if (!db.objectStoreNames.contains(this.STORES.TEMPLATES)) {
          const templatesStore = db.createObjectStore(this.STORES.TEMPLATES, { keyPath: 'id' });
          templatesStore.createIndex('formType', 'formType', { unique: false });
          templatesStore.createIndex('isUniversal', 'isUniversal', { unique: false });
        }

        // Create PDF templates store
        if (!db.objectStoreNames.contains(this.STORES.PDF_TEMPLATES)) {
          const pdfTemplatesStore = db.createObjectStore(this.STORES.PDF_TEMPLATES, { keyPath: 'id' });
          pdfTemplatesStore.createIndex('formType', 'formType', { unique: false });
        }
      };
    });
  }

  /**
   * Get all items from a store
   */
  getAll<T>(storeName: string): Observable<StorageItem<T>[]> {
    return from(this.initDatabase()).pipe(
      map((db) => {
        return new Promise<StorageItem<T>[]>((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();

          request.onsuccess = () => {
            const items = request.result.map(item => ({
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt)
            }));
            resolve(items);
          };

          request.onerror = () => reject(request.error);
        });
      }),
      map(promise => promise),
      catchError(error => {
        console.error(`Error getting all items from ${storeName}:`, error);
        return throwError(() => error);
      })
    ).pipe(
      map(promise => from(promise))
    ).pipe(
      switchMap(obs => obs)
    );
  }

  /**
   * Get item by ID from a store
   */
  getById<T>(storeName: string, id: string): Observable<StorageItem<T> | null> {
    return from(this.initDatabase()).pipe(
      map((db) => {
        return new Promise<StorageItem<T> | null>((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.get(id);

          request.onsuccess = () => {
            const item = request.result;
            if (item) {
              resolve({
                ...item,
                createdAt: new Date(item.createdAt),
                updatedAt: new Date(item.updatedAt)
              });
            } else {
              resolve(null);
            }
          };

          request.onerror = () => reject(request.error);
        });
      }),
      map(promise => from(promise)),
      catchError(error => {
        console.error(`Error getting item ${id} from ${storeName}:`, error);
        return throwError(() => error);
      })
    ).pipe(
      switchMap(obs => obs)
    );
  }

  /**
   * Save or update an item in a store
   */
  save<T>(storeName: string, id: string, data: T): Observable<StorageItem<T>> {
    return from(this.initDatabase()).pipe(
      map((db) => {
        return new Promise<StorageItem<T>>((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);

          // Check if item already exists
          const getRequest = store.get(id);

          getRequest.onsuccess = () => {
            const existingItem = getRequest.result;
            const now = new Date();

            const item: StorageItem<T> = {
              id,
              data,
              createdAt: existingItem ? new Date(existingItem.createdAt) : now,
              updatedAt: now
            };

            const putRequest = store.put(item);

            putRequest.onsuccess = () => resolve(item);
            putRequest.onerror = () => reject(putRequest.error);
          };

          getRequest.onerror = () => reject(getRequest.error);
        });
      }),
      map(promise => from(promise)),
      catchError(error => {
        console.error(`Error saving item ${id} to ${storeName}:`, error);
        return throwError(() => error);
      })
    ).pipe(
      switchMap(obs => obs)
    );
  }

  /**
   * Save multiple items at once
   */
  saveAll<T>(storeName: string, items: Array<{ id: string; data: T }>): Observable<StorageItem<T>[]> {
    return from(this.initDatabase()).pipe(
      map((db) => {
        return new Promise<StorageItem<T>[]>((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const now = new Date();
          const savedItems: StorageItem<T>[] = [];
          let completed = 0;

          items.forEach(({ id, data }) => {
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
              const existingItem = getRequest.result;

              const item: StorageItem<T> = {
                id,
                data,
                createdAt: existingItem ? new Date(existingItem.createdAt) : now,
                updatedAt: now
              };

              const putRequest = store.put(item);

              putRequest.onsuccess = () => {
                savedItems.push(item);
                completed++;
                if (completed === items.length) {
                  resolve(savedItems);
                }
              };

              putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
          });

          if (items.length === 0) {
            resolve([]);
          }
        });
      }),
      map(promise => from(promise)),
      catchError(error => {
        console.error(`Error saving multiple items to ${storeName}:`, error);
        return throwError(() => error);
      })
    ).pipe(
      switchMap(obs => obs)
    );
  }

  /**
   * Delete an item from a store
   */
  delete(storeName: string, id: string): Observable<boolean> {
    return from(this.initDatabase()).pipe(
      map((db) => {
        return new Promise<boolean>((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(id);

          request.onsuccess = () => resolve(true);
          request.onerror = () => reject(request.error);
        });
      }),
      map(promise => from(promise)),
      catchError(error => {
        console.error(`Error deleting item ${id} from ${storeName}:`, error);
        return throwError(() => error);
      })
    ).pipe(
      switchMap(obs => obs)
    );
  }

  /**
   * Clear all items from a store
   */
  clear(storeName: string): Observable<boolean> {
    return from(this.initDatabase()).pipe(
      map((db) => {
        return new Promise<boolean>((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();

          request.onsuccess = () => resolve(true);
          request.onerror = () => reject(request.error);
        });
      }),
      map(promise => from(promise)),
      catchError(error => {
        console.error(`Error clearing store ${storeName}:`, error);
        return throwError(() => error);
      })
    ).pipe(
      switchMap(obs => obs)
    );
  }

  /**
   * Get items by index
   */
  getByIndex<T>(storeName: string, indexName: string, value: any): Observable<StorageItem<T>[]> {
    return from(this.initDatabase()).pipe(
      map((db) => {
        return new Promise<StorageItem<T>[]>((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const index = store.index(indexName);
          const request = index.getAll(value);

          request.onsuccess = () => {
            const items = request.result.map(item => ({
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt)
            }));
            resolve(items);
          };

          request.onerror = () => reject(request.error);
        });
      }),
      map(promise => from(promise)),
      catchError(error => {
        console.error(`Error getting items by index ${indexName} from ${storeName}:`, error);
        return throwError(() => error);
      })
    ).pipe(
      switchMap(obs => obs)
    );
  }

  /**
   * Migrate data from localStorage to IndexedDB
   */
  migrateFromLocalStorage(localStorageKey: string, storeName: string): Observable<boolean> {
    const stored = localStorage.getItem(localStorageKey);
    if (!stored) {
      console.log(`No data found in localStorage for key: ${localStorageKey}`);
      return from([true]);
    }

    try {
      const data = JSON.parse(stored);
      const items = Array.isArray(data) ? data : [data];

      const itemsToSave = items.map((item: any, index: number) => ({
        id: item.id || item.submissionId || item.templateId || `migrated_${index}`,
        data: item
      }));

      return this.saveAll(storeName, itemsToSave).pipe(
        map(() => {
          console.log(`✅ Successfully migrated ${items.length} items from localStorage to IndexedDB`);
          // Optionally remove from localStorage after successful migration
          localStorage.removeItem(localStorageKey);
          return true;
        }),
        catchError(error => {
          console.error('Failed to migrate from localStorage:', error);
          return throwError(() => error);
        })
      );
    } catch (error) {
      console.error('Error parsing localStorage data:', error);
      return throwError(() => error);
    }
  }

  /**
   * Get database usage statistics
   */
  getStorageStats(): Observable<{ totalSize: number; storeStats: { [storeName: string]: { count: number; size: number } } }> {
    return from(this.initDatabase()).pipe(
      switchMap((db) => {
        return new Promise<{ totalSize: number; storeStats: { [storeName: string]: { count: number; size: number } } }>((resolve, reject) => {
          const storeNames = Array.from(db.objectStoreNames);
          const storeStats: { [storeName: string]: { count: number; size: number } } = {};
          let completed = 0;
          let totalSize = 0;

          if (storeNames.length === 0) {
            resolve({ totalSize: 0, storeStats: {} });
            return;
          }

          storeNames.forEach(storeName => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);

            // Get count
            const countRequest = store.count();

            // Get all data to calculate size
            const getAllRequest = store.getAll();

            let storeSize = 0;
            let storeCount = 0;

            countRequest.onsuccess = () => {
              storeCount = countRequest.result;
            };

            getAllRequest.onsuccess = () => {
              const allData = getAllRequest.result;
              storeSize = JSON.stringify(allData).length * 2; // Rough byte estimation
              totalSize += storeSize;

              storeStats[storeName] = {
                count: storeCount,
                size: storeSize
              };

              completed++;
              if (completed === storeNames.length) {
                resolve({ totalSize, storeStats });
              }
            };

            countRequest.onerror = getAllRequest.onerror = () => {
              reject(countRequest.error || getAllRequest.error);
            };
          });
        });
      }),
      catchError(error => {
        console.error('Error getting storage stats:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Clear all data from a specific store
   */
  clearStore(storeName: string): Observable<boolean> {
    return from(this.initDatabase()).pipe(
      switchMap((db) => {
        return new Promise<boolean>((resolve, reject) => {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const clearRequest = store.clear();

          clearRequest.onsuccess = () => {
            console.log(`✅ Cleared all data from ${storeName} store`);
            resolve(true);
          };

          clearRequest.onerror = () => {
            console.error(`❌ Failed to clear ${storeName} store:`, clearRequest.error);
            reject(clearRequest.error);
          };
        });
      }),
      catchError(error => {
        console.error(`Error clearing store ${storeName}:`, error);
        return throwError(() => error);
      })
    );
  }
}
