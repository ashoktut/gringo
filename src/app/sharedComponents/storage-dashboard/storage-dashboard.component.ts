import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, combineLatest } from 'rxjs';
import { takeUntil, startWith, switchMap } from 'rxjs/operators';

// Angular Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';

// Services
import { StorageMigrationService } from '../../services/storage-migration.service';
import { IndexedDbService } from '../../services/indexed-db.service';

interface StorageStats {
  indexedDb: {
    totalSize: number;
    storeStats: { [storeName: string]: { count: number; size: number } };
  };
  localStorage: {
    size: number;
    items: number;
  };
}

interface MigrationResult {
  success: boolean;
  migratedSubmissions?: number;
  migratedTemplates?: number;
  migratedPdfTemplates?: number;
  error?: any;
}

@Component({
  selector: 'app-storage-dashboard',
  templateUrl: './storage-dashboard.component.html',
  styleUrls: ['./storage-dashboard.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatChipsModule,
    MatExpansionModule,
    MatDividerModule,
    MatTooltipModule,
    MatTabsModule,
    MatTableModule
  ]
})
export class StorageDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State management
  isLoading = false;
  isMigrating = false;
  isClearing = false;
  stats: StorageStats | null = null;
  lastUpdated: Date | null = null;

  // Migration results
  lastMigrationResult: MigrationResult | null = null;

  // Auto-refresh
  autoRefresh = true;
  refreshInterval = 10000; // 10 seconds

  // Table data for storage breakdown
  storageBreakdownData: any[] = [];
  displayedColumns: string[] = ['store', 'items', 'size', 'actions'];

  constructor(
    private storageMigration: StorageMigrationService,
    private indexedDb: IndexedDbService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadStorageStats();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Setup auto-refresh of storage stats
   */
  private setupAutoRefresh(): void {
    combineLatest([
      interval(this.refreshInterval).pipe(startWith(0)),
      this.destroy$
    ]).pipe(
      takeUntil(this.destroy$),
      switchMap(() => this.autoRefresh ? this.storageMigration.getStorageStats() : [])
    ).subscribe({
      next: (stats) => {
        if (stats) {
          this.updateStats(stats);
        }
      },
      error: (error) => {
        console.error('Error refreshing stats:', error);
      }
    });
  }

  /**
   * Load storage statistics
   */
  loadStorageStats(): void {
    this.isLoading = true;

    this.storageMigration.getStorageStats().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats) => {
        this.updateStats(stats);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading storage stats:', error);
        this.showSnackBar('Failed to load storage statistics', 'error');
        this.isLoading = false;
      }
    });
  }

  /**
   * Update stats and prepare table data
   */
  private updateStats(stats: StorageStats): void {
    this.stats = stats;
    this.lastUpdated = new Date();

    // Prepare table data
    this.storageBreakdownData = [];

    if (stats.indexedDb?.storeStats) {
      Object.entries(stats.indexedDb.storeStats).forEach(([storeName, storeData]) => {
        this.storageBreakdownData.push({
          store: storeName,
          items: storeData.count,
          size: storeData.size,
          type: 'IndexedDB'
        });
      });
    }

    if (stats.localStorage) {
      this.storageBreakdownData.push({
        store: 'localStorage',
        items: stats.localStorage.items,
        size: stats.localStorage.size,
        type: 'localStorage'
      });
    }
  }

  /**
   * Migrate all localStorage data to IndexedDB
   */
  migrateData(): void {
    this.isMigrating = true;
    this.lastMigrationResult = null;

    this.storageMigration.migrateAllLocalStorageData().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        this.lastMigrationResult = result;
        this.isMigrating = false;

        if (result.success) {
          const totalMigrated = (result.migratedSubmissions || 0) +
                               (result.migratedTemplates || 0) +
                               (result.migratedPdfTemplates || 0);
          this.showSnackBar(`Successfully migrated ${totalMigrated} items to IndexedDB`, 'success');
        } else {
          this.showSnackBar('Migration failed: ' + (result.error?.message || 'Unknown error'), 'error');
        }

        // Refresh stats after migration
        this.loadStorageStats();
      },
      error: (error) => {
        console.error('Migration error:', error);
        this.showSnackBar('Migration failed: ' + error.message, 'error');
        this.isMigrating = false;
      }
    });
  }

  /**
   * Clear localStorage data
   */
  clearLocalStorage(): void {
    if (!confirm('Are you sure you want to clear localStorage data? This action cannot be undone.')) {
      return;
    }

    this.isClearing = true;

    this.storageMigration.clearLocalStorageData().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (result) => {
        this.isClearing = false;

        if (result.success) {
          this.showSnackBar(`Cleared ${result.clearedKeys?.length || 0} localStorage keys`, 'success');
        } else {
          this.showSnackBar('Failed to clear localStorage: ' + (result.error?.message || 'Unknown error'), 'error');
        }

        // Refresh stats after clearing
        this.loadStorageStats();
      },
      error: (error) => {
        console.error('Clear localStorage error:', error);
        this.showSnackBar('Failed to clear localStorage: ' + error.message, 'error');
        this.isClearing = false;
      }
    });
  }

  /**
   * Clear specific IndexedDB store
   */
  clearIndexedDbStore(storeName: string): void {
    if (!confirm(`Are you sure you want to clear all data from "${storeName}" store? This action cannot be undone.`)) {
      return;
    }

    this.indexedDb.clearStore(storeName).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.showSnackBar(`Cleared ${storeName} store successfully`, 'success');
        this.loadStorageStats();
      },
      error: (error) => {
        console.error(`Error clearing ${storeName} store:`, error);
        this.showSnackBar(`Failed to clear ${storeName} store: ` + error.message, 'error');
      }
    });
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    this.showSnackBar(
      `Auto-refresh ${this.autoRefresh ? 'enabled' : 'disabled'}`,
      'info'
    );
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get storage usage percentage
   */
  getStorageUsagePercentage(): number {
    if (!this.stats) return 0;

    const totalUsed = (this.stats.indexedDb?.totalSize || 0) + (this.stats.localStorage?.size || 0);
    const estimatedLimit = 50 * 1024 * 1024; // Assume 50MB limit for demonstration

    return Math.min((totalUsed / estimatedLimit) * 100, 100);
  }

  /**
   * Get status color based on usage
   */
  getUsageColor(): string {
    const percentage = this.getStorageUsagePercentage();

    if (percentage < 50) return 'primary';
    if (percentage < 80) return 'accent';
    return 'warn';
  }

  /**
   * Show snack bar message
   */
  private showSnackBar(message: string, type: 'success' | 'error' | 'info'): void {
    const config = {
      duration: 3000,
      panelClass: [`snackbar-${type}`]
    };

    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Export storage data as JSON
   */
  exportStorageData(): void {
    if (!this.stats) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      stats: this.stats,
      breakdown: this.storageBreakdownData
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `storage-stats-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.showSnackBar('Storage data exported successfully', 'success');
  }
}
