# 📄 Docx Library Implementation Guide

## **Step 1: Install Required Dependencies**

```bash
# Install docx library for Word document processing
npm install docx

# Install additional libraries for PDF conversion (optional)
npm install html-pdf-node
npm install pdf-lib

# Install types for TypeScript support
npm install --save-dev @types/docx
```

## **Step 2: Enhanced Template Processing Service**

Your template models have been updated to support:

```typescript
export interface Template {
  // ... existing properties
  originalFile?: Blob;                // ✅ Original Word file storage
  binaryContent?: ArrayBuffer;        // ✅ Binary data preservation  
  preserveFormatting?: boolean;       // ✅ Format preservation flag
  hasImages?: boolean;                // ✅ Image placeholder detection
}

export interface TemplateGenerationRequest {
  // ... existing properties
  preserveFormatting?: boolean;       // ✅ Enable format preservation
  imageProcessing?: ImageProcessingOptions; // ✅ Image processing options
}
```

## **Step 3: Integration with Your PDF Generation Service**

Update your `pdf-generation.service.ts`:

```typescript
import { DocxProcessingService } from './docx-processing.service';

@Injectable({
  providedIn: 'root'
})
export class PdfGenerationService {

  constructor(
    private docxProcessor: DocxProcessingService
    // ... other dependencies
  ) {}

  generatePdfFromTemplate(request: TemplateGenerationRequest): Observable<Blob> {
    return this.templateService.getTemplate(request.templateId).pipe(
      switchMap(template => {
        
        // ✅ Use docx processing for Word templates with format preservation
        if (template.type === 'word' && template.preserveFormatting && template.originalFile) {
          console.log('🎯 Using docx library for format preservation');
          return this.docxProcessor.processDocxTemplate(template, request.formData);
        }
        
        // ❌ Fallback to string replacement (loses formatting)
        console.log('⚠️ Using fallback string replacement');
        return this.generateFromStringContent(template, request);
      })
    );
  }
}
```

## **Step 4: Enhanced Template Upload**

Update your template upload to preserve binary content:

```typescript
// In template-management.service.ts
uploadTemplate(request: TemplateUploadRequest): Observable<Template> {
  return new Observable(observer => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const template: Template = {
        id: this.generateId(),
        name: request.name,
        type: 'word',
        formType: request.formType,
        content: '', // Will be extracted
        placeholders: [], // Will be extracted
        size: request.file.size,
        uploadedAt: new Date(),
        isUniversal: request.isUniversal || false,
        
        // ✅ Enhanced properties for docx processing
        originalFile: request.file,                    // Store original file
        binaryContent: reader.result as ArrayBuffer,   // Store binary data
        preserveFormatting: request.preserveFormatting ?? true, // Enable by default
        hasImages: this.detectImagePlaceholders(request.file)
      };
      
      // Extract placeholders and content
      this.extractPlaceholders(template).subscribe(extractedTemplate => {
        observer.next(extractedTemplate);
        observer.complete();
      });
    };
    
    reader.onerror = () => observer.error(new Error('Failed to read template file'));
    reader.readAsArrayBuffer(request.file);
  });
}
```

## **Step 5: RFQ Form Integration**

Your RFQ form submission automatically uses the enhanced processing:

```typescript
// In rfq.component.ts - no changes needed!
onFormSubmit(event: any) {
  // Form submission automatically uses docx processing
  // if template has preserveFormatting: true
  this.formSubmissionService.createSubmission('RFQ', 'Request for Quote', submissionData, this.rfqSections)
}
```

## **Step 6: Word Template Placeholders**

Create your Word templates with these placeholders:

### **Client Information**

``
Client Name: {{clientName}}
Email: {{clientEmail}}
Phone: {{clientPhone}}
Address: {{standNum}}
Type: {{clientType}}
``

### **Project Details**

``
Representative: {{repName}}
Timeline: {{roofTimeline}}
Structure: {{structureType}}
Building Type: {{buildingType}}
``

### **Technical Requirements**

``
Solar Loading: {{isSolarLoading}}
Solar Area: {{solarLoadingArea}}
Geyser Loading: {{isGeyserLoading}}
Exposed Truss: {{isExposedTrussRequired}}
``

### **Images**

``
Site Photo: {{sitePhoto}}
Drawing 1: {{drawingPhoto1}}
Drawing 2: {{drawingPhoto2}}
Architectural: {{architecturalDrawing}}
``

### **Arrays (Multi-select)**

``
Services: {{serviceType}}
Structure Types: {{structureType}}
Sundry Items: {{trussSundry}}
``

### **Dates**

``
Submitted: {{dateSubmitted}}
Due: {{dateDue}}
``

## **Step 7: Advanced Formatting Features**

The docx library approach preserves:

- ✅ **Font styles, sizes, colors**
- ✅ **Tables with borders and formatting**
- ✅ **Headers and footers**
- ✅ **Images with proper sizing**
- ✅ **Paragraph spacing and indentation**
- ✅ **Page layouts and breaks**
- ✅ **Bullets and numbering**

## **Step 8: Testing Your Implementation**

1. **Upload Word Template**:
   - Create Word doc with {{placeholders}}
   - Upload via `/templates` page
   - Verify `preserveFormatting: true`

2. **Submit RFQ Form**:
   - Fill out complete RFQ form
   - Include images for testing
   - Submit form

3. **Generate PDF**:
   - Go to `/submissions`
   - Find your submission
   - Click PDF button
   - Verify formatting is preserved

## **Step 9: Troubleshooting**

### **Common Issues**

1. **Images not appearing**:
   - Check image field names match placeholders
   - Verify image data is properly processed

2. **Formatting lost**:
   - Ensure `preserveFormatting: true`
   - Check `originalFile` is stored
   - Verify docx library is installed

3. **Placeholders not replaced**:
   - Check placeholder syntax: `{{fieldName}}`
   - Verify field names match exactly
   - Check console for processing logs

### **Performance Considerations**

- Docx processing is slower than string replacement
- Consider caching processed templates
- Optimize image sizes for faster processing

## **Step 10: Production Deployment**

For production:

- Consider server-side docx processing
- Implement proper error handling
- Add progress indicators for large documents
- Cache processed templates

---

**Your RFQ system now supports full Word document formatting preservation using the docx library approach!** 🎯📄✨
