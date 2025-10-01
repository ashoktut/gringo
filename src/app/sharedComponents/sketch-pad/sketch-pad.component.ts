import { Component, Input, OnInit, OnDestroy, forwardRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface SketchData {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: Date;
  strokes?: SketchStroke[];
}

interface SketchStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
}

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-sketch-pad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SketchPadComponent),
      multi: true
    }
  ],
  template: `
    <div class="sketch-pad-container">
      <!-- Label -->
      <label *ngIf="label" class="sketch-pad-label">
        {{ label }}
        <span *ngIf="required" class="required-asterisk">*</span>
      </label>

      <!-- Drawing Area -->
      <div class="sketch-pad-area"
           [class.has-sketch]="currentSketch"
           [class.drawing]="isDrawing"
           [class.disabled]="disabled">

        <!-- Sketch Display -->
        <div *ngIf="currentSketch && !showCanvas" class="sketch-display">
          <div class="sketch-preview">
            <img [src]="currentSketch.dataUrl" alt="Sketch" class="sketch-image">

            <div class="sketch-overlay">
              <div class="sketch-info">
                <span class="sketch-size">{{ currentSketch.width }} × {{ currentSketch.height }}</span>
                <span class="sketch-date">{{ currentSketch.timestamp | date:'short' }}</span>
              </div>
            </div>
          </div>

          <div class="sketch-actions">
            <button type="button" class="btn btn-secondary btn-sm" (click)="editSketch()">
              <span class="btn-icon">✏️</span>
              Edit
            </button>
            <button type="button" class="btn btn-primary btn-sm" (click)="newSketch()">
              <span class="btn-icon">🎨</span>
              New Sketch
            </button>
            <button type="button" class="btn btn-danger btn-sm" (click)="clearSketch()">
              <span class="btn-icon">🗑️</span>
              Clear
            </button>
          </div>
        </div>

        <!-- Drawing Canvas -->
        <div *ngIf="showCanvas" class="canvas-container">
          <!-- Toolbar -->
          <div class="drawing-toolbar">
            <!-- Tools -->
            <div class="tool-group">
              <button
                type="button"
                class="tool-btn"
                [class.active]="currentTool === 'pen'"
                (click)="setTool('pen')"
                title="Pen">
                <span class="tool-icon">✏️</span>
              </button>
              <button
                type="button"
                class="tool-btn"
                [class.active]="currentTool === 'highlighter'"
                (click)="setTool('highlighter')"
                title="Highlighter">
                <span class="tool-icon">🖍️</span>
              </button>
              <button
                type="button"
                class="tool-btn"
                [class.active]="currentTool === 'eraser'"
                (click)="setTool('eraser')"
                title="Eraser">
                <span class="tool-icon">🧹</span>
              </button>
            </div>

            <!-- Colors -->
            <div class="color-group">
              <div class="color-palette">
                <button
                  *ngFor="let color of colorPalette"
                  type="button"
                  class="color-btn"
                  [class.active]="currentColor === color"
                  [style.background-color]="color"
                  (click)="setColor(color)"
                  [title]="color">
                </button>
              </div>
            </div>

            <!-- Stroke Width -->
            <div class="width-group">
              <label class="width-label">Width:</label>
              <input
                type="range"
                min="1"
                max="20"
                [(ngModel)]="strokeWidth"
                class="width-slider">
              <span class="width-value">{{ strokeWidth }}px</span>
            </div>

            <!-- Actions -->
            <div class="action-group">
              <button
                type="button"
                class="tool-btn"
                (click)="undo()"
                [disabled]="!canUndo()"
                title="Undo">
                <span class="tool-icon">↶</span>
              </button>
              <button
                type="button"
                class="tool-btn"
                (click)="redo()"
                [disabled]="!canRedo()"
                title="Redo">
                <span class="tool-icon">↷</span>
              </button>
              <button
                type="button"
                class="tool-btn"
                (click)="clearCanvas()"
                title="Clear All">
                <span class="tool-icon">🗑️</span>
              </button>
            </div>
          </div>

          <!-- Canvas -->
          <div class="canvas-wrapper">
            <canvas
              #drawingCanvas
              class="drawing-canvas"
              [width]="canvasWidth"
              [height]="canvasHeight"
              (mousedown)="startDrawing($event)"
              (mousemove)="draw($event)"
              (mouseup)="stopDrawing()"
              (mouseleave)="stopDrawing()"
              (touchstart)="startDrawing($event)"
              (touchmove)="draw($event)"
              (touchend)="stopDrawing()"
              (touchcancel)="stopDrawing()">
            </canvas>

            <div class="canvas-hint" *ngIf="!hasStrokes">
              <p>Start drawing or sketching here</p>
              <p class="hint-subtitle">Use the toolbar above to select tools and colors</p>
            </div>
          </div>

          <!-- Canvas Actions -->
          <div class="canvas-actions">
            <button type="button" class="btn btn-secondary" (click)="cancelDrawing()">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              (click)="saveSketch()"
              [disabled]="!hasStrokes">
              Save Sketch
            </button>
          </div>
        </div>

        <!-- Initial Prompt -->
        <div *ngIf="!currentSketch && !showCanvas" class="sketch-prompt">
          <div class="prompt-content">
            <div class="prompt-icon">🎨</div>
            <p class="prompt-text">{{ placeholder || 'Create a sketch or drawing' }}</p>

            <button
              type="button"
              class="btn btn-primary"
              (click)="startDrawing()">
              <span class="btn-icon">✏️</span>
              Start Drawing
            </button>

            <div class="sketch-info" *ngIf="showInfo">
              <small>
                Canvas size: {{ canvasWidth }} × {{ canvasHeight }}px
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
  styleUrls: ['./sketch-pad.component.css']
})
export class SketchPadComponent implements ControlValueAccessor, OnInit, OnDestroy, AfterViewInit {
  @ViewChild('drawingCanvas') drawingCanvas!: ElementRef<HTMLCanvasElement>;

  @Input() label = '';
  @Input() placeholder = '';
  @Input() required = false;
  @Input() disabled = false;
  @Input() canvasWidth = 600;
  @Input() canvasHeight = 400;
  @Input() backgroundColor = '#ffffff';
  @Input() defaultColor = '#000000';
  @Input() defaultStrokeWidth = 2;
  @Input() showInfo = true;
  @Input() colorPalette = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
    '#808080', '#c0c0c0', '#800000', '#008000', '#000080'
  ];

  // Component state
  currentSketch: SketchData | null = null;
  showCanvas = false;
  isDrawing = false;
  hasStrokes = false;
  errorMessage = '';

  // Drawing state
  currentTool: 'pen' | 'highlighter' | 'eraser' = 'pen';
  currentColor = this.defaultColor;
  strokeWidth = this.defaultStrokeWidth;

  // Canvas context and drawing data
  private ctx: CanvasRenderingContext2D | null = null;
  private strokes: SketchStroke[] = [];
  private currentStroke: SketchStroke | null = null;
  private undoStack: SketchStroke[][] = [];
  private redoStack: SketchStroke[][] = [];
  private lastPoint: Point | null = null;

  // ControlValueAccessor
  private onChange = (value: SketchData | null) => {};
  private onTouched = () => {};

  ngOnInit(): void {
    this.currentColor = this.defaultColor;
    this.strokeWidth = this.defaultStrokeWidth;
  }

  ngAfterViewInit(): void {
    if (this.showCanvas) {
      this.initializeCanvas();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  // ===== CANVAS INITIALIZATION =====

  private initializeCanvas(): void {
    if (!this.drawingCanvas) return;

    const canvas = this.drawingCanvas.nativeElement;
    this.ctx = canvas.getContext('2d');

    if (!this.ctx) return;

    // Set canvas properties
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.imageSmoothingEnabled = true;

    // Set background
    this.clearCanvas();

    // Load existing sketch if editing
    if (this.currentSketch) {
      this.loadSketchToCanvas();
    }
  }

  // ===== DRAWING METHODS =====

  startDrawing(event?: MouseEvent | TouchEvent): void {
    if (!this.showCanvas) {
      this.showCanvas = true;
      // Wait for canvas to be rendered
      setTimeout(() => this.initializeCanvas(), 0);
      return;
    }

    if (!event || !this.ctx || this.disabled) return;

    event.preventDefault();
    this.isDrawing = true;

    const point = this.getEventPoint(event);
    this.lastPoint = point;

    // Start new stroke
    this.currentStroke = {
      points: [point],
      color: this.currentTool === 'eraser' ? this.backgroundColor : this.currentColor,
      width: this.strokeWidth,
      tool: this.currentTool
    };

    // Setup drawing context for this stroke
    this.setupDrawingContext();
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing || !this.ctx || !this.currentStroke || !this.lastPoint) return;

    event.preventDefault();
    const currentPoint = this.getEventPoint(event);

    // Add point to current stroke
    this.currentStroke.points.push(currentPoint);

    // Draw line from last point to current point
    this.drawLine(this.lastPoint, currentPoint);

    this.lastPoint = currentPoint;
  }

  stopDrawing(): void {
    if (!this.isDrawing || !this.currentStroke) return;

    this.isDrawing = false;

    // Save stroke to history
    this.saveStrokeToHistory();
    this.currentStroke = null;
    this.lastPoint = null;
    this.hasStrokes = true;

    // Clear redo stack when new stroke is added
    this.redoStack = [];

    this.onTouched();
  }

  private setupDrawingContext(): void {
    if (!this.ctx || !this.currentStroke) return;

    this.ctx.globalCompositeOperation =
      this.currentTool === 'eraser' ? 'destination-out' : 'source-over';

    this.ctx.strokeStyle = this.currentStroke.color;
    this.ctx.lineWidth = this.currentStroke.width;

    if (this.currentTool === 'highlighter') {
      this.ctx.globalAlpha = 0.5;
    } else {
      this.ctx.globalAlpha = 1.0;
    }
  }

  private drawLine(from: Point, to: Point): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }

  // ===== TOOL METHODS =====

  setTool(tool: 'pen' | 'highlighter' | 'eraser'): void {
    this.currentTool = tool;
  }

  setColor(color: string): void {
    this.currentColor = color;
  }

  // ===== UNDO/REDO =====

  undo(): void {
    if (!this.canUndo()) return;

    // Move current state to redo stack
    this.redoStack.push([...this.strokes]);

    // Remove last stroke
    const lastStroke = this.strokes.pop();
    if (lastStroke) {
      this.undoStack.push([...this.strokes]);
    }

    this.redrawCanvas();
    this.hasStrokes = this.strokes.length > 0;
  }

  redo(): void {
    if (!this.canRedo()) return;

    // Restore state from redo stack
    const redoState = this.redoStack.pop();
    if (redoState) {
      this.undoStack.push([...this.strokes]);
      this.strokes = redoState;
      this.redrawCanvas();
      this.hasStrokes = this.strokes.length > 0;
    }
  }

  canUndo(): boolean {
    return this.strokes.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clearCanvas(): void {
    this.undoStack.push([...this.strokes]);
    this.strokes = [];
    this.redoStack = [];
    this.hasStrokes = false;

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
  }

  // ===== HISTORY MANAGEMENT =====

  private saveStrokeToHistory(): void {
    if (!this.currentStroke) return;

    this.undoStack.push([...this.strokes]);
    this.strokes.push({ ...this.currentStroke });

    // Limit undo stack size
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  private redrawCanvas(): void {
    if (!this.ctx) return;

    // Clear canvas
    this.clearCanvas();

    // Redraw all strokes
    for (const stroke of this.strokes) {
      this.drawStroke(stroke);
    }
  }

  private drawStroke(stroke: SketchStroke): void {
    if (!this.ctx || stroke.points.length === 0) return;

    // Setup context for this stroke
    this.ctx.globalCompositeOperation =
      stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.width;
    this.ctx.globalAlpha = stroke.tool === 'highlighter' ? 0.5 : 1.0;

    // Draw the stroke
    this.ctx.beginPath();
    this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

    for (let i = 1; i < stroke.points.length; i++) {
      this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }

    this.ctx.stroke();
  }

  // ===== SKETCH MANAGEMENT =====

  editSketch(): void {
    this.showCanvas = true;
    setTimeout(() => this.initializeCanvas(), 0);
  }

  newSketch(): void {
    this.currentSketch = null;
    this.strokes = [];
    this.undoStack = [];
    this.redoStack = [];
    this.hasStrokes = false;
    this.showCanvas = true;
    setTimeout(() => this.initializeCanvas(), 0);
  }

  saveSketch(): void {
    if (!this.ctx || !this.hasStrokes) return;

    try {
      const canvas = this.drawingCanvas.nativeElement;
      const dataUrl = canvas.toDataURL('image/png');

      this.currentSketch = {
        dataUrl,
        width: this.canvasWidth,
        height: this.canvasHeight,
        timestamp: new Date(),
        strokes: [...this.strokes]
      };

      this.showCanvas = false;

      this.onChange(this.currentSketch);
      this.onTouched();

    } catch (error) {
      this.errorMessage = 'Failed to save sketch: ' + (error as Error).message;
    }
  }

  cancelDrawing(): void {
    this.showCanvas = false;

    // If we had a previous sketch, keep it
    if (this.currentSketch) {
      // Restore previous sketch state if needed
    } else {
      // Clear everything
      this.strokes = [];
      this.undoStack = [];
      this.redoStack = [];
      this.hasStrokes = false;
    }
  }

  clearSketch(): void {
    this.currentSketch = null;
    this.onChange(null);
    this.onTouched();
  }

  private loadSketchToCanvas(): void {
    if (!this.currentSketch || !this.ctx) return;

    if (this.currentSketch.strokes) {
      this.strokes = [...this.currentSketch.strokes];
      this.redrawCanvas();
      this.hasStrokes = this.strokes.length > 0;
    } else {
      // Load from image data
      const img = new Image();
      img.onload = () => {
        if (this.ctx) {
          this.clearCanvas();
          this.ctx.drawImage(img, 0, 0);
          this.hasStrokes = true;
        }
      };
      img.src = this.currentSketch.dataUrl;
    }
  }

  // ===== UTILITY METHODS =====

  private getEventPoint(event: MouseEvent | TouchEvent): Point {
    const canvas = this.drawingCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    let clientX: number, clientY: number;

    if (event instanceof MouseEvent) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      // TouchEvent
      const touch = event.touches[0] || event.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  // ===== CONTROL VALUE ACCESSOR =====

  writeValue(value: SketchData | null): void {
    this.currentSketch = value;

    if (value && this.showCanvas) {
      setTimeout(() => this.loadSketchToCanvas(), 0);
    }
  }

  registerOnChange(fn: (value: SketchData | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }
}
