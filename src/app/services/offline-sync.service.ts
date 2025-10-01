import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, from, timer, throwError, EMPTY } from 'rxjs';
import { catchError, switchMap, retryWhen, delay, take, tap, filter } from 'rxjs/operators';
import { IndexedDbService } from './shared/indexed-db.service';

export interface SyncItem {
  id: string;
  type: 'form_submission' | 'template_update' | 'media_upload' | 'form_draft';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  lastError?: string;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[]; // IDs of other sync items this depends on
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  currentItem?: SyncItem;
}

export interface ConflictResolution {
  strategy: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  mergedData?: any;
}

export interface SyncConflict {
  id: string;
  localData: any;
  serverData: any;
  conflictType: 'data_mismatch' | 'version_conflict' | 'deleted_remotely';
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineSyncService {
  private readonly dbService = inject(IndexedDbService);

  private readonly SYNC_QUEUE_STORE = 'syncQueue';
  private readonly SYNC_CONFLICTS_STORE = 'syncConflicts';
  private readonly SYNC_STATUS_STORE = 'syncStatus';
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly MAX_CONCURRENT_SYNCS = 3;

  private syncQueue$ = new BehaviorSubject<SyncItem[]>([]);
  private syncProgress$ = new BehaviorSubject<SyncProgress>({ total: 0, completed: 0, failed: 0, inProgress: 0 });
  private isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);
  private isSyncing$ = new BehaviorSubject<boolean>(false);
  private conflicts$ = new BehaviorSubject<SyncConflict[]>([]);

  private activeSyncs = new Set<string>();
  private syncTimer: any;

  constructor() {
    this.initializeService();
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  private async initializeService(): Promise<void> {
    try {
      // Initialize IndexedDB stores if not exists
      await this.dbService.createStore(this.SYNC_QUEUE_STORE);
      await this.dbService.createStore(this.SYNC_CONFLICTS_STORE);
      await this.dbService.createStore(this.SYNC_STATUS_STORE);

      // Load existing queue
      await this.loadSyncQueue();
      await this.loadConflicts();
    } catch (error) {
      console.error('Failed to initialize OfflineSyncService:', error);
    }
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline$.next(true);
      this.triggerSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline$.next(false);
    });
  }

  private startPeriodicSync(): void {
    this.syncTimer = timer(0, this.SYNC_INTERVAL).subscribe(() => {
      if (this.isOnline$.value && !this.isSyncing$.value) {
        this.triggerSync();
      }
    });
  }

  // Public API
  get syncQueue(): Observable<SyncItem[]> {
    return this.syncQueue$.asObservable();
  }

  get syncProgress(): Observable<SyncProgress> {
    return this.syncProgress$.asObservable();
  }

  get isOnline(): Observable<boolean> {
    return this.isOnline$.asObservable();
  }

  get isSyncing(): Observable<boolean> {
    return this.isSyncing$.asObservable();
  }

  get conflicts(): Observable<SyncConflict[]> {
    return this.conflicts$.asObservable();
  }

  // Add item to sync queue
  async addToSyncQueue(
    type: SyncItem['type'],
    data: any,
    priority: SyncItem['priority'] = 'medium',
    dependencies: string[] = []
  ): Promise<string> {
    const syncItem: SyncItem = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.getMaxRetries(type),
      status: 'pending',
      priority,
      dependencies
    };

    try {
      // Store in IndexedDB
      await this.dbService.setItem(this.SYNC_QUEUE_STORE, syncItem.id, syncItem);

      // Update in-memory queue
      const currentQueue = this.syncQueue$.value;
      const newQueue = [...currentQueue, syncItem].sort(this.sortByPriority);
      this.syncQueue$.next(newQueue);

      // Update progress
      this.updateSyncProgress();

      // Trigger immediate sync if online
      if (this.isOnline$.value) {
        setTimeout(() => this.triggerSync(), 100);
      }

      return syncItem.id;
    } catch (error) {
      console.error('Failed to add item to sync queue:', error);
      throw error;
    }
  }

  // Remove item from sync queue
  async removeFromSyncQueue(itemId: string): Promise<void> {
    try {
      await this.dbService.deleteItem(this.SYNC_QUEUE_STORE, itemId);

      const currentQueue = this.syncQueue$.value;
      const newQueue = currentQueue.filter(item => item.id !== itemId);
      this.syncQueue$.next(newQueue);

      this.updateSyncProgress();
    } catch (error) {
      console.error('Failed to remove item from sync queue:', error);
      throw error;
    }
  }

  // Manually trigger sync
  async triggerSync(): Promise<void> {
    if (this.isSyncing$.value || !this.isOnline$.value) {
      return;
    }

    const queue = this.syncQueue$.value;
    const pendingItems = queue.filter(item =>
      item.status === 'pending' &&
      this.areDependenciesMet(item, queue)
    );

    if (pendingItems.length === 0) {
      return;
    }

    this.isSyncing$.next(true);

    try {
      // Process items in parallel (up to MAX_CONCURRENT_SYNCS)
      const batchSize = Math.min(pendingItems.length, this.MAX_CONCURRENT_SYNCS);
      const batch = pendingItems.slice(0, batchSize);

      const syncPromises = batch.map(item => this.syncItem(item));
      await Promise.allSettled(syncPromises);

      // Continue with remaining items if any
      const remainingQueue = this.syncQueue$.value;
      const stillPending = remainingQueue.filter(item =>
        item.status === 'pending' &&
        this.areDependenciesMet(item, remainingQueue)
      );

      if (stillPending.length > 0) {
        setTimeout(() => this.triggerSync(), 1000);
      }
    } finally {
      this.isSyncing$.next(false);
    }
  }

  // Sync individual item
  private async syncItem(item: SyncItem): Promise<void> {
    if (this.activeSyncs.has(item.id)) {
      return;
    }

    this.activeSyncs.add(item.id);

    try {
      // Update status to syncing
      await this.updateSyncItemStatus(item.id, 'syncing');

      // Perform actual sync based on item type
      await this.performSync(item);

      // Mark as completed and remove from queue
      await this.updateSyncItemStatus(item.id, 'completed');
      await this.removeFromSyncQueue(item.id);

    } catch (error) {
      console.error(`Sync failed for item ${item.id}:`, error);

      // Handle retry logic
      const updatedItem = this.syncQueue$.value.find(i => i.id === item.id);
      if (updatedItem && updatedItem.retryCount < updatedItem.maxRetries) {
        await this.scheduleRetry(updatedItem, error as Error);
      } else {
        await this.updateSyncItemStatus(item.id, 'failed', (error as Error).message);
      }
    } finally {
      this.activeSyncs.delete(item.id);
      this.updateSyncProgress();
    }
  }

  // Perform actual sync operation
  private async performSync(item: SyncItem): Promise<void> {
    switch (item.type) {
      case 'form_submission':
        return this.syncFormSubmission(item.data);
      case 'template_update':
        return this.syncTemplateUpdate(item.data);
      case 'media_upload':
        return this.syncMediaUpload(item.data);
      case 'form_draft':
        return this.syncFormDraft(item.data);
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  // Specific sync implementations
  private async syncFormSubmission(data: any): Promise<void> {
    // Mock API call - replace with actual endpoint
    const response = await fetch('/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Handle potential conflicts
    if (result.conflict) {
      await this.handleSyncConflict(data.id, data, result.serverData, 'data_mismatch');
      throw new Error('Sync conflict detected');
    }
  }

  private async syncTemplateUpdate(data: any): Promise<void> {
    // Mock template sync
    const response = await fetch(`/api/templates/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  private async syncMediaUpload(data: any): Promise<void> {
    // Handle large file uploads with progress tracking
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('metadata', JSON.stringify(data.metadata));

    const response = await fetch('/api/media/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  private async syncFormDraft(data: any): Promise<void> {
    // Sync form drafts for cross-device continuity
    const response = await fetch('/api/drafts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }

  // Conflict resolution
  private async handleSyncConflict(
    itemId: string,
    localData: any,
    serverData: any,
    conflictType: SyncConflict['conflictType']
  ): Promise<void> {
    const conflict: SyncConflict = {
      id: itemId,
      localData,
      serverData,
      conflictType,
      timestamp: Date.now()
    };

    try {
      await this.dbService.setItem(this.SYNC_CONFLICTS_STORE, itemId, conflict);

      const currentConflicts = this.conflicts$.value;
      this.conflicts$.next([...currentConflicts, conflict]);
    } catch (error) {
      console.error('Failed to store sync conflict:', error);
    }
  }

  async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void> {
    try {
      const conflict = (await this.dbService.getItem(this.SYNC_CONFLICTS_STORE, conflictId)) as SyncConflict;
      if (!conflict) {
        throw new Error('Conflict not found');
      }

      let resolvedData: any;
      switch (resolution.strategy) {
        case 'server_wins':
          resolvedData = conflict.serverData;
          break;
        case 'client_wins':
          resolvedData = conflict.localData;
          break;
        case 'merge':
          resolvedData = resolution.mergedData || this.autoMergeData(conflict.localData, conflict.serverData);
          break;
        case 'manual':
          resolvedData = resolution.mergedData;
          break;
      }

      // Re-add to sync queue with resolved data
      await this.addToSyncQueue('form_submission', resolvedData, 'high');

      // Remove from conflicts
      await this.dbService.deleteItem(this.SYNC_CONFLICTS_STORE, conflictId);
      const currentConflicts = this.conflicts$.value;
      this.conflicts$.next(currentConflicts.filter(c => c.id !== conflictId));

    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  }

  // Utility methods
  private async loadSyncQueue(): Promise<void> {
    try {
      const items = (await this.dbService.getAllItems(this.SYNC_QUEUE_STORE)) as SyncItem[];
      const sortedItems = items.sort(this.sortByPriority);
      this.syncQueue$.next(sortedItems);
      this.updateSyncProgress();
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }

  private async loadConflicts(): Promise<void> {
    try {
      const conflicts = (await this.dbService.getAllItems(this.SYNC_CONFLICTS_STORE)) as SyncConflict[];
      this.conflicts$.next(conflicts);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  }

  private async updateSyncItemStatus(itemId: string, status: SyncItem['status'], error?: string): Promise<void> {
    try {
      const item = (await this.dbService.getItem(this.SYNC_QUEUE_STORE, itemId)) as SyncItem;
      if (item) {
        item.status = status;
        if (error) {
          item.lastError = error;
        }
        await this.dbService.setItem(this.SYNC_QUEUE_STORE, itemId, item);

        // Update in-memory queue
        const currentQueue = this.syncQueue$.value;
        const updatedQueue = currentQueue.map(i => i.id === itemId ? item : i);
        this.syncQueue$.next(updatedQueue);
      }
    } catch (error) {
      console.error('Failed to update sync item status:', error);
    }
  }

  private async scheduleRetry(item: SyncItem, error: Error): Promise<void> {
    const retryDelay = Math.min(1000 * Math.pow(2, item.retryCount), 30000); // Exponential backoff, max 30s

    setTimeout(async () => {
      try {
        item.retryCount++;
        item.status = 'pending';
        item.lastError = error.message;

        await this.dbService.setItem(this.SYNC_QUEUE_STORE, item.id, item);

        const currentQueue = this.syncQueue$.value;
        const updatedQueue = currentQueue.map(i => i.id === item.id ? item : i);
        this.syncQueue$.next(updatedQueue);

        if (this.isOnline$.value) {
          this.triggerSync();
        }
      } catch (retryError) {
        console.error('Failed to schedule retry:', retryError);
      }
    }, retryDelay);
  }

  private updateSyncProgress(): void {
    const queue = this.syncQueue$.value;
    const progress: SyncProgress = {
      total: queue.length,
      completed: queue.filter(item => item.status === 'completed').length,
      failed: queue.filter(item => item.status === 'failed').length,
      inProgress: queue.filter(item => item.status === 'syncing').length,
      currentItem: queue.find(item => item.status === 'syncing')
    };

    this.syncProgress$.next(progress);
  }

  private areDependenciesMet(item: SyncItem, queue: SyncItem[]): boolean {
    if (!item.dependencies || item.dependencies.length === 0) {
      return true;
    }

    return item.dependencies.every(depId => {
      const dependency = queue.find(i => i.id === depId);
      return !dependency || dependency.status === 'completed';
    });
  }

  private sortByPriority = (a: SyncItem, b: SyncItem): number => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority];
    const bPriority = priorityOrder[b.priority];

    if (aPriority !== bPriority) {
      return bPriority - aPriority; // High priority first
    }

    return a.timestamp - b.timestamp; // Older items first for same priority
  };

  private getMaxRetries(type: SyncItem['type']): number {
    switch (type) {
      case 'form_submission':
        return 5;
      case 'media_upload':
        return 3;
      case 'template_update':
        return 3;
      case 'form_draft':
        return 2;
      default:
        return 3;
    }
  }

  private autoMergeData(localData: any, serverData: any): any {
    // Simple merge strategy - server wins for conflicts, keep non-conflicting local changes
    return {
      ...serverData,
      ...Object.keys(localData).reduce((acc, key) => {
        if (!(key in serverData)) {
          acc[key] = localData[key];
        }
        return acc;
      }, {} as any)
    };
  }

  // Cleanup
  destroy(): void {
    if (this.syncTimer) {
      this.syncTimer.unsubscribe();
    }

    this.syncQueue$.complete();
    this.syncProgress$.complete();
    this.isOnline$.complete();
    this.isSyncing$.complete();
    this.conflicts$.complete();
  }
}
