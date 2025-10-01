import { Component, Input, OnInit, OnDestroy, forwardRef, ViewChild, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface AudioData {
  file: File;
  dataUrl: string;
  duration: number;
  size: string;
  timestamp: Date;
  waveformData?: number[];
}

@Component({
  selector: 'app-audio-recorder',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AudioRecorderComponent),
      multi: true
    }
  ],
  template: `
    <div class="audio-recorder-container">
      <!-- Label -->
      <label *ngIf="label" class="audio-recorder-label">
        {{ label }}
        <span *ngIf="required" class="required-asterisk">*</span>
      </label>

      <!-- Recorder Area -->
      <div class="audio-recorder-area"
           [class.has-audio]="currentAudio"
           [class.recording]="isRecording"
           [class.disabled]="disabled">

        <!-- Audio Preview -->
        <div *ngIf="currentAudio && !isRecording" class="audio-preview">
          <div class="audio-player">
            <audio
              #audioPlayer
              [src]="currentAudio.dataUrl"
              controls
              class="audio-element">
            </audio>
          </div>

          <!-- Waveform Visualization -->
          <div class="waveform-container" *ngIf="showWaveform">
            <canvas
              #waveformCanvas
              class="waveform-canvas"
              width="300"
              height="60">
            </canvas>
          </div>

          <div class="audio-info">
            <div class="audio-metadata">
              <span class="duration">{{ getFormattedDuration(currentAudio.duration) }}</span>
              <span class="size">{{ currentAudio.size }}</span>
            </div>
            <div class="audio-timestamp">
              {{ currentAudio.timestamp | date:'short' }}
            </div>
          </div>

          <div class="audio-actions">
            <button type="button" class="btn btn-secondary btn-sm" (click)="rerecordAudio()">
              <span class="btn-icon">🔄</span>
              Re-record
            </button>
            <button type="button" class="btn btn-danger btn-sm" (click)="removeAudio()">
              <span class="btn-icon">🗑️</span>
              Remove
            </button>
          </div>
        </div>

        <!-- Recording View -->
        <div *ngIf="isRecording" class="recording-view">
          <!-- Live Waveform -->
          <div class="live-waveform-container">
            <canvas
              #liveWaveformCanvas
              class="live-waveform-canvas"
              width="300"
              height="80">
            </canvas>
          </div>

          <div class="recording-info">
            <div class="recording-indicator">
              <span class="recording-dot"></span>
              Recording {{ getFormattedDuration(recordingDuration) }}
            </div>

            <div class="volume-indicator">
              <div class="volume-bar">
                <div class="volume-level" [style.width.%]="volumeLevel"></div>
              </div>
              <span class="volume-text">{{ volumeLevel.toFixed(0) }}%</span>
            </div>
          </div>

          <div class="recording-controls">
            <button
              type="button"
              class="btn btn-danger"
              (click)="stopRecording()">
              <span class="btn-icon">⏹️</span>
              Stop Recording
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              (click)="pauseRecording()"
              *ngIf="!isPaused">
              <span class="btn-icon">⏸️</span>
              Pause
            </button>
            <button
              type="button"
              class="btn btn-primary"
              (click)="resumeRecording()"
              *ngIf="isPaused">
              <span class="btn-icon">▶️</span>
              Resume
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              (click)="cancelRecording()">
              <span class="btn-icon">❌</span>
              Cancel
            </button>
          </div>
        </div>

        <!-- Recording Options -->
        <div *ngIf="!currentAudio && !isRecording" class="recording-options">
          <div class="recording-prompt">
            <div class="recording-icon">🎤</div>
            <p class="recording-text">{{ placeholder || 'Record audio or upload audio file' }}</p>

            <div class="recording-buttons">
              <button
                type="button"
                class="btn btn-primary"
                (click)="startRecording()"
                [disabled]="!microphoneSupported">
                <span class="btn-icon">🎙️</span>
                Start Recording
              </button>

              <button
                type="button"
                class="btn btn-secondary"
                (click)="triggerFileInput()">
                <span class="btn-icon">📁</span>
                Upload Audio
              </button>
            </div>

            <div class="recording-constraints" *ngIf="showConstraints">
              <small>
                Max size: {{ maxSizeMB }}MB •
                Max duration: {{ maxDurationSeconds }}s •
                Quality: {{ audioQuality }}
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Hidden File Input -->
      <input
        #fileInput
        type="file"
        accept="audio/*"
        (change)="onFileSelected($event)"
        style="display: none">

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styleUrls: ['./audio-recorder.component.css']
})
export class AudioRecorderComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  @ViewChild('waveformCanvas') waveformCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('liveWaveformCanvas') liveWaveformCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() maxSizeMB = 10; // 10MB default
  @Input() maxDurationSeconds = 300; // 5 minutes default
  @Input() audioQuality: 'low' | 'medium' | 'high' = 'medium';
  @Input() showWaveform = true;
  @Input() showConstraints = true;

  // Component state
  currentAudio: AudioData | null = null;
  isRecording = false;
  isPaused = false;
  recordingDuration = 0;
  volumeLevel = 0;
  errorMessage = '';
  microphoneSupported = false;

  // Recording infrastructure
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private recordedChunks: Blob[] = [];
  private recordingTimer: any;
  private volumeTimer: any;
  private waveformTimer: any;

  // ControlValueAccessor
  private onChange = (value: AudioData | null) => {};
  private onTouched = () => {};

  ngOnInit(): void {
    this.checkMicrophoneSupport();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ===== MICROPHONE & RECORDING =====

  private async checkMicrophoneSupport(): Promise<void> {
    try {
      this.microphoneSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    } catch {
      this.microphoneSupported = false;
    }
  }

  async startRecording(): Promise<void> {
    try {
      this.errorMessage = '';

      // Request microphone permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.getSampleRate()
        }
      });

      // Setup audio analysis
      this.setupAudioAnalysis();

      // Setup MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: this.getOptimalMimeType(),
        audioBitsPerSecond: this.getAudioBitrate()
      });

      this.recordedChunks = [];
      this.recordingDuration = 0;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecordedAudio();
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.isRecording = true;
      this.isPaused = false;

      // Start timers
      this.startTimers();

    } catch (error) {
      this.errorMessage = 'Failed to access microphone: ' + (error as Error).message;
      this.cleanup();
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
      this.stopTimers();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.isPaused = false;
      this.startTimers();
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder &&
        (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused')) {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  cancelRecording(): void {
    this.cleanup();
    this.recordedChunks = [];
  }

  private setupAudioAnalysis(): void {
    if (!this.mediaStream) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
    } catch (error) {
      console.warn('Failed to setup audio analysis:', error);
    }
  }

  private startTimers(): void {
    // Recording duration timer
    this.recordingTimer = setInterval(() => {
      this.recordingDuration++;

      // Auto-stop at max duration
      if (this.recordingDuration >= this.maxDurationSeconds) {
        this.stopRecording();
      }
    }, 1000);

    // Volume level timer
    this.volumeTimer = setInterval(() => {
      this.updateVolumeLevel();
    }, 100);

    // Waveform animation timer
    if (this.showWaveform && this.liveWaveformCanvas) {
      this.waveformTimer = setInterval(() => {
        this.drawLiveWaveform();
      }, 50);
    }
  }

  private stopTimers(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    if (this.volumeTimer) {
      clearInterval(this.volumeTimer);
      this.volumeTimer = null;
    }

    if (this.waveformTimer) {
      clearInterval(this.waveformTimer);
      this.waveformTimer = null;
    }
  }

  private updateVolumeLevel(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    this.volumeLevel = (average / 255) * 100;
  }

  private drawLiveWaveform(): void {
    if (!this.analyser || !this.liveWaveformCanvas) return;

    const canvas = this.liveWaveformCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#28a745';
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  }

  // ===== AUDIO PROCESSING =====

  private async processRecordedAudio(): Promise<void> {
    if (this.recordedChunks.length === 0) return;

    try {
      const mimeType = this.getOptimalMimeType();
      const blob = new Blob(this.recordedChunks, { type: mimeType });

      // Validate file size
      if (blob.size > this.maxSizeMB * 1024 * 1024) {
        this.errorMessage = `Audio size (${this.formatFileSize(blob.size)}) exceeds maximum allowed (${this.maxSizeMB}MB)`;
        return;
      }

      // Create File object
      const file = new File([blob], `recorded_audio_${Date.now()}.${this.getFileExtension(mimeType)}`, { type: mimeType });
      const dataUrl = URL.createObjectURL(blob);

      // Generate waveform data if needed
      const waveformData = this.showWaveform ? await this.generateWaveformData(blob) : undefined;

      // Create audio data
      this.currentAudio = {
        file,
        dataUrl,
        duration: this.recordingDuration,
        size: this.formatFileSize(blob.size),
        timestamp: new Date(),
        waveformData
      };

      // Draw static waveform
      if (this.showWaveform && waveformData) {
        setTimeout(() => this.drawStaticWaveform(waveformData), 100);
      }

      // Emit change
      this.onChange(this.currentAudio);
      this.onTouched();

    } catch (error) {
      this.errorMessage = 'Failed to process recorded audio: ' + (error as Error).message;
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
      if (!file.type.startsWith('audio/')) {
        this.errorMessage = 'Please select a valid audio file';
        return;
      }

      // Validate file size
      if (file.size > this.maxSizeMB * 1024 * 1024) {
        this.errorMessage = `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed (${this.maxSizeMB}MB)`;
        return;
      }

      // Get audio duration
      const duration = await this.getAudioDuration(file);

      // Validate duration
      if (duration > this.maxDurationSeconds) {
        this.errorMessage = `Audio duration (${this.formatDuration(duration)}) exceeds maximum allowed (${this.formatDuration(this.maxDurationSeconds)})`;
        return;
      }

      // Create data URL
      const dataUrl = URL.createObjectURL(file);

      // Generate waveform data if needed
      const waveformData = this.showWaveform ? await this.generateWaveformData(file) : undefined;

      // Create audio data
      this.currentAudio = {
        file,
        dataUrl,
        duration,
        size: this.formatFileSize(file.size),
        timestamp: new Date(),
        waveformData
      };

      // Draw static waveform
      if (this.showWaveform && waveformData) {
        setTimeout(() => this.drawStaticWaveform(waveformData), 100);
      }

      // Emit change
      this.onChange(this.currentAudio);
      this.onTouched();

    } catch (error) {
      this.errorMessage = 'Failed to process audio file: ' + (error as Error).message;
    } finally {
      // Reset input
      input.value = '';
    }
  }

  // ===== AUDIO MANAGEMENT =====

  rerecordAudio(): void {
    this.removeAudio();
    if (this.microphoneSupported) {
      this.startRecording();
    } else {
      this.triggerFileInput();
    }
  }

  removeAudio(): void {
    if (this.currentAudio) {
      URL.revokeObjectURL(this.currentAudio.dataUrl);
      this.currentAudio = null;
      this.onChange(null);
      this.onTouched();
    }
  }

  // ===== UTILITY METHODS =====

  private getSampleRate(): number {
    switch (this.audioQuality) {
      case 'low': return 8000;
      case 'medium': return 22050;
      case 'high': return 44100;
      default: return 22050;
    }
  }

  private getAudioBitrate(): number {
    switch (this.audioQuality) {
      case 'low': return 64000;
      case 'medium': return 128000;
      case 'high': return 256000;
      default: return 128000;
    }
  }

  private getOptimalMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm';
  }

  private getFileExtension(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('wav')) return 'wav';
    return 'webm';
  }

  private async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'metadata';

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };

      audio.onerror = () => {
        reject(new Error('Failed to load audio metadata'));
      };

      audio.src = URL.createObjectURL(file);
    });
  }

  private async generateWaveformData(audioBlob: Blob | File): Promise<number[]> {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0);
      const samples = 100; // Number of waveform points
      const blockSize = Math.floor(channelData.length / samples);
      const waveformData: number[] = [];

      for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        const end = start + blockSize;
        let sum = 0;

        for (let j = start; j < end; j++) {
          sum += Math.abs(channelData[j]);
        }

        waveformData.push(sum / blockSize);
      }

      return waveformData;
    } catch (error) {
      console.warn('Failed to generate waveform data:', error);
      return [];
    }
  }

  private drawStaticWaveform(waveformData: number[]): void {
    if (!this.waveformCanvas || !waveformData.length) return;

    const canvas = this.waveformCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / waveformData.length;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0b7ad4';

    for (let i = 0; i < waveformData.length; i++) {
      const barHeight = (waveformData[i] / Math.max(...waveformData)) * height;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  }

  // Public method for template access
  getFormattedDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private formatDuration(seconds: number): string {
    return this.getFormattedDuration(seconds);
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
    this.isPaused = false;
    this.recordingDuration = 0;
    this.volumeLevel = 0;

    this.stopTimers();

    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
  }

  // ===== CONTROL VALUE ACCESSOR =====

  writeValue(value: AudioData | null): void {
    this.currentAudio = value;
    if (value?.waveformData && this.showWaveform) {
      setTimeout(() => this.drawStaticWaveform(value.waveformData!), 100);
    }
  }

  registerOnChange(fn: (value: AudioData | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
