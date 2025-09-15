# PDF Print Testing Guide

## Overview

The PDF template has been enhanced with comprehensive print functionality to ensure headers and footers appear on every page of the generated PDF. This implementation uses multiple approaches for maximum browser compatibility.

## Print Implementation Methods

### 1. Fixed Positioning Method

- **Primary approach** using `position: fixed` in print media queries
- Headers positioned at `top: 0` with `z-index: 10000`
- Footers positioned at `bottom: 0` with `z-index: 10000`
- Content margins adjusted to accommodate fixed elements

### 2. CSS Generated Content Method

- Uses `@page` rules with `@top-center` and `@bottom-center`
- Implements `position: running()` for elements
- Provides automatic page numbering
- Best support in modern browsers

### 3. Print-Specific Elements

- Dedicated `.print-page-header` and `.print-page-footer` classes
- Hidden on screen (`display: none`) but visible in print
- Contains styled header/footer content with images and metadata

## Testing Instructions

### Browser Testing

1. **Chrome/Edge (Recommended)**
   - Open the PDF template in browser
   - Press `Ctrl+P` or `Cmd+P`
   - Select "Save as PDF" destination
   - Check "More settings" → "Background graphics"
   - Verify headers/footers on all pages

2. **Firefox**
   - Open the PDF template
   - Use Print Preview (`Ctrl+Shift+P`)
   - Enable "Print backgrounds" in print options
   - Check multi-page output

3. **Safari**
   - Open template in Safari
   - File → Print → Show Details
   - Enable "Print backgrounds"
   - Test PDF generation

### Testing Checklist

- [ ] Header appears on every page
- [ ] Footer appears on every page
- [ ] Header contains company logo and title
- [ ] Footer contains company info and submission ID
- [ ] Content doesn't overlap with headers/footers
- [ ] Page breaks work correctly
- [ ] Colors and styling are preserved
- [ ] Images in headers/footers display correctly
- [ ] Text is readable and properly sized

## Key Features

### Professional Header

- Company logo/header image
- RFQ title and subtitle
- Representative name and submission timestamp
- Color-coded left border (warning orange)

### Professional Footer

- Company footer image
- Company name and submission details
- Page numbering (when supported)
- Clean background styling

### Content Protection

- Sections avoid page breaks (`page-break-inside: avoid`)
- Grid layouts adapt for print (2-column instead of 3+)
- Proper spacing around fixed elements
- Color preservation with `print-color-adjust: exact`

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Fixed positioning | ✅ | ✅ | ⚠️ | ✅ |
| @page rules | ✅ | ⚠️ | ⚠️ | ✅ |
| CSS Generated Content | ✅ | ❌ | ❌ | ✅ |
| Background images | ✅ | ✅ | ✅ | ✅ |
| Color preservation | ✅ | ✅ | ✅ | ✅ |

**Legend:**

- ✅ Full support
- ⚠️ Partial support
- ❌ Limited support

## Troubleshooting

### Headers/Footers Not Appearing

1. Ensure "Background graphics" is enabled in print settings
2. Check that image paths are correct (`assets/images/`)
3. Verify CSS is properly linked
4. Try different browser if issues persist

### Content Overlapping

1. Adjust `.pdf-page-margins` padding values in CSS
2. Modify fixed header/footer heights if needed
3. Check `z-index` values for proper layering

### Styling Issues

1. Verify `print-color-adjust: exact` is set
2. Check that CSS variables are defined
3. Ensure print media queries are not conflicting

## File Structure

``
src/app/pages/templates/
├── pdf-template.html          # Main template with print elements
├── pdf-styles.css            # Complete styling with print queries
└── PRINT_TESTING_GUIDE.md    # This guide
``

## Next Steps

1. Test across all target browsers
2. Adjust margins/spacing if needed
3. Verify image paths in production environment
4. Consider PDF generation service compatibility
5. Test with actual dynamic data
