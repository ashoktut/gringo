import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, forwardRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-digital-signature',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
    providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DigitalSignatureComponent),
      multi: true
    }
  ],
  templateUrl: './digital-signature.component.html',
  styleUrl: './digital-signature.component.css',
})
export class DigitalSignatureComponent implements OnInit, AfterViewInit, OnDestroy, ControlValueAccessor {
  @ViewChild('signatureCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // Input properties for customization
  @Input() label: string = 'Digital Signature';
  @Input() placeholder: string = '';
  @Input() canvasWidth: number = 600;
  @Input() canvasHeight: number = 200;
  @Input() strokeColor: string = '#000000';
  @Input() strokeWidth: number = 2;
  @Input() backgroundColor: string = '#FFFFFF';

  // Component state
  private canvas!: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D;
  private isDrawing: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private strokes: ImageData[] = []; // For undo functionality

  hasSignature: boolean = false;
  showError: boolean = false;
  errorMessage: string = '';
  signatureData: string | null = null;
  canUndo: boolean = false;
  isMobile: boolean = false;
  isDisabled: boolean = false;

  // Form control integration
  private onChange = (value: string | null) => {};
  private onTouched = () => {};

  ngOnInit() {
    // Detect mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Adjust canvas size for mobile
    if (this.isMobile && this.canvasWidth > 400) {
      this.canvasWidth = Math.min(this.canvasWidth, 400);
      this.canvasHeight = Math.min(this.canvasHeight, 150);
    }
  }

  ngAfterViewInit() {
    this.initializeCanvas();
  }

  ngOnDestroy() {
    // Cleanup event listeners
    this.canvas?.removeEventListener('contextmenu', this.preventContextMenu);
  }

  /**
   * Initialize the canvas for signature drawing
   */
  private initializeCanvas() {
    this.canvas = this.canvasRef.nativeElement;
    this.context = this.canvas.getContext('2d')!;

    // Set canvas background
    this.clearCanvas();

    // Configure drawing settings
    this.context.strokeStyle = this.strokeColor;
    this.context.lineWidth = this.strokeWidth;
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', this.preventContextMenu);

    // Save initial state for undo
    this.saveState();
  }

  private preventContextMenu = (e: Event) => e.preventDefault();

  /**
   * Clear canvas and reset to background color
   */
  private clearCanvas() {
    this.context.fillStyle = this.backgroundColor;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Save current canvas state for undo functionality
   */
  private saveState() {
    this.strokes.push(this.context.getImageData(0, 0, this.canvas.width, this.canvas.height));
    this.canUndo = this.strokes.length > 1;
  }

  /**
   * Get coordinates relative to canvas
   */
  private getCoordinates(event: MouseEvent | TouchEvent): { x: number, y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    let clientX: number, clientY: number;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  /**
   * Start drawing when user presses mouse or touches screen
   */
  startDrawing(event: MouseEvent | TouchEvent) {
    if (this.isDisabled) return;

    event.preventDefault();
    this.isDrawing = true;
    this.onTouched(); // Mark as touched for form validation

    const coords = this.getCoordinates(event);
    this.lastX = coords.x;
    this.lastY = coords.y;

    // Start new path
    this.context.beginPath();
    this.context.moveTo(this.lastX, this.lastY);
  }

  /**
   * Draw line as user moves mouse or finger
   */
  draw(event: MouseEvent | TouchEvent) {
    if (!this.isDrawing || this.isDisabled) return;

    event.preventDefault();

    const coords = this.getCoordinates(event);

    // Draw smooth line
    this.context.lineTo(coords.x, coords.y);
    this.context.stroke();

    this.lastX = coords.x;
    this.lastY = coords.y;
  }

  /**
   * Stop drawing when user releases mouse or lifts finger
   */
  stopDrawing() {
    if (!this.isDrawing || this.isDisabled) return;

    this.isDrawing = false;
    this.context.closePath();

    // Save state for undo and update signature status
    this.saveState();
    this.updateSignatureStatus();
  }

  /**
   * Clear the signature canvas
   */
  clearSignature() {
    if (this.isDisabled) return;

    this.clearCanvas();
    this.strokes = [];
    this.saveState();

    // Reset state
    this.hasSignature = false;
    this.signatureData = null;
    this.showError = false;
    this.canUndo = false;

    // Notify form system
    this.onChange(null);
  }

  /**
   * Undo last stroke
   */
  undoLastStroke() {
    if (this.strokes.length > 1 && !this.isDisabled) {
      this.strokes.pop(); // Remove current state
      const previousState = this.strokes[this.strokes.length - 1];
      this.context.putImageData(previousState, 0, 0);

      this.canUndo = this.strokes.length > 1;
      this.updateSignatureStatus();
    }
  }

  /**
   * Update signature status and convert to base64
   */
  private updateSignatureStatus() {
    // Check if canvas has any drawing (not just background)
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixelData = imageData.data;

    // Check if any pixel is not the background color
    let hasDrawing = false;
    const bgR = 255, bgG = 255, bgB = 255; // White background

    for (let i = 0; i < pixelData.length; i += 4) {
      const r = pixelData[i];
      const g = pixelData[i + 1];
      const b = pixelData[i + 2];
      const a = pixelData[i + 3];

      // If pixel is not white background and has opacity
      if (!(r === bgR && g === bgG && b === bgB) && a > 0) {
        hasDrawing = true;
        break;
      }
    }

    this.hasSignature = hasDrawing;

    if (this.hasSignature) {
      // Convert canvas to base64 data URL
      this.signatureData = this.canvas.toDataURL('image/png', 0.8);
      this.showError = false;

      // Notify form system
      this.onChange(this.signatureData);
    } else {
      this.signatureData = null;
      this.onChange(null);
    }
  }

  /**
   * Get signature as base64 string
   */
  getSignatureData(): string | null {
    return this.signatureData;
  }

  /**
   * Set error state (called from parent form)
   */
  setError(message: string) {
    this.showError = true;
    this.errorMessage = message;
  }

  /**
   * Clear error state
   */
  clearError() {
    this.showError = false;
    this.errorMessage = '';
  }

  // ========== ControlValueAccessor Implementation ==========

  writeValue(value: string | null): void {
    if (value && typeof value === 'string') {
      // Load existing signature from base64
      const img = new Image();
      img.onload = () => {
        this.clearCanvas();
        this.context.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.hasSignature = true;
        this.signatureData = value;
        this.saveState();
      };
      img.src = value;
    } else {
      this.clearSignature();
    }
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }
}
