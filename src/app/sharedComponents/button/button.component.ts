import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-button',
  imports: [CommonModule, MatButtonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css'
})
export class ButtonComponent {
  @Input() label: string = 'Submit';
  @Input() type: 'primary' | 'secondary' | 'tertiary' | 'success' |'warning' = 'primary';
  @Input() disabled: boolean = false;

  @Output() action = new EventEmitter<void>();
}
