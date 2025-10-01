import { Component, Input, OnInit, OnDestroy, forwardRef, ViewChild, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface VideoData {
  file: File;
  dataUrl: string;
  duration: number;
  size: string;
  timestamp: Date;
}

@Component({
  selector: 'app-video-upload',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VideoUploadComponent),
      multi: true
    }
  ],
  template: `
    <div class="video-upload-container">
      <!-- Label -->
      <label *ngIf="label" class="video-upload-label">
        {{ label }}
        <span *ngIf="required" class="required-asterisk">*</span>
      </label>

      <!-- Upload Area -->
      <div class="video-upload-area"
           [class.has-video]="currentVideo"
           [class.recording]="isRecording"
           [class.disabled]="disabled">

        <!-- Video Preview -->
        <div *ngIf="currentVideo && !isRecording" class="video-preview">
          <video
            #videoPreview
            [src]="currentVideo.dataUrl"
            controls
            class="preview-video">
          </video>

          <div class="video-info">
            <div class="video-metadata">
              <span class="duration">{{ formatDuration(currentVideo.duration) }}</span>
              <span class="size">{{ currentVideo.size }}</span>
            </div>
            <div class="video-timestamp">
              {{ currentVideo.timestamp | date:'short' }}
            </div>
          </div>

          <div class="video-actions">
            <button type="button" class="btn btn-secondary btn-sm" (click)="retakeVideo()">
              <span class="btn-icon">🔄</span>
              Retake
            </button>
            <button type="button" class="btn btn-danger btn-sm" (click)="removeVideo()">
              <span class="btn-icon">🗑️</span>
              Remove
            </button>
          </div>
        </div>

        <!-- Recording View -->
        <div *ngIf="isRecording" class="recording-view">
          <video
            #liveVideo
            autoplay
            muted
            playsinline
            class="live-video">
          </video>

          <div class="recording-overlay">
            <div class="recording-indicator">
              <span class="recording-dot"></span>
              Recording {{ formatDuration(recordingDuration) }}
            </div>

            <div class="recording-controls">
              <button type="button" class="btn btn-danger" (click)="stopRecording()">
                <span class="btn-icon">⏹️</span>
                Stop Recording
              </button>
              <button type="button" class="btn btn-secondary" (click)="cancelRecording()">
                <span class="btn-icon">❌</span>
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Upload Options -->
        <div *ngIf="!currentVideo && !isRecording" class="upload-options">
          <div class="upload-prompt">
            <div class="upload-icon">🎥</div>
            <p class="upload-text">{{ placeholder || 'Record or upload a video' }}</p>

            <div class="upload-buttons">
              <button
                type="button"
                class="btn btn-primary"
                (click)="startRecording()"
                [disabled]="!cameraSupported">
                <span class="btn-icon">📹</span>
                Record Video
              </button>

              <button
                type="button"
                class="btn btn-secondary"
                (click)="triggerFileInput()">
                <span class="btn-icon">📁</span>
                Upload Video
              </button>
            </div>

            <div class="upload-constraints" *ngIf="showConstraints">
              <small>
                Max size: {{ maxSizeMB }}MB •
                Max duration: {{ maxDurationSeconds }}s •
                Formats: {{ acceptedFormats.join(', ') }}
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Hidden File Input -->
      <input
        #fileInput
        type="file"
        accept="video/*"
        (change)="onFileSelected($event)"
        style="display: none">

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styleUrls: ['./video-upload.component.css']
})
export class VideoUploadComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('liveVideo') liveVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoPreview') videoPreview!: ElementRef<HTMLVideoElement>;

  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() maxSizeMB = 50; // 50MB default
  @Input() maxDurationSeconds = 300; // 5 minutes default
  @Input() acceptedFormats = ['mp4', 'mov', 'avi', 'webm'];
  @Input() showConstraints = true;

  // Component state
  currentVideo: VideoData | null = null;
  isRecording = false;
  recordingDuration = 0;
  errorMessage = '';
  cameraSupported = false;

  // Recording infrastructure
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimer: any;

  // ControlValueAccessor
  private onChange = (value: VideoData | null) => {};
  private onTouched = () => {};

  ngOnInit(): void {
    this.checkCameraSupport();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ===== CAMERA & RECORDING =====

  private async checkCameraSupport(): Promise<void> {
    try {
      this.cameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    } catch {
      this.cameraSupported = false;
    }
  }

  async startRecording(): Promise<void> {
    try {
      this.errorMessage = '';

      // Request camera permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });

      this.liveVideo.nativeElement.srcObject = this.mediaStream;

      // Setup MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      this.recordedChunks = [];
      this.recordingDuration = 0;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecordedVideo();
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;

      // Start timer
      this.recordingTimer = setInterval(() => {
        this.recordingDuration++;

        // Auto-stop at max duration
        if (this.recordingDuration >= this.maxDurationSeconds) {
          this.stopRecording();
        }
      }, 1000);

    } catch (error) {
      this.errorMessage = 'Failed to access camera: ' + (error as Error).message;
      this.cleanup();
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  cancelRecording(): void {
    this.cleanup();
    this.recordedChunks = [];
  }

  private async processRecordedVideo(): Promise<void> {
    if (this.recordedChunks.length === 0) return;

    try {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });

      // Validate file size
      if (blob.size > this.maxSizeMB * 1024 * 1024) {
        this.errorMessage = `Video size (${this.formatFileSize(blob.size)}) exceeds maximum allowed (${this.maxSizeMB}MB)`;
        return;
      }

      // Create File object
      const file = new File([blob], `recorded_video_${Date.now()}.webm`, { type: 'video/webm' });
      const dataUrl = URL.createObjectURL(blob);

      // Create video data
      this.currentVideo = {
        file,
        dataUrl,
        duration: this.recordingDuration,
        size: this.formatFileSize(blob.size),
        timestamp: new Date()
      };

      // Emit change
      this.onChange(this.currentVideo);
      this.onTouched();

    } catch (error) {
      this.errorMessage = 'Failed to process recorded video: ' + (error as Error).message;
    }
  }

  // ===== FILE UPLOAD =====

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      this.errorMessage = '';

      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !this.acceptedFormats.includes(fileExtension)) {
        this.errorMessage = `Invalid file format. Accepted formats: ${this.acceptedFormats.join(', ')}`;
        return;
      }

      // Validate file size
      if (file.size > this.maxSizeMB * 1024 * 1024) {
        this.errorMessage = `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed (${this.maxSizeMB}MB)`;
        return;
      }

      // Get video duration
      const duration = await this.getVideoDuration(file);

      // Validate duration
      if (duration > this.maxDurationSeconds) {
        this.errorMessage = `Video duration (${this.formatDuration(duration)}) exceeds maximum allowed (${this.formatDuration(this.maxDurationSeconds)})`;
        return;
      }

      // Create data URL
      const dataUrl = URL.createObjectURL(file);

      // Create video data
      this.currentVideo = {
        file,
        dataUrl,
        duration,
        size: this.formatFileSize(file.size),
        timestamp: new Date()
      };

      // Emit change
      this.onChange(this.currentVideo);
      this.onTouched();

    } catch (error) {
      this.errorMessage = 'Failed to process video file: ' + (error as Error).message;
    } finally {
      // Reset input
      input.value = '';
    }
  }

  // ===== VIDEO MANAGEMENT =====

  retakeVideo(): void {
    if (this.cameraSupported) {
      this.removeVideo();
      this.startRecording();
    } else {
      this.triggerFileInput();
    }
  }

  removeVideo(): void {
    if (this.currentVideo) {
      URL.revokeObjectURL(this.currentVideo.dataUrl);
      this.currentVideo = null;
      this.onChange(null);
      this.onTouched();
    }
  }

  // ===== UTILITY METHODS =====

  private async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };

      video.src = URL.createObjectURL(file);
    });
  }

  // Public method for template access
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private cleanup(): void {
    this.isRecording = false;
    this.recordingDuration = 0;

    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  // ===== CONTROL VALUE ACCESSOR =====

  writeValue(value: VideoData | null): void {
    this.currentVideo = value;
  }

  registerOnChange(fn: (value: VideoData | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
