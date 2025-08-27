import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  forwardRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

export interface PictureData {
  file: File;
  dataUrl: string;
  name: string;
  size: number;
  type: string;
}

@Component({
  selector: 'app-picture-upload',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PictureUploadComponent),
      multi: true
    }
  ],
  template: `
    <div class="picture-upload-container">
      <!-- Upload Button/Menu -->
      @if (!pictureData && !isCapturing) {
        <div class="upload-controls">
          <button
            mat-raised-button
            color="primary"
            [matMenuTriggerFor]="uploadMenu"
            [disabled]="disabled"
            class="upload-button">
            <mat-icon>add_a_photo</mat-icon>
            {{ placeholder || 'Add Picture' }}
          </button>
          <mat-menu #uploadMenu="matMenu">
            <button mat-menu-item (click)="triggerFileUpload()">
              <mat-icon>upload</mat-icon>
              <span>Upload from Device</span>
            </button>
            @if (isCameraSupported) {
              <button mat-menu-item (click)="startCamera()">
                <mat-icon>camera_alt</mat-icon>
                <span>Take Picture</span>
              </button>
            }
          </mat-menu>
        </div>
      }
    
      <!-- Hidden File Input -->
      <input
        #fileInput
        type="file"
        accept="image/*"
        (change)="onFileSelected($event)"
        style="display: none;">
    
        <!-- Camera Container -->
        @if (isCapturing) {
          <div class="camera-container">
            <mat-card class="camera-card">
              <mat-card-header>
                <mat-card-title>Take Picture</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <video
                  #videoElement
                  autoplay
                  playsinline
                  class="camera-video">
                </video>
                <canvas
                  #canvasElement
                  style="display: none;">
                </canvas>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-button (click)="stopCamera()" color="warn">
                  <mat-icon>close</mat-icon>
                  Cancel
                </button>
                <button mat-raised-button (click)="capturePhoto()" color="primary">
                  <mat-icon>camera</mat-icon>
                  Capture
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        }
    
        <!-- Picture Preview -->
        @if (pictureData && !isCapturing) {
          <div class="picture-preview">
            <mat-card class="preview-card">
              <mat-card-header>
                <mat-card-title>{{ pictureData.name }}</mat-card-title>
                <mat-card-subtitle>{{ formatFileSize(pictureData.size) }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <img
                  [src]="pictureData.dataUrl"
                  [alt]="pictureData.name"
                  class="preview-image">
                </mat-card-content>
                @if (!disabled) {
                  <mat-card-actions align="end">
                    <button mat-button (click)="removePicture()" color="warn">
                      <mat-icon>delete</mat-icon>
                      Remove
                    </button>
                    <button mat-button [matMenuTriggerFor]="replaceMenu" color="primary">
                      <mat-icon>swap_horiz</mat-icon>
                      Replace
                    </button>
                    <mat-menu #replaceMenu="matMenu">
                      <button mat-menu-item (click)="triggerFileUpload()">
                        <mat-icon>upload</mat-icon>
                        <span>Upload Different</span>
                      </button>
                      @if (isCameraSupported) {
                        <button mat-menu-item (click)="startCamera()">
                          <mat-icon>camera_alt</mat-icon>
                          <span>Take New Picture</span>
                        </button>
                      }
                    </mat-menu>
                  </mat-card-actions>
                }
              </mat-card>
            </div>
          }
    
          <!-- Loading Spinner -->
          @if (isProcessing) {
            <div class="loading-container">
              <mat-spinner diameter="50"></mat-spinner>
              <p>Processing image...</p>
            </div>
          }
        </div>
    `,
  styleUrls: ['./picture-upload.component.css']
})
export class PictureUploadComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() placeholder: string = 'Add Picture';
  @Input() maxFileSize: number = 5 * 1024 * 1024; // 5MB default
  @Input() acceptedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  @Input() disabled: boolean = false;
  @Input() required: boolean = false;

  @Output() pictureSelected = new EventEmitter<PictureData>();
  @Output() pictureRemoved = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  pictureData: PictureData | null = null;
  isCapturing = false;
  isProcessing = false;
  isCameraSupported = false;
  mediaStream: MediaStream | null = null;

  // ControlValueAccessor implementation
  private onChange = (value: PictureData | null) => {};
  private onTouched = () => {};

  constructor(private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.checkCameraSupport();
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  // ControlValueAccessor methods
  writeValue(value: PictureData | null): void {
    this.pictureData = value;
  }

  registerOnChange(fn: (value: PictureData | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  private checkCameraSupport(): void {
    this.isCameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  triggerFileUpload(): void {
    if (this.disabled) return;
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!this.validateFile(file)) {
      input.value = ''; // Clear the input
      return;
    }

    this.processFile(file);
  }

  private validateFile(file: File): boolean {
    // Check file type
    if (!this.acceptedTypes.includes(file.type)) {
      this.showError(`File type not supported. Accepted types: ${this.acceptedTypes.join(', ')}`);
      return false;
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      this.showError(`File size too large. Maximum size: ${this.formatFileSize(this.maxFileSize)}`);
      return false;
    }

    return true;
  }

  private processFile(file: File): void {
    this.isProcessing = true;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          this.isProcessing = false;
          this.showError('Error processing image');
          return;
        }
        ctx.drawImage(img, 0, 0);

        // Compress to JPEG
        canvas.toBlob((blob) => {
          if (!blob) {
            this.isProcessing = false;
            this.showError('Error compressing image');
            return;
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' });
          const compressedReader = new FileReader();
          compressedReader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            this.pictureData = {
              file: compressedFile,
              dataUrl,
              name: compressedFile.name,
              size: compressedFile.size,
              type: compressedFile.type
            };
            this.onChange(this.pictureData);
            this.onTouched();
            this.pictureSelected.emit(this.pictureData);
            this.isProcessing = false;
            this.showSuccess('Picture uploaded and compressed');
          };
          compressedReader.onerror = () => {
            this.isProcessing = false;
            this.showError('Error reading compressed image');
          };
          compressedReader.readAsDataURL(compressedFile);
        }, 'image/jpeg', 0.8);
      };
      img.onerror = () => {
        this.isProcessing = false;
        this.showError('Error loading image');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      this.isProcessing = false;
      this.showError('Error reading file');
    };
    reader.readAsDataURL(file);
  }

  async startCamera(): Promise<void> {
    if (!this.isCameraSupported || this.disabled) {
      this.showError('Camera not supported on this device');
      return;
    }

    try {
      this.isCapturing = true;

      // Request camera access with optimal settings for mobile
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment', // Use back camera by default
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Wait for view to update before setting video source
      setTimeout(() => {
        if (this.videoElement && this.mediaStream) {
          this.videoElement.nativeElement.srcObject = this.mediaStream;
        }
      }, 100);

    } catch (error) {
      console.error('Camera access error:', error);
      this.isCapturing = false;
      this.showError('Unable to access camera. Please check permissions.');
    }
  }

  capturePhoto(): void {
    if (!this.videoElement || !this.canvasElement || !this.mediaStream) {
      this.showError('Camera not ready');
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      this.showError('Unable to capture photo');
      return;
    }

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `camera-capture-${timestamp}.jpg`, {
          type: 'image/jpeg'
        });

        this.stopCamera();
        this.processFile(file);
      } else {
        this.showError('Failed to capture photo');
      }
    }, 'image/jpeg', 0.8); // 80% quality
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isCapturing = false;
  }

  removePicture(): void {
    if (this.disabled) return;

    this.pictureData = null;
    this.onChange(null);
    this.onTouched();
    this.pictureRemoved.emit();

    // Clear file input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }

    this.showSuccess('Picture removed');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
    this.error.emit(message);
  }
}
