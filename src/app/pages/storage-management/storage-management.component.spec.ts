import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StorageManagementComponent } from './storage-management.component';

describe('StorageManagementComponent', () => {
  let component: StorageManagementComponent;
  let fixture: ComponentFixture<StorageManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorageManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StorageManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
