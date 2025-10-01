import { Component, Input, OnInit, OnDestroy, forwardRef, ViewChild, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface BarcodeData {
  value: string;
  format: string;
  timestamp: Date;
  confidence?: number;
  rawData?: any;
}

declare var ZXing: any; // For ZXing library (will need to be added)

@Component({
  selector: 'app-barcode-reader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => BarcodeReaderComponent),
      multi: true
    }
  ],
  template: `
    <div class="barcode-reader-container">
      <!-- Label -->
      <label *ngIf="label" class="barcode-reader-label">
        {{ label }}
        <span *ngIf="required" class="required-asterisk">*</span>
      </label>

      <!-- Reader Area -->
      <div class="barcode-reader-area"
           [class.has-barcode]="currentBarcode"
           [class.scanning]="isScanning"
           [class.disabled]="disabled">

        <!-- Barcode Display -->
        <div *ngIf="currentBarcode && !isScanning" class="barcode-display">
          <div class="barcode-header">
            <div class="barcode-icon">📊</div>
            <div class="barcode-info">
              <div class="barcode-value">{{ currentBarcode.value }}</div>
              <div class="barcode-format">{{ formatBarcodeType(currentBarcode.format) }}</div>
            </div>
          </div>

          <div class="barcode-metadata">
            <div class="metadata-row">
              <span class="metadata-label">Scanned:</span>
              <span class="metadata-value">{{ currentBarcode.timestamp | date:'short' }}</span>
            </div>
            <div class="metadata-row" *ngIf="currentBarcode.confidence">
              <span class="metadata-label">Confidence:</span>
              <span class="metadata-value">{{ currentBarcode.confidence.toFixed(1) }}%</span>
            </div>
          </div>

          <div class="barcode-actions">
            <button type="button" class="btn btn-secondary btn-sm" (click)="rescan()">
              <span class="btn-icon">🔄</span>
              Rescan
            </button>
            <button type="button" class="btn btn-primary btn-sm" (click)="editManually()">
              <span class="btn-icon">✏️</span>
              Edit
            </button>
            <button type="button" class="btn btn-danger btn-sm" (click)="clearBarcode()">
              <span class="btn-icon">🗑️</span>
              Clear
            </button>
          </div>
        </div>

        <!-- Scanner View -->
        <div *ngIf="isScanning" class="scanner-view">
          <div class="camera-container">
            <video
              #videoElement
              autoplay
              playsinline
              class="scanner-video">
            </video>

            <!-- Scanning Overlay -->
            <div class="scanning-overlay">
              <div class="scanning-frame">
                <div class="corner top-left"></div>
                <div class="corner top-right"></div>
                <div class="corner bottom-left"></div>
                <div class="corner bottom-right"></div>
                <div class="scanning-line"></div>
              </div>

              <div class="scanning-hint">
                <p>Position barcode within the frame</p>
                <p class="scanning-formats">
                  Supports: {{ supportedFormats.join(', ') }}
                </p>
              </div>
            </div>
          </div>

          <div class="scanner-controls">
            <button type="button" class="btn btn-danger" (click)="stopScanning()">
              <span class="btn-icon">❌</span>
              Stop Scanning
            </button>
            <button type="button" class="btn btn-secondary" (click)="toggleFlashlight()" *ngIf="flashlightSupported">
              <span class="btn-icon">{{ flashlightEnabled ? '🔦' : '💡' }}</span>
              {{ flashlightEnabled ? 'Turn Off' : 'Turn On' }} Flash
            </button>
            <button type="button" class="btn btn-secondary" (click)="switchCamera()" *ngIf="multipleCameras">
              <span class="btn-icon">🔄</span>
              Switch Camera
            </button>
          </div>
        </div>

        <!-- Manual Input (when editing) -->
        <div *ngIf="showManualInput" class="manual-input-view">
          <div class="manual-input-header">
            <h4>Enter Barcode Manually</h4>
            <p>Type or paste the barcode value below:</p>
          </div>

          <div class="manual-input-form">
            <div class="form-group">
              <label for="manualValue">Barcode Value</label>
              <input
                id="manualValue"
                type="text"
                [(ngModel)]="manualBarcodeValue"
                class="form-input"
                placeholder="Enter barcode value"
                (keyup.enter)="saveManualBarcode()">
            </div>

            <div class="form-group">
              <label for="manualFormat">Format</label>
              <select id="manualFormat" [(ngModel)]="manualBarcodeFormat" class="form-select">
                <option value="CODE_128">Code 128</option>
                <option value="EAN_13">EAN-13</option>
                <option value="EAN_8">EAN-8</option>
                <option value="UPC_A">UPC-A</option>
                <option value="UPC_E">UPC-E</option>
                <option value="QR_CODE">QR Code</option>
                <option value="DATA_MATRIX">Data Matrix</option>
                <option value="CODE_39">Code 39</option>
                <option value="PDF_417">PDF417</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div class="manual-input-actions">
              <button type="button" class="btn btn-secondary" (click)="cancelManualInput()">
                Cancel
              </button>
              <button
                type="button"
                class="btn btn-primary"
                (click)="saveManualBarcode()"
                [disabled]="!manualBarcodeValue.trim()">
                Save Barcode
              </button>
            </div>
          </div>
        </div>

        <!-- Scan Options -->
        <div *ngIf="!currentBarcode && !isScanning && !showManualInput" class="scan-options">
          <div class="scan-prompt">
            <div class="scan-icon">📱</div>
            <p class="scan-text">{{ placeholder || 'Scan barcode or QR code' }}</p>

            <div class="scan-buttons">
              <button
                type="button"
                class="btn btn-primary"
                (click)="startScanning()"
                [disabled]="!cameraSupported">
                <span class="btn-icon">📷</span>
                Start Scanning
              </button>

              <button
                type="button"
                class="btn btn-secondary"
                (click)="showManualInput = true">
                <span class="btn-icon">⌨️</span>
                Enter Manually
              </button>
            </div>

            <div class="scan-info" *ngIf="showInfo">
              <small>
                Supports {{ supportedFormats.length }} formats including QR codes,
                UPC, EAN, Code 128, and more.
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
    </div>
  `,
  styleUrls: ['./barcode-reader.component.css']
})
export class BarcodeReaderComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() supportedFormats: string[] = [
    'QR_CODE', 'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E',
    'CODE_128', 'CODE_39', 'DATA_MATRIX', 'PDF_417'
  ];
  @Input() showInfo = true;
  @Input() autoStop = true; // Stop scanning after successful scan

  // Component state
  currentBarcode: BarcodeData | null = null;
  isScanning = false;
  showManualInput = false;
  errorMessage = '';
  cameraSupported = false;
  flashlightSupported = false;
  flashlightEnabled = false;
  multipleCameras = false;

  // Manual input
  manualBarcodeValue = '';
  manualBarcodeFormat = 'CODE_128';

  // Scanning infrastructure
  private mediaStream: MediaStream | null = null;
  private codeReader: any = null;
  private availableCameras: MediaDeviceInfo[] = [];
  private currentCameraIndex = 0;
  private scanningTimer: any;

  // ControlValueAccessor
  private onChange = (value: BarcodeData | null) => {};
  private onTouched = () => {};

  ngOnInit(): void {
    this.checkCameraSupport();
    this.initializeBarcodeReader();
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ===== INITIALIZATION =====

  private async checkCameraSupport(): Promise<void> {
    try {
      this.cameraSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

      if (this.cameraSupported) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.availableCameras = devices.filter(device => device.kind === 'videoinput');
        this.multipleCameras = this.availableCameras.length > 1;

        // Check for flashlight support (approximation)
        this.flashlightSupported = this.availableCameras.some(camera =>
          camera.label.toLowerCase().includes('back') ||
          camera.label.toLowerCase().includes('rear')
        );
      }
    } catch {
      this.cameraSupported = false;
    }
  }

  private async initializeBarcodeReader(): Promise<void> {
    try {
      // This would require ZXing library to be loaded
      // For demo purposes, we'll create a mock scanner
      this.codeReader = this.createMockBarcodeReader();
    } catch (error) {
      console.warn('Failed to initialize barcode reader:', error);
      this.cameraSupported = false;
    }
  }

  // ===== SCANNING =====

  async startScanning(): Promise<void> {
    if (!this.cameraSupported) {
      this.errorMessage = 'Camera not supported on this device';
      return;
    }

    try {
      this.errorMessage = '';
      this.isScanning = true;

      // Request camera permission
      const cameraDevice = this.availableCameras[this.currentCameraIndex];
      const constraints = {
        video: {
          deviceId: cameraDevice ? { exact: cameraDevice.deviceId } : undefined,
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.nativeElement.srcObject = this.mediaStream;

      // Start scanning with mock scanner
      this.startMockScanning();

    } catch (error) {
      this.errorMessage = 'Failed to access camera: ' + (error as Error).message;
      this.cleanup();
    }
  }

  stopScanning(): void {
    this.isScanning = false;
    this.cleanup();
  }

  private startMockScanning(): void {
    // Mock barcode detection - in real implementation, this would use ZXing
    this.scanningTimer = setInterval(() => {
      // Simulate random barcode detection for demo
      if (Math.random() < 0.1) { // 10% chance per interval
        this.onBarcodeDetected({
          value: this.generateMockBarcode(),
          format: this.supportedFormats[Math.floor(Math.random() * this.supportedFormats.length)],
          confidence: 85 + Math.random() * 15,
          timestamp: new Date()
        });
      }
    }, 1000);
  }

  private onBarcodeDetected(barcodeData: BarcodeData): void {
    this.currentBarcode = barcodeData;

    if (this.autoStop) {
      this.stopScanning();
    }

    this.onChange(this.currentBarcode);
    this.onTouched();
  }

  // ===== CAMERA CONTROLS =====

  async switchCamera(): Promise<void> {
    if (!this.multipleCameras) return;

    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;

    if (this.isScanning) {
      this.stopScanning();
      // Small delay to ensure cleanup
      setTimeout(() => this.startScanning(), 500);
    }
  }

  async toggleFlashlight(): Promise<void> {
    if (!this.flashlightSupported || !this.mediaStream) return;

    try {
      const track = this.mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();

      if ('torch' in capabilities) {
        await track.applyConstraints({
          advanced: [{ torch: !this.flashlightEnabled } as any]
        });
        this.flashlightEnabled = !this.flashlightEnabled;
      }
    } catch (error) {
      console.warn('Failed to toggle flashlight:', error);
    }
  }

  // ===== MANUAL INPUT =====

  editManually(): void {
    if (this.currentBarcode) {
      this.manualBarcodeValue = this.currentBarcode.value;
      this.manualBarcodeFormat = this.currentBarcode.format;
    }
    this.showManualInput = true;
  }

  saveManualBarcode(): void {
    if (!this.manualBarcodeValue.trim()) return;

    this.currentBarcode = {
      value: this.manualBarcodeValue.trim(),
      format: this.manualBarcodeFormat,
      timestamp: new Date()
    };

    this.showManualInput = false;
    this.manualBarcodeValue = '';
    this.manualBarcodeFormat = 'CODE_128';

    this.onChange(this.currentBarcode);
    this.onTouched();
  }

  cancelManualInput(): void {
    this.showManualInput = false;
    this.manualBarcodeValue = '';
    this.manualBarcodeFormat = 'CODE_128';
  }

  // ===== BARCODE MANAGEMENT =====

  rescan(): void {
    this.clearBarcode();
    this.startScanning();
  }

  clearBarcode(): void {
    this.currentBarcode = null;
    this.onChange(null);
    this.onTouched();
  }

  // ===== UTILITY METHODS =====

  formatBarcodeType(format: string): string {
    const formatMap: { [key: string]: string } = {
      'QR_CODE': 'QR Code',
      'EAN_13': 'EAN-13',
      'EAN_8': 'EAN-8',
      'UPC_A': 'UPC-A',
      'UPC_E': 'UPC-E',
      'CODE_128': 'Code 128',
      'CODE_39': 'Code 39',
      'DATA_MATRIX': 'Data Matrix',
      'PDF_417': 'PDF417'
    };
    return formatMap[format] || format;
  }

  private generateMockBarcode(): string {
    // Generate mock barcode for demonstration
    const formats = ['123456789012', 'MOCK-QR-CODE-DATA', 'ABC123DEF456', '987654321098'];
    return formats[Math.floor(Math.random() * formats.length)];
  }

  private createMockBarcodeReader(): any {
    // Mock barcode reader for demonstration
    // In real implementation, this would initialize ZXing or similar library
    return {
      decodeFromVideoDevice: () => Promise.resolve(),
      reset: () => {},
      stopContinuousDecode: () => {}
    };
  }

  private cleanup(): void {
    if (this.scanningTimer) {
      clearInterval(this.scanningTimer);
      this.scanningTimer = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.codeReader) {
      try {
        this.codeReader.reset();
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    this.flashlightEnabled = false;
  }

  // ===== CONTROL VALUE ACCESSOR =====

  writeValue(value: BarcodeData | null): void {
    this.currentBarcode = value;
  }

  registerOnChange(fn: (value: BarcodeData | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
