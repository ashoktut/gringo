import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, forwardRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-digital-signature',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
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
  @Input() placeholder: string = 'Please sign in the box above';
  @Input() canvasWidth: number = 500;
  @Input() canvasHeight: number = 200;
  @Input() strokeColor: string = '#000000';
  @Input() strokeWidth: number = 2;
  @Input() backgroundColor: string = '#ffffff';

  // Component state
  private canvas!: HTMLCanvasElement;
  private context!: CanvasRenderingContext2D | null;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private isEmpty = true;
  private isViewInitialized = false; // ✅ ADD: Track view initialization
  private pendingValue: string | null = null; // ✅ ADD: Store pending values

  // Form control properties
  isDisabled = false;
  private onChange = (signature: string | null) => {};
  private onTouched = () => {};

  ngOnInit() {
    // Component initialization logic that doesn't require the view
  }

  ngAfterViewInit() {
    // ✅ UPDATED: Initialize canvas after view is ready
    this.initializeCanvas();
    this.isViewInitialized = true;

    // ✅ ADD: Process any pending value
    if (this.pendingValue !== null) {
      this.loadSignature(this.pendingValue);
      this.pendingValue = null;
    }
  }

  ngOnDestroy() {
    this.removeEventListeners();
  }

  private initializeCanvas() {
    // ✅ ADD: Safety check
    if (!this.canvasRef?.nativeElement) {
      console.warn('Canvas element not available');
      return;
    }

    this.canvas = this.canvasRef.nativeElement;
    this.context = this.canvas.getContext('2d');

    // ✅ ADD: Safety check for context
    if (!this.context) {
      console.error('Could not get 2D rendering context');
      return;
    }

    // Set canvas dimensions
    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    // Configure canvas style
    this.canvas.style.border = '1px solid #ccc';
    this.canvas.style.borderRadius = '4px';
    this.canvas.style.cursor = 'crosshair';

    // Configure drawing context
    this.context.strokeStyle = this.strokeColor;
    this.context.lineWidth = this.strokeWidth;
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';

    // Clear canvas with background color
    this.clearCanvas();

    // Add event listeners
    this.addEventListeners();
  }

  private addEventListeners() {
    if (!this.canvas) return;

    // Mouse events
    this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
  }

  private removeEventListeners() {
    if (!this.canvas) return;

    this.canvas.removeEventListener('mousedown', this.startDrawing.bind(this));
    this.canvas.removeEventListener('mousemove', this.draw.bind(this));
    this.canvas.removeEventListener('mouseup', this.stopDrawing.bind(this));
    this.canvas.removeEventListener('mouseout', this.stopDrawing.bind(this));
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.stopDrawing.bind(this));
  }

  private startDrawing(event: MouseEvent) {
    if (this.isDisabled) return;

    this.isDrawing = true;
    this.onTouched();

    const rect = this.canvas.getBoundingClientRect();
    this.lastX = event.clientX - rect.left;
    this.lastY = event.clientY - rect.top;
  }

  private draw(event: MouseEvent) {
    if (!this.isDrawing || this.isDisabled || !this.context) return;

    const rect = this.canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    this.context.beginPath();
    this.context.moveTo(this.lastX, this.lastY);
    this.context.lineTo(currentX, currentY);
    this.context.stroke();

    this.lastX = currentX;
    this.lastY = currentY;
    this.isEmpty = false;

    // Emit change
    this.onChange(this.getSignatureDataURL());
  }

  private stopDrawing() {
    this.isDrawing = false;
  }

  private handleTouchStart(event: TouchEvent) {
    event.preventDefault();
    if (this.isDisabled) return;

    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();

    this.isDrawing = true;
    this.onTouched();
    this.lastX = touch.clientX - rect.left;
    this.lastY = touch.clientY - rect.top;
  }

  private handleTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (!this.isDrawing || this.isDisabled || !this.context) return;

    const touch = event.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;

    this.context.beginPath();
    this.context.moveTo(this.lastX, this.lastY);
    this.context.lineTo(currentX, currentY);
    this.context.stroke();

    this.lastX = currentX;
    this.lastY = currentY;
    this.isEmpty = false;

    // Emit change
    this.onChange(this.getSignatureDataURL());
  }

  clearSignature() {
    // ✅ UPDATED: Add safety checks
    if (!this.isViewInitialized || !this.context) {
      return;
    }

    this.clearCanvas();
    this.isEmpty = true;
    this.onChange(null);
  }

  private clearCanvas() {
    // ✅ UPDATED: Add safety checks
    if (!this.context || !this.canvas) {
      return;
    }

    // Clear the canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Fill with background color
    this.context.fillStyle = this.backgroundColor;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private getSignatureDataURL(): string {
    // ✅ ADD: Safety check
    if (!this.canvas) {
      return '';
    }
    return this.canvas.toDataURL();
  }

  private loadSignature(dataUrl: string) {
    // ✅ UPDATED: Add safety checks
    if (!this.context || !this.canvas || !dataUrl) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (!this.context) return; // ✅ ADD: Additional safety check in callback
      this.clearCanvas();
      this.context.drawImage(img, 0, 0);
      this.isEmpty = false;
    };
    img.src = dataUrl;
  }

  hasSignature(): boolean {
    return !this.isEmpty;
  }

  // ========== ControlValueAccessor Implementation ==========

  writeValue(value: string | null): void {
    // ✅ UPDATED: Handle case when view is not initialized
    if (!this.isViewInitialized) {
      this.pendingValue = value;
      return;
    }

    if (value) {
      this.loadSignature(value);
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

    // ✅ ADD: Update canvas style based on disabled state
    if (this.canvas) {
      this.canvas.style.cursor = isDisabled ? 'not-allowed' : 'crosshair';
      this.canvas.style.opacity = isDisabled ? '0.6' : '1';
    }
  }
}
