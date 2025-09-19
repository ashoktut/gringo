import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { FormConfiguration } from './form-config.service';

/**
 * Service responsible for providing sample/seed data for development and testing
 * Follows separation of concerns - keeps sample data separate from production logic
 */
@Injectable({
  providedIn: 'root'
})
export class FormSeedDataService {

  /**
   * Get sample form configurations for development/testing
   */
  getSampleConfigurations(): FormConfiguration[] {
    return [
      this.createSampleRqrConfiguration(),
      this.createSampleInspectionConfiguration(),
      this.createSampleContactConfiguration(),
      this.createSampleAdminConfiguration()
    ];
  }

  /**
   * Create sample RQR configuration
   */
  private createSampleRqrConfiguration(): FormConfiguration {
    return {
      id: 'rqr-default-2025',
      name: 'RQR - Request for Re-Quote',
      formType: 'rqr',
      version: '1.0',
      isDefault: true,
      isActive: true,
      sections: [
        {
          title: 'Re-Quote Information',
          description: 'Request an updated quote for existing project',
          expanded: true,
          fields: [
            { name: 'originalQuoteId', label: 'Original Quote ID', type: 'text', required: true, placeholder: 'Enter original quote reference' },
            { name: 'reason', label: 'Reason for Re-Quote', type: 'textarea', required: true, placeholder: 'Explain why you need a new quote' },
            { name: 'changes', label: 'Project Changes', type: 'textarea', placeholder: 'Describe any changes to the original scope' }
          ]
        }
      ],
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Standard re-quote request form',
        allowedRoles: ['rep', 'admin'],
        category: 'reps',
        tags: ['re-quote', 'standard']
      }
    };
  }

  /**
   * Create sample inspection configuration
   */
  private createSampleInspectionConfiguration(): FormConfiguration {
    return {
      id: 'inspection-default-2025',
      name: 'Property Inspection Report',
      formType: 'inspection',
      version: '1.0',
      isDefault: true,
      isActive: true,
      sections: [
        {
          title: 'Inspection Details',
          description: 'Property inspection information',
          expanded: true,
          fields: [
            { name: 'propertyAddress', label: 'Property Address', type: 'text', required: true },
            { name: 'inspectionDate', label: 'Inspection Date', type: 'date', required: true },
            { name: 'inspectorName', label: 'Inspector Name', type: 'text', required: true },
            { name: 'findings', label: 'Inspection Findings', type: 'textarea', required: true }
          ]
        }
      ],
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Property inspection report form',
        allowedRoles: ['rep', 'admin'],
        category: 'reps',
        tags: ['inspection', 'property']
      }
    };
  }

  /**
   * Create sample contact configuration
   */
  private createSampleContactConfiguration(): FormConfiguration {
    return {
      id: 'contact-default-2025',
      name: 'Contact Form',
      formType: 'contact',
      version: '1.0',
      isDefault: true,
      isActive: true,
      sections: [
        {
          title: 'Contact Information',
          description: 'Get in touch with us',
          expanded: true,
          fields: [
            { name: 'name', label: 'Full Name', type: 'text', required: true },
            { name: 'email', label: 'Email Address', type: 'email', required: true },
            { name: 'phone', label: 'Phone Number', type: 'tel' },
            { name: 'subject', label: 'Subject', type: 'text', required: true },
            { name: 'message', label: 'Message', type: 'textarea', required: true }
          ]
        }
      ],
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'General contact form for inquiries',
        allowedRoles: ['public', 'client', 'rep', 'admin'],
        category: 'public',
        tags: ['contact', 'inquiry']
      }
    };
  }

  /**
   * Create sample admin configuration
   */
  private createSampleAdminConfiguration(): FormConfiguration {
    return {
      id: 'user-management-2025',
      name: 'User Management Form',
      formType: 'user-management',
      version: '1.0',
      isDefault: true,
      isActive: true,
      sections: [
        {
          title: 'User Details',
          description: 'Manage user accounts and permissions',
          expanded: true,
          fields: [
            { name: 'username', label: 'Username', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'role', label: 'User Role', type: 'select', required: true, options: [
              { value: 'admin', label: 'Administrator' },
              { value: 'rep', label: 'Representative' },
              { value: 'client', label: 'Client' }
            ]},
            { name: 'permissions', label: 'Permissions', type: 'checkbox', options: [
              { value: 'create_forms', label: 'Create Forms' },
              { value: 'edit_forms', label: 'Edit Forms' },
              { value: 'view_submissions', label: 'View Submissions' }
            ]}
          ]
        }
      ],
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Administrative form for user management',
        allowedRoles: ['admin'],
        category: 'admin',
        tags: ['admin', 'user-management']
      }
    };
  }
}
