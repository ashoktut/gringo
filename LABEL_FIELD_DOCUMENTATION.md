# Label Field Documentation

## Overview

The **Label Field** is a new FormField type that allows you to display non-editable text content within forms. It's perfect for adding instructions, titles, warnings, captions, and other informational content to enhance user experience.

## Features

### 🎯 Core Features

- **Display-only**: No form control created, purely for display
- **Multiple Styles**: 6 predefined styles (default, title, subtitle, caption, info, warning, error)
- **Flexible Alignment**: Left, center, right text alignment
- **Custom Styling**: Custom colors, font sizes, bold, italic
- **Responsive**: Mobile-optimized display
- **Form Integration**: Seamlessly integrates with existing form structure

### 🎨 Style Variants

- **Default**: Standard text display
- **Title**: Large, bold heading text
- **Subtitle**: Medium heading text
- **Caption**: Small, italic descriptive text
- **Info**: Blue information box with border
- **Warning**: Orange warning box with border
- **Error**: Red error/alert box with border

## Basic Usage

### Simple Text Label

```typescript
{
  name: 'infoLabel',
  label: '',
  type: 'label',
  text: 'This is a simple information label.'
}
```

### Styled Label

```typescript
{
  name: 'titleLabel',
  label: '',
  type: 'label',
  text: 'Form Section Title',
  labelConfig: {
    style: 'title',
    alignment: 'center',
    bold: true
  }
}
```

### Information Box

```typescript
{
  name: 'instructionsLabel',
  label: '',
  type: 'label',
  text: 'Please complete all required fields before submitting.',
  labelConfig: {
    style: 'info',
    alignment: 'left'
  }
}
```

### Warning Notice

```typescript
{
  name: 'warningLabel',
  label: '',
  type: 'label',
  text: '⚠️ Important: Double-check all information before proceeding.',
  labelConfig: {
    style: 'warning',
    alignment: 'left'
  }
}
```

## Configuration Options

### LabelConfig Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `style` | `'default' \| 'title' \| 'subtitle' \| 'caption' \| 'info' \| 'warning' \| 'error'` | `'default'` | Visual style variant |
| `alignment` | `'left' \| 'center' \| 'right'` | `'left'` | Text alignment |
| `color` | `string` | - | Custom text color (CSS color value) |
| `fontSize` | `string` | - | Custom font size (CSS size value) |
| `bold` | `boolean` | `false` | Bold text |
| `italic` | `boolean` | `false` | Italic text |

### FormField Properties for Labels

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | ✅ | Unique field identifier |
| `label` | `string` | ✅ | Field label (can be empty for labels) |
| `type` | `'label'` | ✅ | Must be 'label' |
| `text` | `string` | ✅ | The text content to display |
| `labelConfig` | `LabelConfig` | ❌ | Style configuration object |

## Style Examples

### Default Style

```typescript
{
  name: 'defaultLabel',
  type: 'label',
  text: 'Regular text content'
  // No labelConfig = default style
}
```

### Title Style

```typescript
{
  name: 'titleLabel',
  type: 'label',
  text: 'Section Title',
  labelConfig: {
    style: 'title',
    alignment: 'center'
  }
}
```

### Subtitle Style

```typescript
{
  name: 'subtitleLabel',
  type: 'label',
  text: 'Section Subtitle',
  labelConfig: {
    style: 'subtitle',
    alignment: 'left'
  }
}
```

### Caption Style

```typescript
{
  name: 'captionLabel',
  type: 'label',
  text: 'Additional information or instructions',
  labelConfig: {
    style: 'caption',
    alignment: 'center',
    italic: true
  }
}
```

### Information Box -

```typescript
{
  name: 'infoBox',
  type: 'label',
  text: 'ℹ️ This is important information for the user.',
  labelConfig: {
    style: 'info'
  }
}
```

### Warning Box

```typescript
{
  name: 'warningBox',
  type: 'label',
  text: '⚠️ Please review all information carefully.',
  labelConfig: {
    style: 'warning'
  }
}
```

### Error Box

```typescript
{
  name: 'errorBox',
  type: 'label',
  text: '❌ Critical information that requires attention.',
  labelConfig: {
    style: 'error'
  }
}
```

## Advanced Styling

### Custom Colors and Fonts

```typescript
{
  name: 'customLabel',
  type: 'label',
  text: 'Custom styled text',
  labelConfig: {
    style: 'default',
    color: '#9c27b0',           // Purple text
    fontSize: '18px',           // Custom size
    bold: true,                 // Bold text
    alignment: 'center'         // Centered
  }
}
```

### Combining Styles

```typescript
{
  name: 'combinedLabel',
  type: 'label',
  text: 'Important Notice',
  labelConfig: {
    style: 'subtitle',          // Base style
    color: '#d32f2f',          // Custom red color
    bold: true,                // Bold override
    alignment: 'center'        // Centered text
  }
}
```

## CSS Classes

The component automatically applies CSS classes based on configuration:

### Style Classes

- `.label-default` - Default text style
- `.label-title` - Title style (large, bold)
- `.label-subtitle` - Subtitle style (medium)
- `.label-caption` - Caption style (small, italic)
- `.label-info` - Info box style (blue background)
- `.label-warning` - Warning box style (orange background)
- `.label-error` - Error box style (red background)

### Alignment Classes

- `.label-align-left` - Left-aligned text
- `.label-align-center` - Center-aligned text
- `.label-align-right` - Right-aligned text

### Text Formatting Classes

- `.label-bold` - Bold text
- `.label-italic` - Italic text

## Real-World Examples

### Form Section Header

```typescript
{
  name: 'sectionHeader',
  type: 'label',
  text: 'Personal Information',
  labelConfig: {
    style: 'title',
    alignment: 'left',
    bold: true
  }
}
```

### Instructions

```typescript
{
  name: 'instructions',
  type: 'label',
  text: 'Please fill out all required fields marked with an asterisk (*). Your information will be kept confidential.',
  labelConfig: {
    style: 'info',
    alignment: 'left'
  }
}
```

### Field Separator

```typescript
{
  name: 'separator',
  type: 'label',
  text: '— Additional Details —',
  labelConfig: {
    style: 'caption',
    alignment: 'center',
    italic: true
  }
}
```

### Legal Notice

```typescript
{
  name: 'legalNotice',
  type: 'label',
  text: '⚖️ By submitting this form, you agree to our Terms of Service and Privacy Policy.',
  labelConfig: {
    style: 'caption',
    alignment: 'center'
  }
}
```

### Success Message

```typescript
{
  name: 'successMessage',
  type: 'label',
  text: '✅ Form validation passed. Ready to submit.',
  labelConfig: {
    style: 'default',
    color: '#4caf50',
    bold: true,
    alignment: 'center'
  }
}
```

## Integration with Conditional Fields

Label fields support conditional display just like other field types:

```typescript
{
  name: 'conditionalLabel',
  type: 'label',
  text: 'Additional options are now available based on your selection.',
  labelConfig: {
    style: 'info'
  },
  conditional: {
    dependsOn: 'userType',
    showWhen: 'premium'
  }
}
```

## Form Builder Integration

Label fields are automatically handled by the form builder:

1. **No Form Control**: Label fields don't create form controls (display-only)
2. **Validation Skipped**: No validation applied to label fields
3. **Conditional Support**: Full support for conditional display
4. **Responsive**: Automatically responsive on mobile devices

## Mobile Optimization

Label fields are optimized for mobile devices:

- **Responsive Text**: Font sizes scale appropriately
- **Touch-Friendly**: Adequate spacing and sizing
- **Readable**: High contrast and legible fonts
- **Adaptive Layout**: Adjusts to screen size

## Best Practices

### 🎯 Usage Guidelines

1. **Clear Purpose**: Use labels for instructions, not decorative text
2. **Appropriate Style**: Match style to content importance
3. **Consistent Alignment**: Use consistent alignment within sections
4. **Readable Text**: Ensure sufficient contrast and font size
5. **Mobile-First**: Test on mobile devices for readability

### ✅ Good Examples

```typescript
// Clear instructions
{
  type: 'label',
  text: 'Enter your full legal name as it appears on official documents.',
  labelConfig: { style: 'info' }
}

// Section headers
{
  type: 'label',
  text: 'Contact Information',
  labelConfig: { style: 'title', alignment: 'left' }
}

// Important warnings
{
  type: 'label',
  text: '⚠️ Changes cannot be undone after submission.',
  labelConfig: { style: 'warning' }
}
```

### ❌ Avoid

```typescript
// Don't use for decorative purposes
{
  type: 'label',
  text: '═══════════════',
  labelConfig: { alignment: 'center' }
}

// Don't use extremely long text
{
  type: 'label',
  text: 'Very long paragraph of text that would be better served as help text or in a separate documentation section...'
}
```

## Accessibility

Label fields support accessibility features:

- **Semantic HTML**: Proper markup for screen readers
- **High Contrast**: Color combinations meet WCAG guidelines
- **Keyboard Navigation**: Focusable elements where appropriate
- **Clear Content**: Descriptive and meaningful text

## Performance

Label fields are performance-optimized:

- **No Form State**: Don't participate in form state management
- **Lightweight**: Minimal DOM overhead
- **CSS-Based**: Styling handled via CSS classes
- **Efficient Rendering**: Fast component rendering

## Troubleshooting

### Common Issues

#### Label Not Showing

- Check that `text` property is set
- Verify conditional logic if used
- Ensure proper FormField structure

#### Styling Not Applied

- Verify `labelConfig` object structure
- Check CSS class names in browser dev tools
- Ensure custom colors use valid CSS values

#### Mobile Display Issues

- Test responsive breakpoints
- Check font sizes on mobile devices
- Verify alignment works on small screens

## Future Enhancements

Planned features for label fields:

- **Rich Text**: HTML content support
- **Icons**: Built-in icon support
- **Animation**: Fade-in/slide-in animations
- **Templates**: Predefined label templates
- **Markdown**: Markdown text support

## Summary

The Label Field type provides a powerful way to add instructional and informational content to forms without creating form controls. It offers:

- 6 predefined styles for different use cases
- Flexible alignment and formatting options
- Full integration with conditional field logic
- Mobile-optimized responsive design
- Clean, accessible markup

Use label fields to improve user experience by providing clear instructions, section headers, warnings, and other helpful content directly within your forms.
