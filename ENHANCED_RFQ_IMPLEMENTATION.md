# 🚀 Enhanced RFQ System with Docx Library Integration

## **Installation Steps**

### **Step 1: Install Required Packages**

```bash
# Core docx processing library
npm install docx

# PDF conversion support
npm install html-docx-js
npm install pizzip

# Image processing
npm install file-saver

# TypeScript types
npm install --save-dev @types/file-saver
```

### **Step 2: Update Package.json Dependencies**

Add to your `package.json`:

```json
{
  "dependencies": {
    "docx": "^8.2.2",
    "html-docx-js": "^0.3.1",
    "pizzip": "^3.1.4",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.5"
  }
}
```

### **Step 3: Configure Angular for File Processing**

Update your `angular.json` to include necessary assets:

```json
{
  "projects": {
    "gringo": {
      "architect": {
        "build": {
          "options": {
            "assets": [
              "src/favicon.ico",
              "src/assets",
              {
                "glob": "**/*",
                "input": "node_modules/docx/build",
                "output": "/assets/docx/"
              }
            ]
          }
        }
      }
    }
  }
}
```

## **Updated Services Integration**

### **✅ Enhanced Services**

1. **PDF Generation Service** - Now includes docx processing
2. **Template Management Service** - Binary content storage
3. **Template Processing Service** - Enhanced with binary support
4. **Form Submission Service** - Integrated email sending
5. **Docx Processing Service** - New service for format preservation

### **✅ Enhanced Features**

1. **Format Preservation**: Word styling maintained in PDFs
2. **Image Support**: Proper image insertion and sizing
3. **Automatic Email**: RFQ submissions trigger emails
4. **Binary Storage**: Original files preserved for processing
5. **Fallback Support**: String replacement if docx fails

## **Word Template Creation Guide**

### **1. Create Your Word Template**

``
RFQ SUBMISSION - {{submissionId}}
Generated: {{dateSubmitted}}

═══════════════════════════════════

CLIENT INFORMATION:
Name: {{clientName}}
Email: {{clientEmail}}
Phone: {{clientPhone}}
Address: {{standNum}}
Type: {{clientType}}

PROJECT DETAILS:
Representative: {{repName}}
Due Date: {{dateDue}}
Timeline: {{roofTimeline}}

TECHNICAL SPECIFICATIONS:
Structure: {{structureType}}
Building Type: {{buildingType}}
Solar Loading: {{isSolarLoading}}
Solar Area: {{solarLoadingArea}}

DOCUMENTATION:
Site Photo: {{sitePhoto}}
Drawing 1: {{drawingPhoto1}}
Architectural: {{architecturalDrawing}}

ADDITIONAL NOTES:
{{trussNotes}}
{{generalNotes}}
``

### **2. Template Formatting Tips**

- **Use consistent fonts** (Arial, Calibri work best)
- **Apply proper headings** (Heading 1, 2, etc.)
- **Use tables** for structured data
- **Include placeholders** exactly as shown: `{{fieldName}}`
- **Leave space** around image placeholders
- **Use page breaks** for sections if needed

### **3. Image Placeholder Guidelines**

``
Site Documentation:
{{sitePhoto}}

Technical Drawings:
{{drawingPhoto1}}

{{drawingPhoto2}}

Architectural Plans:
{{architecturalDrawing}}
``

## **Testing Your Implementation**

### **Step 1: Upload Enhanced Template**

1. Create Word template with placeholders
2. Go to `/templates`
3. Upload your .docx file
4. Verify `preserveFormatting: true` is set
5. Check console for processing logs

### **Step 2: Submit Test RFQ**

1. Go to `/rfq`
2. Fill complete form including:
   - Client information
   - CC mail recipients
   - Site photos and drawings
   - Technical specifications
3. Submit form
4. Check console for processing steps

### **Step 3: Verify PDF Generation**

1. Go to `/submissions`
2. Find your test submission
3. Click PDF button
4. Select your uploaded template
5. Verify PDF downloads with:
   - ✅ Preserved formatting
   - ✅ Populated data
   - ✅ Included images

### **Step 4: Check Email Functionality**

1. Verify success message shows email status
2. Check that recipients include:
   - Client email
   - All selected CC recipients
3. Confirm PDF attachment is mentioned

## **Console Output Examples**

### **Template Upload**

``
📄 Template processed: My RFQ Template.docx
🎯 Format preservation: true
🖼️ Has images: true
📋 Placeholders found: 24
``

### **PDF Generation**

``
🎯 Using docx library for format preservation
🔄 Processing text placeholders with formatting preservation
🖼️ Processing image placeholders
📄 Converting document to PDF
✅ PDF generated successfully
``

### **Email Sending**

``
📧 Sending RFQ email to: {
  client: "john@email.com",
  cc: ["andri@roofing.com", "bryan@roofing.com"],
  submissionId: "RFQ-12345"
}
✅ Email sent successfully to 3 recipients
``

## **Troubleshooting**

### **Common Issues & Solutions**

1. **PDF Generation Fails**:
   - Check if docx library is installed
   - Verify template has `originalFile` property
   - Check console for error messages
   - Falls back to string replacement automatically

2. **Images Not Showing**:
   - Verify image field names match placeholders
   - Check image upload is working
   - Ensure images are properly processed

3. **Formatting Lost**:
   - Confirm `preserveFormatting: true`
   - Check template type is 'word'
   - Verify `originalFile` is stored

4. **Email Not Sending**:
   - Check client email is provided
   - Verify CC mail addresses are selected
   - Check console for email service logs

### **Performance Optimization**

- **Limit image sizes** to reasonable dimensions
- **Use compression** for large documents
- **Cache processed templates** for repeated use
- **Consider server-side processing** for production

## **Production Considerations**

### **Security**

- Validate all file uploads
- Sanitize form data before processing
- Implement proper error handling

### **Performance**

- Add loading indicators for PDF generation
- Implement progress tracking for large files
- Consider background processing for emails

### **Scalability**

- Move to server-side docx processing
- Implement template caching
- Use proper file storage service

## **Summary**

Your RFQ system now features:

- ✅ **Enhanced PDF Generation** with format preservation
- ✅ **Professional Email Integration** with attachments
- ✅ **Binary Template Storage** for docx processing
- ✅ **Automatic Workflow** from submission to email
- ✅ **Backward Compatibility** with fallback support
- ✅ **Comprehensive Error Handling** and logging

**The system maintains Word document formatting while providing seamless RFQ processing and distribution!** 🎯📄✨
