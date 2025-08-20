import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Template, TemplateUploadRequest, TemplateType, DocumentType } from '../models/template.models';

@Injectable({
  providedIn: 'root'
})
export class TemplateProcessingService {

  /**
   * Process uploaded file and extract template data
   */
  processTemplateFile(request: TemplateUploadRequest): Observable<Template> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const template: Template = {
            id: this.generateTemplateId(),
            name: request.file.name,
            type: this.determineTemplateType(request.file),
            formType: request.formType,
            content: content,
            placeholders: this.extractPlaceholders(content),
            size: request.file.size,
            uploadedAt: new Date(),
            isUniversal: request.isUniversal || false,
            metadata: request.metadata
          };

          observer.next(template);
          observer.complete();
        } catch (error) {
          observer.error(new Error('Failed to process template file: ' + (error as Error).message));
        }
      };

      reader.onerror = () => {
        observer.error(new Error('Failed to read template file'));
      };

      reader.readAsText(request.file);
    });
  }

  /**
   * Validate template file
   */
  validateTemplateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size must be less than 10MB');
    }
    
    // Check file type
    const validExtensions = ['.doc', '.docx', '.odt', '.gdoc'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      errors.push('Please select a valid document file (.doc, .docx, .odt, .gdoc)');
    }
    
    // Check file name
    if (!file.name || file.name.trim().length === 0) {
      errors.push('File must have a valid name');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract placeholders from template content
   */
  extractPlaceholders(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const placeholder = match[1].trim();
      if (placeholder && !placeholders.includes(placeholder)) {
        placeholders.push(placeholder);
      }
    }
    
    return placeholders.sort();
  }

  /**
   * Validate placeholders in template
   */
  validatePlaceholders(placeholders: string[]): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    // Check for common placeholder naming issues
    placeholders.forEach(placeholder => {
      if (placeholder.includes(' ')) {
        warnings.push(`Placeholder "${placeholder}" contains spaces - consider using camelCase`);
      }
      
      if (placeholder.length > 50) {
        warnings.push(`Placeholder "${placeholder}" is very long - consider shortening`);
      }
      
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(placeholder)) {
        warnings.push(`Placeholder "${placeholder}" should start with a letter and contain only letters, numbers, and underscores`);
      }
    });
    
    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  /**
   * Clone template for different form type
   */
  cloneTemplate(originalTemplate: Template, newFormType: TemplateType, newName?: string): Template {
    return {
      ...originalTemplate,
      id: this.generateTemplateId(),
      name: newName || `${originalTemplate.name} (${newFormType})`,
      formType: newFormType,
      uploadedAt: new Date(),
      metadata: {
        ...originalTemplate.metadata,
        version: '1.0 (cloned)'
      }
    };
  }

  /**
   * Get template statistics
   */
  getTemplateStatistics(template: Template): any {
    return {
      placeholderCount: template.placeholders.length,
      contentLength: template.content.length,
      estimatedWords: template.content.split(/\s+/).length,
      createdDaysAgo: Math.floor((Date.now() - template.uploadedAt.getTime()) / (1000 * 60 * 60 * 24))
    };
  }

  private generateTemplateId(): string {
    return 'template_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private determineTemplateType(file: File): DocumentType {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'docx':
      case 'doc':
        return 'word';
      case 'gdoc':
        return 'google-docs';
      case 'odt':
        return 'odt';
      default:
        return 'word';
    }
  }
}
