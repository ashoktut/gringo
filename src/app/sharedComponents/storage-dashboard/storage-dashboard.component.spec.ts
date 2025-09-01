import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { StorageDashboardComponent } from './storage-dashboard.component';
import { StorageMigrationService } from '../../services/storage-migration.service';
import { IndexedDbService } from '../../services/indexed-db.service';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('StorageDashboardComponent', () => {
  let component: StorageDashboardComponent;
  let fixture: ComponentFixture<StorageDashboardComponent>;
  let mockStorageMigrationService: jasmine.SpyObj<StorageMigrationService>;
  let mockIndexedDbService: jasmine.SpyObj<IndexedDbService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const storageMigrationSpy = jasmine.createSpyObj('StorageMigrationService', [
      'getStorageStats',
      'migrateAllLocalStorageData',
      'clearLocalStorageData'
    ]);
    const indexedDbSpy = jasmine.createSpyObj('IndexedDbService', ['clearStore']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [StorageDashboardComponent, NoopAnimationsModule],
      providers: [
        { provide: StorageMigrationService, useValue: storageMigrationSpy },
        { provide: IndexedDbService, useValue: indexedDbSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StorageDashboardComponent);
    component = fixture.componentInstance;
    mockStorageMigrationService = TestBed.inject(StorageMigrationService) as jasmine.SpyObj<StorageMigrationService>;
    mockIndexedDbService = TestBed.inject(IndexedDbService) as jasmine.SpyObj<IndexedDbService>;
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;

    // Setup default mock returns
    mockStorageMigrationService.getStorageStats.and.returnValue(of({
      indexedDb: {
        totalSize: 1024,
        storeStats: {
          submissions: { count: 5, size: 512 },
          templates: { count: 3, size: 256 }
        }
      },
      localStorage: {
        size: 256,
        items: 2
      }
    }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load storage stats on init', () => {
    component.ngOnInit();
    expect(mockStorageMigrationService.getStorageStats).toHaveBeenCalled();
    expect(component.stats).toBeTruthy();
  });

  it('should calculate storage usage percentage', () => {
    component.stats = {
      indexedDb: { totalSize: 1024, storeStats: {} },
      localStorage: { size: 256, items: 2 }
    };
    const percentage = component.getStorageUsagePercentage();
    expect(percentage).toBeGreaterThan(0);
  });

  it('should format bytes correctly', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(1048576)).toBe('1 MB');
  });

  it('should trigger migration', () => {
    mockStorageMigrationService.migrateAllLocalStorageData.and.returnValue(of({
      success: true,
      migratedSubmissions: 5,
      migratedTemplates: 3,
      migratedPdfTemplates: 1
    }));

    component.migrateData();
    expect(mockStorageMigrationService.migrateAllLocalStorageData).toHaveBeenCalled();
    expect(component.isMigrating).toBe(false);
  });

  it('should clear localStorage', () => {
    mockStorageMigrationService.clearLocalStorageData.and.returnValue(of({
      success: true,
      clearedKeys: ['key1', 'key2']
    }));

    spyOn(window, 'confirm').and.returnValue(true);
    component.clearLocalStorage();
    expect(mockStorageMigrationService.clearLocalStorageData).toHaveBeenCalled();
  });

  it('should clear IndexedDB store', () => {
    mockIndexedDbService.clearStore.and.returnValue(of(true));
    spyOn(window, 'confirm').and.returnValue(true);

    component.clearIndexedDbStore('submissions');
    expect(mockIndexedDbService.clearStore).toHaveBeenCalledWith('submissions');
  });
});
