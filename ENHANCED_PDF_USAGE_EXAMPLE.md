# Enhanced PDF System with Page Breaks and Repeating Headers/Footers

## Overview

The PDF system now supports **repeating headers and footers on every page** with **intelligent page break handling** for multi-page documents. This ensures professional PDFs with consistent branding and proper content flow.

## Key Features Implemented

### ✅ Repeating Headers/Footers

- **Fixed positioning** headers and footers on every PDF page
- **Base64 embedded images** for complete offline compatibility
- **Professional branding** with LCP Roofing logo and contact info
- **Page numbering** and document metadata

### ✅ Smart Page Breaks

- **CSS-controlled page breaks** using `page-break-before`, `page-break-after`
- **Content protection** with `no-page-break` class for sections that shouldn't split
- **html2pdf.js optimized** configuration for reliable page handling
- **Automatic section spacing** to prevent orphaned content

### ✅ Enhanced Template Structure

- **Print-specific styles** that only apply during PDF generation
- **Screen vs Print layouts** - headers/footers hidden on screen, visible in PDF
- **Responsive margins** that account for fixed header/footer space
- **Professional typography** optimized for print output

## Usage Examples

### 1. Basic PDF Generation with Enhanced Features

```typescript
import { PdfAssemblerService } from './services/pdf-assembler.service';
import html2pdf from 'html2pdf.js';

export class DocumentService {
  constructor(private pdfAssembler: PdfAssemblerService) {}

  async generateEnhancedPdf(formData: any): Promise<void> {
    try {
      // 1. Prepare content HTML (your form data, dynamic content, etc.)
      const contentHtml = this.buildContentFromFormData(formData);
      
      // 2. Add page break support for better pagination
      const enhancedContent = this.pdfAssembler.addPageBreakSupport(contentHtml);
      
      // 3. Assemble the complete PDF HTML with headers/footers
      const finalHtml = await this.pdfAssembler.assemblePdfHtml(
        enhancedContent, 
        {
          repName: formData.repName || 'Representative Name',
          submissionId: formData.submissionId || 'RFQ-' + Date.now(),
          createdAt: new Date().toLocaleString(),
          clientName: formData.clientName,
          // ... other template variables
        }
      );
      
      // 4. Get optimized html2pdf.js options
      const pdfOptions = this.pdfAssembler.getHtml2PdfOptions();
      
      // 5. Generate PDF with repeating headers/footers
      const element = document.createElement('div');
      element.innerHTML = finalHtml;
      
      await html2pdf()
        .from(element)
        .set(pdfOptions)
        .save('professional-document.pdf');
        
      console.log('✅ PDF generated with repeating headers/footers');
      
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
    }
  }
}
```

### 2. Advanced Page Break Control

```typescript
export class AdvancedPdfService {
  
  buildContentWithPageBreaks(sections: any[]): string {
    return sections.map((section, index) => {
      let sectionHtml = `<section class="rfq-section no-page-break">`;
      
      // Add page break before major sections (except first)
      if (index > 0 && section.isNewPage) {
        sectionHtml = `<div class="page-break-before"></div>` + sectionHtml;
      }
      
      sectionHtml += `
        <h2 class="section-title">${section.title}</h2>
        <div class="section-content">
          ${section.content}
        </div>
      </section>`;
      
      // Add page break after section if specified
      if (section.breakAfter) {
        sectionHtml += `<div class="page-break-after"></div>`;
      }
      
      return sectionHtml;
    }).join('\n');
  }
  
  async generateMultiPageDocument(formData: any): Promise<void> {
    const sections = [
      {
        title: 'Project Overview',
        content: this.buildProjectOverview(formData),
        isNewPage: false // First section, no page break
      },
      {
        title: 'Technical Specifications',
        content: this.buildTechnicalSpecs(formData),
        isNewPage: true, // Start on new page
        breakAfter: false
      },
      {
        title: 'Detailed Drawings',
        content: this.buildDrawingsSection(formData),
        isNewPage: true, // Start on new page
        breakAfter: true // Force page break after
      },
      {
        title: 'Terms and Conditions',
        content: this.buildTermsSection(formData),
        isNewPage: true
      }
    ];
    
    const contentHtml = this.buildContentWithPageBreaks(sections);
    
    // Continue with PDF generation...
  }
}
```

### 3. Customizing Headers and Footers

The template includes placeholders that you can customize:

```typescript
const templateData = {
  // Header customization
  repName: 'John Smith',
  createdAt: new Date().toLocaleString(),
  
  // Footer customization  
  submissionId: 'RFQ-2025-001',
  
  // Content variables
  clientName: 'ABC Construction',
  projectAddress: '123 Main Street',
  // ... other form fields
};
```

### 4. html2pdf.js Configuration

The service provides optimized configuration:

```typescript
const pdfOptions = this.pdfAssembler.getHtml2PdfOptions();

// Default configuration includes:
{
  margin: [20, 15, 20, 15], // Account for fixed headers/footers
  filename: 'rfq-document.pdf',
  image: { type: 'jpeg', quality: 0.98 }, // High quality images
  html2canvas: { 
    scale: 2,              // High resolution
    useCORS: true,         // Handle cross-origin images
    letterRendering: true  // Better text rendering
  },
  jsPDF: { 
    unit: 'mm', 
    format: 'a4', 
    orientation: 'portrait'
  },
  pagebreak: {
    mode: ['avoid-all', 'css', 'legacy'],
    before: '.page-break-before',    // Elements that force page breaks
    after: '.page-break-after',
    avoid: '.no-page-break'          // Elements that avoid breaking
  }
}
```

## CSS Classes for Page Control

### Page Break Classes

- `.page-break-before` - Forces a page break before the element
- `.page-break-after` - Forces a page break after the element  
- `.no-page-break` - Prevents the element from breaking across pages

### Layout Classes

- `.print-header` - Fixed header that appears on every page
- `.print-footer` - Fixed footer that appears on every page
- `.print-content` - Main content area with proper margins

### Usage in Templates

```html
<!-- Force new page before this section -->
<div class="page-break-before"></div>
<section class="rfq-section no-page-break">
  <h2>Important Section</h2>
  <p>This section won't break across pages</p>
</section>

<!-- Force new page after this content -->
<div class="signature-section no-page-break">
  <p>Signature area</p>
</div>
<div class="page-break-after"></div>
```

## Benefits

### Professional Output

- ✅ Consistent headers and footers on every page
- ✅ Proper page numbering and document metadata
- ✅ Brand compliance with embedded logos
- ✅ Clean page breaks that respect content boundaries

### Technical Excellence  

- ✅ Base64 embedded images (no external dependencies)
- ✅ Print-optimized CSS with static color values
- ✅ html2pdf.js compatibility with advanced configuration
- ✅ Responsive design that works in browser and PDF

### Content Management

- ✅ Intelligent page break control
- ✅ Section-aware pagination
- ✅ Orphan/widow prevention
- ✅ Flexible template structure

## Integration with Existing Services

The enhanced PdfAssemblerService integrates seamlessly with:

- **DocxProcessingService** - For Word template processing
- **PdfGenerationService** - For form-agnostic PDF generation  
- **PdfTemplateService** - For template management
- **FormSubmissionService** - For dynamic data injection

## Testing and Validation

Test the enhanced PDF system:

1. **Single Page Documents** - Verify headers/footers appear correctly
2. **Multi-Page Documents** - Confirm headers/footers repeat on each page
3. **Page Break Control** - Test section-level page break behavior
4. **Image Quality** - Verify base64 images render properly
5. **Content Flow** - Ensure natural content pagination

The system provides comprehensive logging to help troubleshoot any issues during PDF generation.
