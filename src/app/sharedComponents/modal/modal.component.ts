
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  @Input() title: string = 'Confirm Action';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  isOpen = false;

  open() {
    this.isOpen = true;
  }

   close() {
    this.isOpen = false;
  }

  onCancelClick() {
    this.cancel.emit();
    this.close();
  }
  onConfirmClick() {
    this.confirm.emit();
    this.close();
  }

}
