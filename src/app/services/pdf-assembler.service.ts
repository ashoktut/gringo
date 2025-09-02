import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PdfAssemblerService {
  constructor(private http: HttpClient) {}

  /**
   * Loads the HTML template and CSS, injects the CSS, replaces placeholders with data, and returns the final HTML string.
   * @param contentHtml The HTML content to inject (e.g., from Mammoth or your form data)
   * @param dataObj An object with keys matching the placeholders in the template (e.g., { repName: 'John', ... })
   */
  async assemblePdfHtml(contentHtml: string, dataObj: Record<string, any>): Promise<string> {
    // Format createdAt if present
    if (dataObj['createdAt']) {
      dataObj['createdAt'] = this.formatTimestamp(new Date(dataObj['createdAt']));
    }

    // Load base64 images for PDF compatibility
    const headerImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAeAIYDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9Ej8RJBjK2K7DaP8AMXWX6GJP/wBP8zdJf+UqE/xFX/P+mffRR1FWbov/AIRfZ/7e3/l5z/8AJI+1Jy/8qcJz/YKo/wBjVf8A1o+QP+EdY2/zFb9/+Tfyfzj/AHQf/wCWNZv+gfZz/spif+Qv+cf3hf8Ayz/bL/8AYzfv/wBZv8x/+Cc/+ZZ/7Iff/lp/K/8APvf+f/df+U/X2P8A3e/+gV/z1/y/+W/5ff8A3b/+uf8A3sf/ANb/AP6/+e/8qb+f/K/95/8A4I/yzv8A6//2Q==';
    const footerImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    // Add base64 images to data object for template replacement
    const enhancedDataObj: Record<string, any> = {
      ...dataObj,
      headerImageBase64,
      footerImageBase64
    };

    // Load template from assets (now with inline styles)
    const template = await firstValueFrom(
      this.http.get('assets/pdf-template.html', { responseType: 'text' })
    );

    console.log('📄 PDF Template loaded with inline styles:', template.length, 'characters');

    // Replace {{CONTENT}} placeholder with your generated content
    let finalHtml = template.replace('{{CONTENT}}', contentHtml);

    // Replace all other {{placeholders}} with values from enhancedDataObj (including base64 images)
    finalHtml = finalHtml.replace(/{{(\w+)}}/g, (match, key) => {
      return enhancedDataObj[key] !== undefined ? enhancedDataObj[key] : '';
    });

    console.log('🔄 Final styled template length:', finalHtml.length, 'characters');
    console.log('🖼️ Base64 images injected for PDF compatibility');
    console.log('📄 Template prepared with repeating headers/footers for multi-page support');

    return finalHtml;
  }

  /**
   * Adds page break utilities to content for better PDF pagination
   * @param content HTML content to enhance with page breaks
   * @returns Enhanced content with page break classes
   */
  addPageBreakSupport(content: string): string {
    // Add page break before large sections
    content = content.replace(
      /<section class="rfq-section"/g, 
      '<section class="rfq-section no-page-break"'
    );
    
    // Add page breaks before major headers
    content = content.replace(
      /<h2 class="section-title">PROJECT DESIGN INFORMATION<\/h2>/g,
      '<div class="page-break-before"></div><h2 class="section-title">PROJECT DESIGN INFORMATION</h2>'
    );
    
    content = content.replace(
      /<h2 class="section-title">ROOF COVERING INFORMATION<\/h2>/g,
      '<div class="page-break-before"></div><h2 class="section-title">ROOF COVERING INFORMATION</h2>'
    );
    
    // Prevent certain elements from breaking across pages
    content = content.replace(
      /<div class="signature-section">/g,
      '<div class="signature-section no-page-break">'
    );
    
    return content;
  }

  /**
   * Gets recommended html2pdf.js options for this template
   * @returns html2pdf.js configuration object
   */
  getHtml2PdfOptions(): any {
    return {
      margin: [20, 15, 20, 15], // top, right, bottom, left (in mm)
      filename: 'rfq-document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true,
        allowTaint: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        putOnlyUsedFonts: true,
        floatPrecision: 16
      },
      pagebreak: {
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: '.no-page-break'
      }
    };
  }

  /**
   * Process CSS to replace variables with actual values for better PDF compatibility
   */
  private processCssForPdf(css: string): string {
    // Define the CSS variable values for PDF generation
    const cssVariables = {
      '--primary-blue': '#1565C0',
      '--secondary-blue': '#1976D2',
      '--accent-blue': '#2196F3',
      '--light-blue': '#E3F2FD',
      '--success-green': '#388E3C',
      '--warning-orange': '#F57C00',
      '--error-red': '#D32F2F',
      '--neutral-gray': '#424242',
      '--light-gray': '#F5F5F5',
      '--white': '#FFFFFF',
      '--text-dark': '#212121',
      '--text-light': '#757575',
      '--border-color': '#E0E0E0',
      '--shadow': '0 2px 8px rgba(0, 0, 0, 0.1)',
      '--shadow-hover': '0 4px 16px rgba(0, 0, 0, 0.15)'
    };

    // Replace CSS variables with actual values
    let processedCss = css;

    // First remove the :root declaration to avoid conflicts
    processedCss = processedCss.replace(/:root\s*\{[^}]*\}/g, '');

    // Replace var() functions with actual values
    Object.entries(cssVariables).forEach(([variable, value]) => {
      const varRegex = new RegExp(`var\\(\\s*${variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\)`, 'g');
      processedCss = processedCss.replace(varRegex, value);
    });

    // Add important declarations for key styling that might be overridden
    processedCss += `

    /* PDF-specific overrides */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
      color: #212121 !important;
      background: #FFFFFF !important;
    }

    .lcp-header {
      background: linear-gradient(135deg, #1565C0 0%, #1976D2 100%) !important;
      color: white !important;
    }

    .rfq-section {
      border: 1px solid #E0E0E0 !important;
      background: #FFFFFF !important;
    }

    .rfq-section:nth-child(odd) {
      border-left: 4px solid #1565C0 !important;
    }

    .rfq-section:nth-child(even) {
      border-left: 4px solid #388E3C !important;
    }

    .rfq-section:nth-child(3n) {
      border-left: 4px solid #F57C00 !important;
    }
    `;

    return processedCss;
  }

  /**
   * Debug method to preview the styled HTML in browser
   */
  async previewStyledHtml(contentHtml: string, dataObj: Record<string, any>): Promise<void> {
    const styledHtml = await this.assemblePdfHtml(contentHtml, dataObj);

    // Open in new window for preview
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(styledHtml);
      newWindow.document.close();
      console.log('🖥️ Styled HTML preview opened in new window');
    } else {
      console.log('📄 Styled HTML (first 1000 chars):', styledHtml.substring(0, 1000));
    }
  }

  /**
   * Formats a Date object as 'YYYY-MM-DD HH:mm:ss ±HH:MM'
   */
  private formatTimestamp(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const min = pad(date.getMinutes());
    const sec = pad(date.getSeconds());
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const offsetHours = pad(Math.floor(absOffset / 60));
    const offsetMinutes = pad(absOffset % 60);
    return `${year}-${month}-${day} ${hour}:${min}:${sec} ${sign}${offsetHours}:${offsetMinutes}`;
  }
}
