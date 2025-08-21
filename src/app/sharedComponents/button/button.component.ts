import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-button',
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css'
})
export class ButtonComponent {
  @Input() label: string = 'Submit';
  @Input() type: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' = 'primary';
  @Input() disabled: boolean = false;
  @Input() icon?: string;

  @Output() action = new EventEmitter<void>();

  getColor(): string {
    switch (this.type) {
      case 'primary': return 'primary';
      case 'success': return 'primary';
      case 'warning': return 'warn';
      case 'secondary': return 'accent';
      default: return '';
    }
  }
}
