import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PictureUploadComponent } from './picture-upload.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

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
    }).compileComponents();

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

  it('should validate file type', () => {
    const validFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const invalidFile = new File([''], 'test.txt', { type: 'text/plain' });

    expect((component as any).validateFile(validFile)).toBeTruthy();
    expect((component as any).validateFile(invalidFile)).toBeFalsy();
  });

  it('should validate file size', () => {
    const smallFile = new File(['small'], 'small.jpg', { type: 'image/jpeg' });
    const largeFile = new File([new ArrayBuffer(10 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

    expect((component as any).validateFile(smallFile)).toBeTruthy();
    expect((component as any).validateFile(largeFile)).toBeFalsy();
  });

  it('should format file size correctly', () => {
    expect(component.formatFileSize(0)).toBe('0 Bytes');
    expect(component.formatFileSize(1024)).toBe('1 KB');
    expect(component.formatFileSize(1024 * 1024)).toBe('1 MB');
  });

  it('should emit events when picture is selected', () => {
    spyOn(component.pictureSelected, 'emit');

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    component['processFile'](file);

    // Wait for async file reading
    setTimeout(() => {
      expect(component.pictureSelected.emit).toHaveBeenCalled();
    }, 100);
  });

  it('should remove picture and emit event', () => {
    spyOn(component.pictureRemoved, 'emit');

    component.pictureData = {
      file: new File([''], 'test.jpg'),
      dataUrl: 'data:image/jpeg;base64,test',
      name: 'test.jpg',
      size: 1024,
      type: 'image/jpeg'
    };

    component.removePicture();

    expect(component.pictureData).toBeNull();
    expect(component.pictureRemoved.emit).toHaveBeenCalled();
  });
});
