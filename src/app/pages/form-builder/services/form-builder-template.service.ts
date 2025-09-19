import { Injectable } from '@angular/core';
import { FormConfiguration } from '../../../services/form-config.service';

export interface TemplateDefinition {
  id: string;
  name: string;
  formType: string;
  icon: string;
  description: string;
  sections: any[];
}

@Injectable({
  providedIn: 'root'
})
export class FormBuilderTemplateService {

  private templates: TemplateDefinition[] = [
    {
      id: 'contact',
      name: 'Contact Form Template',
      formType: 'contact',
      icon: 'contact_mail',
      description: 'Basic contact form template',
      sections: [
        {
          title: 'Contact Information',
          fields: [
            {
              name: 'firstName',
              label: 'First Name',
              type: 'text',
              required: true,
              clearable: true,
            },
            {
              name: 'lastName',
              label: 'Last Name',
              type: 'text',
              required: true,
              clearable: true,
            },
            {
              name: 'email',
              label: 'Email Address',
              type: 'email',
              required: true,
              clearable: true,
            },
            {
              name: 'message',
              label: 'Message',
              type: 'textarea',
              required: true,
              rows: 4,
            }
          ]
        }
      ]
    },
    {
      id: 'survey',
      name: 'Survey Form Template',
      formType: 'survey',
      icon: 'poll',
      description: 'Customer satisfaction survey template',
      sections: [
        {
          title: 'Demographics',
          fields: [
            {
              name: 'age',
              label: 'Age Range',
              type: 'select',
              required: true,
              options: [
                { value: '18-25', label: '18-25' },
                { value: '26-35', label: '26-35' },
                { value: '36-45', label: '36-45' },
                { value: '46-55', label: '46-55' },
                { value: '56+', label: '56+' }
              ]
            },
            {
              name: 'occupation',
              label: 'Occupation',
              type: 'text',
              required: false,
              clearable: true,
            }
          ]
        },
        {
          title: 'Feedback',
          fields: [
            {
              name: 'satisfaction',
              label: 'Overall Satisfaction',
              type: 'select',
              required: true,
              options: [
                { value: '5', label: 'Very Satisfied' },
                { value: '4', label: 'Satisfied' },
                { value: '3', label: 'Neutral' },
                { value: '2', label: 'Dissatisfied' },
                { value: '1', label: 'Very Dissatisfied' }
              ]
            },
            {
              name: 'comments',
              label: 'Additional Comments',
              type: 'textarea',
              required: false,
              rows: 4,
            }
          ]
        }
      ]
    },
    {
      id: 'application',
      name: 'Application Form Template',
      formType: 'application',
      icon: 'description',
      description: 'General job application form template',
      sections: [
        {
          title: 'Personal Information',
          fields: [
            {
              name: 'fullName',
              label: 'Full Name',
              type: 'text',
              required: true,
              clearable: true,
            },
            {
              name: 'email',
              label: 'Email Address',
              type: 'email',
              required: true,
              clearable: true,
            },
            {
              name: 'phone',
              label: 'Phone Number',
              type: 'tel',
              required: true,
              clearable: true,
            },
            {
              name: 'dateOfBirth',
              label: 'Date of Birth',
              type: 'date',
              required: true,
            }
          ]
        },
        {
          title: 'Required Documents',
          fields: [
            {
              name: 'resume',
              label: 'Resume/CV',
              type: 'picture',
              required: true,
              pictureConfig: {
                placeholder: 'Upload Resume',
                maxFileSize: 5242880,
                acceptedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
              },
            },
            {
              name: 'coverLetter',
              label: 'Cover Letter',
              type: 'textarea',
              required: false,
              rows: 6,
            }
          ]
        }
      ]
    },
    {
      id: 'feedback',
      name: 'Feedback Form Template',
      formType: 'feedback',
      icon: 'feedback',
      description: 'General feedback and suggestion form template',
      sections: [
        {
          title: 'Feedback Subject',
          fields: [
            {
              name: 'category',
              label: 'Feedback Category',
              type: 'select',
              required: true,
              options: [
                { value: 'product', label: 'Product Feedback' },
                { value: 'service', label: 'Service Feedback' },
                { value: 'website', label: 'Website Feedback' },
                { value: 'support', label: 'Customer Support' },
                { value: 'other', label: 'Other' }
              ]
            },
            {
              name: 'priority',
              label: 'Priority Level',
              type: 'select',
              required: true,
              options: [
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' }
              ]
            }
          ]
        },
        {
          title: 'Feedback Details',
          fields: [
            {
              name: 'title',
              label: 'Feedback Title',
              type: 'text',
              required: true,
              clearable: true,
            },
            {
              name: 'description',
              label: 'Detailed Description',
              type: 'textarea',
              required: true,
              rows: 6,
            },
            {
              name: 'attachment',
              label: 'Supporting Files (Optional)',
              type: 'picture',
              required: false,
              pictureConfig: {
                placeholder: 'Upload Supporting Files',
                maxFileSize: 10485760,
                acceptedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
              },
            }
          ]
        }
      ]
    }
  ];

  /**
   * Get all available templates
   */
  getAllTemplates(): TemplateDefinition[] {
    return [...this.templates];
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): TemplateDefinition | null {
    return this.templates.find(t => t.id === templateId) || null;
  }

  /**
   * Convert template definition to FormConfiguration
   */
  templateToFormConfiguration(templateId: string): FormConfiguration | null {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    return {
      id: '',
      name: template.name,
      formType: template.formType,
      version: '1.0',
      isDefault: false,
      isActive: true,
      sections: template.sections,
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: template.description
      }
    };
  }

  /**
   * Create a new custom configuration
   */
  createCustomConfiguration(): FormConfiguration {
    return {
      id: '',
      name: 'New Configuration',
      formType: 'custom',
      version: '1.0',
      isDefault: false,
      isActive: true,
      sections: [],
      metadata: {
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: ''
      }
    };
  }

  /**
   * Add a new template definition
   */
  addTemplate(template: TemplateDefinition): void {
    this.templates.push(template);
  }

  /**
   * Remove a template definition
   */
  removeTemplate(templateId: string): boolean {
    const index = this.templates.findIndex(t => t.id === templateId);
    if (index !== -1) {
      this.templates.splice(index, 1);
      return true;
    }
    return false;
  }
}
