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
  showHint?: boolean;
  showSuggestions?: boolean;
  variant?: 'default' | 'compact' | 'large';
  enableKeyboardNavigation?: boolean;
}

export interface SearchSuggestion {
  text: string;
  value?: any;
  icon?: string;
  category?: string;
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
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit, OnDestroy {
  @Input() config: SearchConfig = {};
  @Input() suggestions: SearchSuggestion[] = [];
  @Input() isLoading = false;
  @Input() showHint = false;
  @Input() showSuggestions = false;
  @Input() showNoResults = false;

  @Output() searchChange = new EventEmitter<string>();
  @Output() searchClear = new EventEmitter<void>();
  @Output() suggestionSelected = new EventEmitter<SearchSuggestion>();
  @Output() enterPressed = new EventEmitter<string>();
  @Output() focusChange = new EventEmitter<boolean>();

  searchControl = new FormControl('');
  isFocused = false;
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Set default config values
    this.config = {
      placeholder: 'Search...',
      debounceTime: 300,
      minLength: 0,
      showClearButton: true,
      showHint: false,
      showSuggestions: false,
      variant: 'default',
      enableKeyboardNavigation: true,
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

  onFocus() {
    this.isFocused = true;
    this.focusChange.emit(true);
  }

  onBlur() {
    // Delay to allow click events on suggestions
    setTimeout(() => {
      this.isFocused = false;
      this.focusChange.emit(false);
    }, 200);
  }

  onEnterPressed() {
    const value = this.searchControl.value || '';
    this.enterPressed.emit(value);
  }

  onEscapePressed() {
    this.clearSearch();
  }

  clearSearch() {
    this.searchControl.setValue('');
    this.searchClear.emit();
  }

  selectSuggestion(suggestion: SearchSuggestion) {
    this.searchControl.setValue(suggestion.text);
    this.suggestionSelected.emit(suggestion);
    this.isFocused = false;
  }

  getContainerClasses(): string {
    const classes = [];
    if (this.config.variant) {
      classes.push(`search-${this.config.variant}`);
    }
    if (this.isLoading) {
      classes.push('search-loading');
    }
    if (this.searchControl.valid && this.searchControl.value) {
      classes.push('search-success');
    }
    return classes.join(' ');
  }

  getSearchHint(): string {
    const hints = [
      'Type to search through all items',
      'Use keywords for better results',
      'Press Enter to search',
      'Press Escape to clear'
    ];
    return hints[Math.floor(Math.random() * hints.length)];
  }

  trackSuggestion(index: number, suggestion: SearchSuggestion): any {
    return suggestion.value || suggestion.text;
  }

  // Public method to programmatically set search value
  setSearchValue(value: string) {
    this.searchControl.setValue(value);
  }

  // Public method to get current search value
  getSearchValue(): string {
    return this.searchControl.value || '';
  }

  // Public method to focus the search input
  focus() {
    // This would need ViewChild to access the input element
    // Implementation depends on how the component is used
  }
}
