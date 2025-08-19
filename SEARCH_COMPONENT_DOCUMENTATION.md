# Search Component Documentation

## Overview

The **SearchComponent** is a reusable, standalone Angular component that provides a clean and minimalistic search functionality with Material Design styling. It can be easily integrated into any page that requires search capabilities.

## Features

### 🎯 Core Features

- **Standalone Component**: No module dependencies, easy to import
- **Material Design**: Clean, consistent UI using Angular Material
- **Debounced Search**: Prevents excessive API calls with configurable debounce time
- **Configurable**: Flexible configuration options for different use cases
- **Responsive**: Mobile-optimized design
- **Clear Button**: Optional clear functionality
- **Type Safety**: Full TypeScript support

### 🔧 Configuration Options

- **placeholder**: Custom placeholder text
- **debounceTime**: Delay before emitting search changes (default: 300ms)
- **minLength**: Minimum characters before triggering search (default: 0)
- **showClearButton**: Show/hide the clear button (default: true)

## Installation & Usage

### 1. Basic Implementation

```typescript
import { SearchComponent } from './sharedComponents/search/search.component';

@Component({
  imports: [SearchComponent],
  template: `
    <app-search 
      (searchChange)="onSearch($event)"
      (searchClear)="onClear()">
    </app-search>
  `
})
export class MyComponent {
  onSearch(searchTerm: string) {
    console.log('Search term:', searchTerm);
  }

  onClear() {
    console.log('Search cleared');
  }
}
```

### 2. Advanced Configuration

```typescript
export class MyComponent {
  searchConfig: SearchConfig = {
    placeholder: 'Search submissions...',
    debounceTime: 500,
    minLength: 2,
    showClearButton: true
  };

  // In template:
  // <app-search [config]="searchConfig" (searchChange)="onSearch($event)">
}
```

### 3. Programmatic Control

```typescript
@ViewChild(SearchComponent) searchComponent!: SearchComponent;

// Set search value programmatically
setSearch(value: string) {
  this.searchComponent.setSearchValue(value);
}

// Get current search value
getCurrentSearch(): string {
  return this.searchComponent.getSearchValue();
}
```

## API Reference

### Inputs

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `config` | `SearchConfig` | `{}` | Configuration object for search behavior |

### Outputs

| Event | Type | Description |
|-------|------|-------------|
| `searchChange` | `string` | Emitted when search term changes (debounced) |
| `searchClear` | `void` | Emitted when search is cleared |

### SearchConfig Interface

```typescript
interface SearchConfig {
  placeholder?: string;      // Custom placeholder text
  debounceTime?: number;     // Debounce delay in milliseconds
  minLength?: number;        // Minimum characters to trigger search
  showClearButton?: boolean; // Show clear button
}
```

### Public Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `setSearchValue` | `value: string` | `void` | Set search value programmatically |
| `getSearchValue` | - | `string` | Get current search value |

## Implementation Examples

### 1. Simple Search

```typescript
@Component({
  template: `
    <app-search (searchChange)="onSearch($event)"></app-search>
    <div *ngFor="let item of filteredItems">{{ item.name }}</div>
  `
})
export class SimpleSearchComponent {
  items = [...];
  filteredItems = [...];

  onSearch(term: string) {
    this.filteredItems = this.items.filter(item => 
      item.name.toLowerCase().includes(term.toLowerCase())
    );
  }
}
```

### 2. Advanced Search with Multiple Fields

```typescript
export class AdvancedSearchComponent {
  searchConfig: SearchConfig = {
    placeholder: 'Search by name, email, or ID...',
    debounceTime: 400,
    minLength: 2
  };

  onSearch(term: string) {
    const searchLower = term.toLowerCase();
    this.filteredData = this.data.filter(item => 
      item.name.toLowerCase().includes(searchLower) ||
      item.email.toLowerCase().includes(searchLower) ||
      item.id.toString().includes(searchLower)
    );
  }
}
```

### 3. Search with API Integration

```typescript
export class ApiSearchComponent {
  onSearch(term: string) {
    if (term) {
      this.apiService.search(term).subscribe(results => {
        this.searchResults = results;
      });
    } else {
      this.searchResults = [];
    }
  }
}
```

## Styling

The component uses Angular Material theming and is fully responsive. Custom styling can be applied by targeting the component:

```css
app-search {
  .search-container {
    max-width: 300px; /* Custom width */
  }
}
```

## Best Practices

### 1. Performance Optimization

- Use appropriate debounce time (300-500ms) for API calls
- Set minimum length for expensive operations
- Implement proper loading states for async searches

### 2. User Experience

- Provide clear placeholder text indicating what can be searched
- Show search results count when applicable
- Clear previous results when search is cleared

### 3. Accessibility

- The component includes proper ARIA labels
- Keyboard navigation is fully supported
- Screen reader compatible

## Integration Examples

### Submissions Page

```typescript
// Search configuration for submissions
searchConfig: SearchConfig = {
  placeholder: 'Search by ID, client name, status...',
  debounceTime: 300,
  minLength: 1,
  showClearButton: true
};

// Multi-field search implementation
onSearchChange(searchTerm: string) {
  const searchLower = searchTerm.toLowerCase();
  this.filteredSubmissions = this.submissions.filter(submission => 
    submission.submissionId.toLowerCase().includes(searchLower) ||
    submission.formData?.clientName?.toLowerCase().includes(searchLower) ||
    submission.status.toLowerCase().includes(searchLower)
  );
}
```

### User Management Page

```typescript
searchConfig: SearchConfig = {
  placeholder: 'Search users by name or email...',
  debounceTime: 400,
  minLength: 2
};
```

### Product Catalog

```typescript
searchConfig: SearchConfig = {
  placeholder: 'Search products...',
  debounceTime: 250,
  minLength: 1
};
```

## Summary

The SearchComponent provides a clean, reusable solution for implementing search functionality across your Angular application. Its minimalistic design, Material Design integration, and flexible configuration make it perfect for any search requirements while maintaining consistent UX patterns.

**Key Benefits:**

- ✅ **Reusable** - Use across multiple pages and components
- ✅ **Configurable** - Adapt to different search requirements
- ✅ **Performance** - Built-in debouncing and optimization
- ✅ **Responsive** - Works perfectly on all devices
- ✅ **Accessible** - Full accessibility support
- ✅ **Type Safe** - Complete TypeScript integration
