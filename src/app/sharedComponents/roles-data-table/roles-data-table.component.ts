import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-roles-data-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatIconModule, MatButtonModule, MatTooltipModule, MatChipsModule],
  template: '<div></div>',
  styles: [''],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RolesDataTableComponent {
  @Input() roles: Role[] = [];
  @Output() editRole = new EventEmitter<Role>();
  @Output() deleteRole = new EventEmitter<Role>();
  readonly displayedColumns = ['name', 'description', 'status', 'actions'];
  onEdit(role: Role): void { this.editRole.emit(role); }
  onDelete(role: Role): void { this.deleteRole.emit(role); }
}
