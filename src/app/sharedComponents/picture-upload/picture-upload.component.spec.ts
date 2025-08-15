import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { PictureUploadComponent } from './picture-upload.component';

describe('PictureUploadComponent', () => {
  let component: PictureUploadComponent;
  let fixture: ComponentFixture<PictureUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PictureUploadComponent,
        MatSnackBarModule,
        BrowserAnimationsModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PictureUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should check camera support on init', () => {
    spyOn(component as any, 'checkCameraSupport');
    component.ngOnInit();
    expect((component as any).checkCameraSupport).toHaveBeenCalled();
  });

  it('should format file size correctly', () => {
    expect(component.formatFileSize(0)).toBe('0 Bytes');
    expect(component.formatFileSize(1024)).toBe('1 KB');
    expect(component.formatFileSize(1048576)).toBe('1 MB');
  });

  it('should validate file types', () => {
    const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });

    expect((component as any).validateFile(validFile)).toBeTruthy();
    expect((component as any).validateFile(invalidFile)).toBeFalsy();
  });

  it('should validate file size', () => {
    const smallFile = new File(['a'.repeat(1000)], 'small.jpg', { type: 'image/jpeg' });
    const largeFile = new File(['a'.repeat(10 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

    expect((component as any).validateFile(smallFile)).toBeTruthy();
    expect((component as any).validateFile(largeFile)).toBeFalsy();
  });

  it('should remove picture correctly', () => {
    spyOn(component.pictureRemoved, 'emit');
    spyOn(component as any, 'onChange');
    spyOn(component as any, 'onTouched');

    component.pictureData = {
      file: new File([''], 'test.jpg'),
      dataUrl: 'data:image/jpeg;base64,test',
      name: 'test.jpg',
      size: 1000,
      type: 'image/jpeg'
    };

    component.removePicture();

    expect(component.pictureData).toBeNull();
    expect(component.pictureRemoved.emit).toHaveBeenCalled();
    expect((component as any).onChange).toHaveBeenCalledWith(null);
    expect((component as any).onTouched).toHaveBeenCalled();
  });

  it('should stop camera on destroy', () => {
    spyOn(component, 'stopCamera');
    component.ngOnDestroy();
    expect(component.stopCamera).toHaveBeenCalled();
  });
});
