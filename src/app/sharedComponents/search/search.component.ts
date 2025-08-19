import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

export interface SearchConfig {
  placeholder?: string;
  debounceTime?: number;
  minLength?: number;
  showClearButton?: boolean;
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div class="search-container">
      <mat-form-field appearance="outline" class="search-field">
        <mat-label>{{ config.placeholder || 'Search...' }}</mat-label>
        <input
          matInput
          [formControl]="searchControl"
          [placeholder]="config.placeholder || 'Search...'"
          type="text"
        >
        <mat-icon matPrefix>search</mat-icon>

        <button
          *ngIf="config.showClearButton && searchControl.value"
          mat-icon-button
          matSuffix
          (click)="clearSearch()"
          type="button"
          aria-label="Clear search">
          <mat-icon>close</mat-icon>
        </button>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .search-container {
      width: 100%;
      max-width: 400px;
    }

    .search-field {
      width: 100%;
    }

    .search-field .mat-form-field-wrapper {
      padding-bottom: 0;
    }

    /* More rounded edges for the search field */
    .search-field .mat-mdc-form-field {
      border-radius: 25px;
    }

    .search-field .mat-mdc-text-field-wrapper {
      border-radius: 25px;
    }

    .search-field .mdc-notched-outline {
      border-radius: 25px;
    }

    .search-field .mdc-notched-outline__leading,
    .search-field .mdc-notched-outline__trailing {
      border-radius: 25px;
    }

    .search-field .mdc-notched-outline__notch {
      border-radius: 0;
    }

    @media (max-width: 768px) {
      .search-container {
        max-width: 100%;
      }
    }
  `]
})
export class SearchComponent implements OnInit, OnDestroy {
  @Input() config: SearchConfig = {};
  @Output() searchChange = new EventEmitter<string>();
  @Output() searchClear = new EventEmitter<void>();

  searchControl = new FormControl('');
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Set default config values
    this.config = {
      placeholder: 'Search...',
      debounceTime: 300,
      minLength: 0,
      showClearButton: true,
      ...this.config
    };

    // Set up search with debounce and min length
    this.searchControl.valueChanges
      .pipe(
        debounceTime(this.config.debounceTime || 300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        const searchTerm = (value || '').trim();

        if (searchTerm.length >= (this.config.minLength || 0)) {
          this.searchChange.emit(searchTerm);
        } else if (searchTerm.length === 0) {
          this.searchChange.emit('');
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  clearSearch() {
    this.searchControl.setValue('');
    this.searchClear.emit();
  }

  // Public method to programmatically set search value
  setSearchValue(value: string) {
    this.searchControl.setValue(value);
  }

  // Public method to get current search value
  getSearchValue(): string {
    return this.searchControl.value || '';
  }
}
