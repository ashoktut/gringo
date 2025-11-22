import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { IndexedDbService } from './indexed-db.service';
import { environment } from '../../environments/environment';

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: Date | null;
  pendingChanges: number;
  syncErrors: string[];
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: Date;
  retries: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseSyncService {
  private syncStatusSubject = new BehaviorSubject<SyncStatus>({
    isSyncing: false,
    lastSync: null,
    pendingChanges: 0,
    syncErrors: []
  });

  public syncStatus$ = this.syncStatusSubject.asObservable();
  private syncQueue: SyncQueueItem[] = [];
  private syncSubscription: Subscription | null = null;
  private readonly SYNC_QUEUE_KEY = 'gringo_sync_queue';
  private readonly MAX_RETRIES = 3;

  constructor(
    private supabase: SupabaseService,
    private indexedDb: IndexedDbService
  ) {
    this.loadSyncQueue();
    this.startAutoSync();
    this.setupRealtimeSubscriptions();
  }

  // Auto sync setup
  private startAutoSync(): void {
    if (!environment.sync.autoSync) return;

    this.syncSubscription = interval(environment.sync.syncInterval)
      .pipe(
        filter(() => this.supabase.isOnline && this.supabase.isEnabled),
        switchMap(() => this.syncAll())
      )
      .subscribe({
        next: () => console.log('✅ Auto-sync completed'),
        error: (error) => console.error('❌ Auto-sync error:', error)
      });
  }

  // Real-time subscriptions for server updates
  private setupRealtimeSubscriptions(): void {
    if (!this.supabase.isEnabled) return;

    // Subscribe to form submissions changes
    this.supabase.subscribeToTable('form_submissions', (payload) => {
      console.log('📡 Real-time update:', payload);
      this.handleRealtimeUpdate('form_submissions', payload);
    });

    // Subscribe to templates changes
    this.supabase.subscribeToTable('templates', (payload) => {
      console.log('📡 Real-time update:', payload);
      this.handleRealtimeUpdate('templates', payload);
    });
  }

  private async handleRealtimeUpdate(table: string, payload: any): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      switch (eventType) {
        case 'INSERT':
          await this.indexedDb.save(table, newRecord.id, newRecord).toPromise();
          console.log(`➕ Added ${table} from server:`, newRecord.id);
          break;

        case 'UPDATE':
          await this.indexedDb.save(table, newRecord.id, newRecord).toPromise();
          console.log(`🔄 Updated ${table} from server:`, newRecord.id);
          break;

        case 'DELETE':
          await this.indexedDb.delete(table, oldRecord.id).toPromise();
          console.log(`🗑️ Deleted ${table} from server:`, oldRecord.id);
          break;
      }
    } catch (error) {
      console.error('Error handling real-time update:', error);
    }
  }

  // Queue management
  private loadSyncQueue(): void {
    const stored = localStorage.getItem(this.SYNC_QUEUE_KEY);
    if (stored) {
      try {
        this.syncQueue = JSON.parse(stored);
        this.updateSyncStatus();
      } catch (error) {
        console.error('Failed to load sync queue:', error);
        this.syncQueue = [];
      }
    }
  }

  private saveSyncQueue(): void {
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    this.updateSyncStatus();
  }

  private updateSyncStatus(): void {
    const current = this.syncStatusSubject.value;
    this.syncStatusSubject.next({
      ...current,
      pendingChanges: this.syncQueue.length
    });
  }

  // Add item to sync queue
  addToSyncQueue(action: 'create' | 'update' | 'delete', table: string, data: any): void {
    const item: SyncQueueItem = {
      id: data.id || this.generateId(),
      action,
      table,
      data,
      timestamp: new Date(),
      retries: 0
    };

    this.syncQueue.push(item);
    this.saveSyncQueue();

    // Try immediate sync if online
    if (this.supabase.isOnline && this.supabase.isEnabled) {
      this.syncAll();
    }
  }

  // Sync all pending changes
  async syncAll(): Promise<void> {
    if (!this.supabase.isEnabled || !this.supabase.isOnline) {
      console.log('⏸️ Sync skipped: offline or disabled');
      return;
    }

    if (this.syncQueue.length === 0) {
      console.log('✅ No pending changes to sync');
      return;
    }

    this.syncStatusSubject.next({
      ...this.syncStatusSubject.value,
      isSyncing: true,
      syncErrors: []
    });

    console.log(`🔄 Syncing ${this.syncQueue.length} pending changes...`);

    const errors: string[] = [];
    const itemsToRemove: string[] = [];

    for (const item of this.syncQueue) {
      try {
        await this.syncItem(item);
        itemsToRemove.push(item.id);
        console.log(`✅ Synced ${item.action} on ${item.table}:`, item.id);
      } catch (error: any) {
        item.retries++;

        if (item.retries >= this.MAX_RETRIES) {
          errors.push(`Failed to sync ${item.table} ${item.id}: ${error.message}`);
          itemsToRemove.push(item.id); // Remove after max retries
          console.error(`❌ Max retries reached for ${item.id}`, error);
        } else {
          console.warn(`⚠️ Sync failed (retry ${item.retries}/${this.MAX_RETRIES}):`, error);
        }
      }
    }

    // Remove successfully synced and failed items
    this.syncQueue = this.syncQueue.filter(item => !itemsToRemove.includes(item.id));
    this.saveSyncQueue();

    this.syncStatusSubject.next({
      isSyncing: false,
      lastSync: new Date(),
      pendingChanges: this.syncQueue.length,
      syncErrors: errors
    });

    console.log(`✅ Sync completed. Remaining: ${this.syncQueue.length}`);
  }

  private async syncItem(item: SyncQueueItem): Promise<void> {
    const client = this.supabase.client;
    if (!client) throw new Error('Supabase client not available');

    switch (item.action) {
      case 'create':
        const { error: insertError } = await client
          .from(item.table)
          .insert(item.data);
        if (insertError) throw insertError;
        break;

      case 'update':
        const { error: updateError } = await client
          .from(item.table)
          .update(item.data)
          .eq('id', item.data.id);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await client
          .from(item.table)
          .delete()
          .eq('id', item.data.id);
        if (deleteError) throw deleteError;
        break;
    }
  }

  // Pull data from Supabase to IndexedDB
  async pullFromServer(table: string): Promise<void> {
    if (!this.supabase.isEnabled || !this.supabase.isOnline) {
      console.log('⏸️ Pull skipped: offline or disabled');
      return;
    }

    try {
      console.log(`📥 Pulling ${table} from server...`);

      const client = this.supabase.client;
      if (!client) throw new Error('Supabase client not available');

      const { data, error } = await client
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Clear local data and replace with server data
        await this.indexedDb.clearStore(table).toPromise();

        for (const item of data) {
          await this.indexedDb.save(table, item.id, item).toPromise();
        }

        console.log(`✅ Pulled ${data.length} ${table} records from server`);
      }
    } catch (error) {
      console.error(`❌ Failed to pull ${table}:`, error);
      throw error;
    }
  }

  // Push specific item to server immediately
  async pushToServer(table: string, data: any, action: 'create' | 'update' | 'delete'): Promise<void> {
    if (!this.supabase.isEnabled) {
      console.log('Adding to queue for later sync');
      this.addToSyncQueue(action, table, data);
      return;
    }

    if (!this.supabase.isOnline) {
      console.log('Offline - adding to queue');
      this.addToSyncQueue(action, table, data);
      return;
    }

    try {
      const client = this.supabase.client;
      if (!client) throw new Error('Supabase client not available');

      switch (action) {
        case 'create':
          const { error: insertError } = await client
            .from(table)
            .insert(data);
          if (insertError) throw insertError;
          break;

        case 'update':
          const { error: updateError } = await client
            .from(table)
            .update(data)
            .eq('id', data.id);
          if (updateError) throw updateError;
          break;

        case 'delete':
          const { error: deleteError } = await client
            .from(table)
            .delete()
            .eq('id', data.id);
          if (deleteError) throw deleteError;
          break;
      }

      console.log(`✅ Pushed ${action} to server:`, table, data.id);
    } catch (error) {
      console.error(`❌ Failed to push ${action}:`, error);
      this.addToSyncQueue(action, table, data);
      throw error;
    }
  }

  // Manual sync trigger
  async manualSync(): Promise<void> {
    console.log('🔄 Manual sync triggered');
    await this.syncAll();
  }

  // Clear sync queue (use with caution)
  clearSyncQueue(): void {
    this.syncQueue = [];
    this.saveSyncQueue();
    console.log('🗑️ Sync queue cleared');
  }

  // Get sync status
  getSyncStatus(): SyncStatus {
    return this.syncStatusSubject.value;
  }

  // Check if item exists on server
  async existsOnServer(table: string, id: string): Promise<boolean> {
    if (!this.supabase.isEnabled || !this.supabase.isOnline) {
      return false;
    }

    try {
      const client = this.supabase.client;
      if (!client) return false;

      const { data, error } = await client
        .from(table)
        .select('id')
        .eq('id', id)
        .single();

      return !error && data !== null;
    } catch (error) {
      return false;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  ngOnDestroy(): void {
    if (this.syncSubscription) {
      this.syncSubscription.unsubscribe();
    }
  }
}
