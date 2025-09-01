import { Injectable } from '@angular/core';
import { Observable, from, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { IndexedDbService } from './indexed-db.service';

@Injectable({
  providedIn: 'root'
})
export class StorageMigrationService {

  constructor(private indexedDb: IndexedDbService) {}

  /**
   * Migrate all localStorage data to IndexedDB
   */
  migrateAllLocalStorageData(): Observable<any> {
    console.log('🔄 Starting migration from localStorage to IndexedDB...');

    const migrations = [
      this.migrateSubmissions(),
      this.migrateTemplates(),
      this.migratePdfTemplates()
    ];

    return forkJoin(migrations).pipe(
      map(results => {
        console.log('✅ Migration completed successfully:', results);
        return {
          success: true,
          migratedSubmissions: results[0],
          migratedTemplates: results[1],
          migratedPdfTemplates: results[2]
        };
      }),
      catchError(error => {
        console.error('❌ Migration failed:', error);
        return of({ success: false, error });
      })
    );
  }

  /**
   * Migrate form submissions from localStorage
   */
  private migrateSubmissions(): Observable<any> {
    const localStorageKey = 'gringo_submissions';
    const localData = localStorage.getItem(localStorageKey);

    if (!localData) {
      console.log('ℹ️ No submissions found in localStorage');
      return of({ migrated: 0, skipped: 0 });
    }

    try {
      const submissions = JSON.parse(localData);
      if (!Array.isArray(submissions) || submissions.length === 0) {
        return of({ migrated: 0, skipped: 0 });
      }

      console.log(`🔄 Migrating ${submissions.length} submissions...`);

      // Save each submission to IndexedDB
      const saveOperations = submissions.map(submission =>
        this.indexedDb.save('submissions', submission.id, submission)
      );

      return forkJoin(saveOperations).pipe(
        map(results => {
          console.log(`✅ Migrated ${results.length} submissions`);
          return { migrated: results.length, skipped: 0 };
        }),
        catchError(error => {
          console.error('❌ Failed to migrate submissions:', error);
          return of({ migrated: 0, skipped: submissions.length, error });
        })
      );
    } catch (error) {
      console.error('❌ Error parsing submissions from localStorage:', error);
      return of({ migrated: 0, skipped: 0, error });
    }
  }

  /**
   * Migrate templates from localStorage
   */
  private migrateTemplates(): Observable<any> {
    const localStorageKey = 'gringo_templates';
    const localData = localStorage.getItem(localStorageKey);

    if (!localData) {
      console.log('ℹ️ No templates found in localStorage');
      return of({ migrated: 0, skipped: 0 });
    }

    try {
      const templates = JSON.parse(localData);
      if (!Array.isArray(templates) || templates.length === 0) {
        return of({ migrated: 0, skipped: 0 });
      }

      console.log(`🔄 Migrating ${templates.length} templates...`);

      // Save each template to IndexedDB
      const saveOperations = templates.map(template =>
        this.indexedDb.save('templates', template.id, template)
      );

      return forkJoin(saveOperations).pipe(
        map(results => {
          console.log(`✅ Migrated ${results.length} templates`);
          return { migrated: results.length, skipped: 0 };
        }),
        catchError(error => {
          console.error('❌ Failed to migrate templates:', error);
          return of({ migrated: 0, skipped: templates.length, error });
        })
      );
    } catch (error) {
      console.error('❌ Error parsing templates from localStorage:', error);
      return of({ migrated: 0, skipped: 0, error });
    }
  }

  /**
   * Migrate PDF templates from localStorage
   */
  private migratePdfTemplates(): Observable<any> {
    const localStorageKey = 'gringo_pdf_templates';
    const localData = localStorage.getItem(localStorageKey);

    if (!localData) {
      console.log('ℹ️ No PDF templates found in localStorage');
      return of({ migrated: 0, skipped: 0 });
    }

    try {
      const pdfTemplates = JSON.parse(localData);
      if (!Array.isArray(pdfTemplates) || pdfTemplates.length === 0) {
        return of({ migrated: 0, skipped: 0 });
      }

      console.log(`🔄 Migrating ${pdfTemplates.length} PDF templates...`);

      // Save each PDF template to IndexedDB
      const saveOperations = pdfTemplates.map(template =>
        this.indexedDb.save('pdf_templates', template.id, template)
      );

      return forkJoin(saveOperations).pipe(
        map(results => {
          console.log(`✅ Migrated ${results.length} PDF templates`);
          return { migrated: results.length, skipped: 0 };
        }),
        catchError(error => {
          console.error('❌ Failed to migrate PDF templates:', error);
          return of({ migrated: 0, skipped: pdfTemplates.length, error });
        })
      );
    } catch (error) {
      console.error('❌ Error parsing PDF templates from localStorage:', error);
      return of({ migrated: 0, skipped: 0, error });
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): Observable<any> {
    return this.indexedDb.getStorageStats().pipe(
      map(stats => {
        const localStorageSize = this.getLocalStorageSize();
        return {
          ...stats,
          localStorage: {
            size: localStorageSize,
            items: this.getLocalStorageItemCount()
          }
        };
      })
    );
  }

  /**
   * Get localStorage size in bytes
   */
  private getLocalStorageSize(): number {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  /**
   * Get number of items in localStorage
   */
  private getLocalStorageItemCount(): number {
    return localStorage.length;
  }

  /**
   * Clear localStorage data after successful migration
   */
  clearLocalStorageData(): Observable<any> {
    try {
      const keysToRemove = [
        'gringo_submissions',
        'gringo_templates',
        'gringo_pdf_templates'
      ];

      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed ${key} from localStorage`);
        }
      });

      return of({ success: true, clearedKeys: keysToRemove });
    } catch (error) {
      console.error('❌ Error clearing localStorage:', error);
      return of({ success: false, error });
    }
  }

  /**
   * Clear all IndexedDB data (use for testing/reset)
   */
  clearAllIndexedDBData(): Observable<boolean> {
    const stores = Object.values(this.indexedDb.STORES);
    const clears = stores.map(store => this.indexedDb.clearStore(store));

    return forkJoin(clears).pipe(
      map(() => {
        console.log('✅ All IndexedDB stores cleared');
        return true;
      }),
      catchError(error => {
        console.error('❌ Failed to clear IndexedDB stores:', error);
        return of(false);
      })
    );
  }
}
