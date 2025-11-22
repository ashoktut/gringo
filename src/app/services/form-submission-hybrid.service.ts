import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, from, throwError } from 'rxjs';
import { switchMap, catchError, tap, map } from 'rxjs/operators';
import { FormSection } from '../sharedComponents/reusable-form/reusable-form.component';
import { IndexedDbService } from './indexed-db.service';
import { SupabaseSyncService } from './supabase-sync.service';
import { SupabaseService } from './supabase.service';

export interface FormSubmission {
  id?: string; // Supabase primary key
  submissionId: string; // Your custom ID
  formType: string;
  formTitle: string;
  formData: any;
  formStructure: FormSection[];
  status: 'draft' | 'submitted' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  isRepeatedSubmission?: boolean;
  originalSubmissionId?: string;
  emailStatus?: any;
  configurationId?: string;
  configurationName?: string;
  companyId?: string;
  configurationVersion?: string;
  userId?: string; // Supabase user ID
  syncStatus?: 'pending' | 'synced' | 'conflict';
}

/**
 * Enhanced Form Submission Service with Hybrid Sync
 * - Always writes to IndexedDB first (offline-first)
 * - Syncs to Supabase when online
 * - Handles conflict resolution
 */
@Injectable({
  providedIn: 'root'
})
export class FormSubmissionHybridService {
  private readonly TABLE_NAME = 'form_submissions';
  private submissionsSubject = new BehaviorSubject<FormSubmission[]>([]);
  public submissions$ = this.submissionsSubject.asObservable();

  constructor(
    private indexedDb: IndexedDbService,
    private syncService: SupabaseSyncService,
    private supabase: SupabaseService
  ) {
    this.loadSubmissions();
    this.setupRealtimeSync();
  }

  private async loadSubmissions(): Promise<void> {
    try {
      // Always load from IndexedDB first (offline-first)
      const storedItems = await this.indexedDb.getAll<FormSubmission>(this.TABLE_NAME).toPromise();
      const submissions = storedItems ? storedItems.map(item => item.data) : [];
      this.submissionsSubject.next(submissions);
      console.log(`📋 Loaded ${submissions.length} submissions from IndexedDB`);

      // If online and Supabase enabled, pull latest from server
      if (this.supabase.isOnline && this.supabase.isEnabled) {
        await this.pullFromServer();
      }
    } catch (error) {
      console.error('❌ Failed to load submissions:', error);
    }
  }

  private setupRealtimeSync(): void {
    // Listen to online status changes
    this.supabase.isOnline$.subscribe(isOnline => {
      if (isOnline && this.supabase.isEnabled) {
        console.log('🌐 Online - triggering sync');
        this.syncService.syncAll();
      }
    });
  }

  /**
   * Create new submission (offline-first with auto-sync)
   */
  async createSubmission(
    formType: string,
    formTitle: string,
    formData: any,
    formStructure: FormSection[]
  ): Promise<FormSubmission> {
    try {
      const submission: FormSubmission = {
        submissionId: this.generateId(),
        formType,
        formTitle,
        formData: this.sanitizeForStorage(formData),
        formStructure: this.sanitizeFormStructure(formStructure),
        status: 'submitted',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: this.supabase.currentUserValue?.id,
        syncStatus: 'pending'
      };

      // 1. Save to IndexedDB first (immediate, offline-capable)
      await this.indexedDb.save(this.TABLE_NAME, submission.submissionId, submission).toPromise();
      console.log('✅ Submission saved to IndexedDB:', submission.submissionId);

      // 2. Update local state
      const current = this.submissionsSubject.value;
      this.submissionsSubject.next([submission, ...current]);

      // 3. Queue for sync to Supabase
      if (this.supabase.isEnabled) {
        this.syncService.addToSyncQueue('create', this.TABLE_NAME, submission);

        // If online, try immediate sync
        if (this.supabase.isOnline) {
          try {
            await this.syncService.pushToServer(this.TABLE_NAME, submission, 'create');
            submission.syncStatus = 'synced';
            await this.indexedDb.save(this.TABLE_NAME, submission.submissionId, submission).toPromise();
          } catch (error) {
            console.log('⏸️ Will sync later:', error);
          }
        }
      }

      return submission;
    } catch (error) {
      console.error('❌ Failed to create submission:', error);
      throw error;
    }
  }

  /**
   * Get all submissions (from IndexedDB)
   */
  getAllSubmissions(): Observable<FormSubmission[]> {
    return this.indexedDb.getAll<FormSubmission>(this.TABLE_NAME).pipe(
      map(items => items.map(item => item.data))
    );
  }

  /**
   * Get single submission by ID
   */
  getSubmission(submissionId: string): Observable<FormSubmission | null> {
    return this.indexedDb.getById<FormSubmission>(this.TABLE_NAME, submissionId).pipe(
      map(item => item ? item.data : null)
    );
  }

  /**
   * Update submission (offline-first with auto-sync)
   */
  async updateSubmission(submission: FormSubmission): Promise<void> {
    try {
      submission.updatedAt = new Date();
      submission.syncStatus = 'pending';

      // 1. Update IndexedDB first
      await this.indexedDb.save(this.TABLE_NAME, submission.submissionId, submission).toPromise();
      console.log('✅ Submission updated in IndexedDB:', submission.submissionId);

      // 2. Update local state
      const current = this.submissionsSubject.value;
      const index = current.findIndex(s => s.submissionId === submission.submissionId);
      if (index !== -1) {
        current[index] = submission;
        this.submissionsSubject.next([...current]);
      }

      // 3. Queue for sync
      if (this.supabase.isEnabled) {
        this.syncService.addToSyncQueue('update', this.TABLE_NAME, submission);

        if (this.supabase.isOnline) {
          try {
            await this.syncService.pushToServer(this.TABLE_NAME, submission, 'update');
            submission.syncStatus = 'synced';
            await this.indexedDb.save(this.TABLE_NAME, submission.submissionId, submission).toPromise();
          } catch (error) {
            console.log('⏸️ Will sync later:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to update submission:', error);
      throw error;
    }
  }

  /**
   * Delete submission (offline-first with auto-sync)
   */
  deleteSubmission(submissionId: string): Observable<void> {
    return from(this.performDelete(submissionId));
  }

  private async performDelete(submissionId: string): Promise<void> {
    try {
      // 1. Delete from IndexedDB first
      await this.indexedDb.delete(this.TABLE_NAME, submissionId).toPromise();
      console.log('✅ Submission deleted from IndexedDB:', submissionId);

      // 2. Update local state
      const current = this.submissionsSubject.value;
      const filtered = current.filter(s => s.submissionId !== submissionId);
      this.submissionsSubject.next(filtered);

      // 3. Queue for sync
      if (this.supabase.isEnabled) {
        this.syncService.addToSyncQueue('delete', this.TABLE_NAME, { id: submissionId });

        if (this.supabase.isOnline) {
          try {
            await this.syncService.pushToServer(this.TABLE_NAME, { id: submissionId }, 'delete');
          } catch (error) {
            console.log('⏸️ Will sync delete later:', error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to delete submission:', error);
      throw error;
    }
  }

  /**
   * Pull latest data from Supabase
   */
  async pullFromServer(): Promise<void> {
    if (!this.supabase.isEnabled || !this.supabase.isOnline) {
      console.log('⏸️ Pull skipped: offline or disabled');
      return;
    }

    try {
      await this.syncService.pullFromServer(this.TABLE_NAME);

      // Reload from IndexedDB after pull
      const storedItems = await this.indexedDb.getAll<FormSubmission>(this.TABLE_NAME).toPromise();
      const submissions = storedItems ? storedItems.map(item => item.data) : [];
      this.submissionsSubject.next(submissions);

      console.log('✅ Pulled latest submissions from server');
    } catch (error) {
      console.error('❌ Failed to pull from server:', error);
    }
  }

  /**
   * Manual sync trigger
   */
  async manualSync(): Promise<void> {
    console.log('🔄 Manual sync triggered for submissions');
    await this.syncService.syncAll();
    await this.pullFromServer();
  }

  /**
   * Get sync status for a submission
   */
  async getSyncStatus(submissionId: string): Promise<string> {
    try {
      const item = await this.indexedDb.getById<FormSubmission>(this.TABLE_NAME, submissionId).toPromise();
      return item?.data?.syncStatus || 'unknown';
    } catch (error) {
      return 'error';
    }
  }

  // Helper methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeForStorage(formData: any): any {
    const sanitized = { ...formData };

    // Remove file objects (convert to metadata only)
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] instanceof File) {
        sanitized[key] = {
          name: sanitized[key].name,
          size: sanitized[key].size,
          type: sanitized[key].type,
          lastModified: sanitized[key].lastModified
        };
      }
    });

    return sanitized;
  }

  private sanitizeFormStructure(formStructure: FormSection[]): FormSection[] {
    // FormSection structure doesn't need field value sanitization
    // as form data is stored separately in formData
    return formStructure;
  }
}
