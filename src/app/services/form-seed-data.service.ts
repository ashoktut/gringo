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
      this.createSampleAdminConfiguration(),
      // Company-specific configurations
      ...this.createCompanySpecificConfigurations()
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

  /**
   * Create company-specific sample configurations for multi-tenant testing
   */
  private createCompanySpecificConfigurations(): FormConfiguration[] {
    return [
      // ABC Construction Company - Custom RFQ
      {
        id: 'rfq-abc-construction-2025',
        name: 'ABC Construction - Custom RFQ',
        formType: 'rfq',
        version: '1.0',
        companyId: 'ABC Construction',
        isDefault: false,
        isActive: true,
        sections: [
          {
            title: 'ABC Construction - Project Details',
            description: 'Custom RFQ form for ABC Construction projects',
            expanded: true,
            fields: [
              { name: 'projectCode', label: 'ABC Project Code', type: 'text', required: true, placeholder: 'Enter ABC project code' },
              { name: 'clientName', label: 'Client Name', type: 'text', required: true },
              { name: 'projectType', label: 'Project Type', type: 'select', required: true, options: [
                { value: 'residential', label: 'Residential' },
                { value: 'commercial', label: 'Commercial - ABC Special' },
                { value: 'industrial', label: 'Industrial - ABC Premium' }
              ]},
              { name: 'timeline', label: 'Expected Timeline', type: 'text', required: true },
              { name: 'specialRequirements', label: 'ABC Special Requirements', type: 'textarea', placeholder: 'Any special ABC Construction requirements' }
            ]
          }
        ],
        metadata: {
          createdBy: 'ABC Admin',
          createdAt: new Date(),
          updatedAt: new Date(),
          description: 'Custom RFQ form tailored for ABC Construction workflows',
          allowedRoles: ['rep', 'admin'],
          category: 'reps',
          tags: ['rfq', 'abc-construction', 'custom']
        }
      },

      // XYZ Builders - Custom RFQ
      {
        id: 'rfq-xyz-builders-2025',
        name: 'XYZ Builders - Premium RFQ',
        formType: 'rfq',
        version: '1.0',
        companyId: 'XYZ Builders',
        isDefault: false,
        isActive: true,
        sections: [
          {
            title: 'XYZ Builders - Premium Project Request',
            description: 'Premium RFQ form for XYZ Builders high-end projects',
            expanded: true,
            fields: [
              { name: 'xyzReferenceId', label: 'XYZ Reference ID', type: 'text', required: true, placeholder: 'XYZ-####' },
              { name: 'premiumLevel', label: 'Premium Level', type: 'select', required: true, options: [
                { value: 'gold', label: 'Gold Premium' },
                { value: 'platinum', label: 'Platinum Premium' },
                { value: 'diamond', label: 'Diamond Premium' }
              ]},
              { name: 'architectName', label: 'Architect Name', type: 'text', required: true },
              { name: 'budgetRange', label: 'Budget Range', type: 'select', required: true, options: [
                { value: '100k-250k', label: '$100k - $250k' },
                { value: '250k-500k', label: '$250k - $500k' },
                { value: '500k+', label: '$500k+' }
              ]},
              { name: 'designNotes', label: 'Design Notes', type: 'textarea', placeholder: 'Detailed design requirements and notes' }
            ]
          }
        ],
        metadata: {
          createdBy: 'XYZ Admin',
          createdAt: new Date(),
          updatedAt: new Date(),
          description: 'Premium RFQ form for XYZ Builders luxury projects',
          allowedRoles: ['rep', 'admin'],
          category: 'reps',
          tags: ['rfq', 'xyz-builders', 'premium', 'luxury']
        }
      },

      // DEF Corp - Inspection Form
      {
        id: 'inspection-def-corp-2025',
        name: 'DEF Corp - Safety Inspection',
        formType: 'inspection',
        version: '1.0',
        companyId: 'DEF Corp',
        isDefault: false,
        isActive: true,
        sections: [
          {
            title: 'DEF Corp Safety Inspection',
            description: 'Comprehensive safety inspection for DEF Corp standards',
            expanded: true,
            fields: [
              { name: 'defSiteId', label: 'DEF Site ID', type: 'text', required: true },
              { name: 'safetyOfficer', label: 'Safety Officer', type: 'text', required: true },
              { name: 'inspectionLevel', label: 'Inspection Level', type: 'select', required: true, options: [
                { value: 'level1', label: 'Level 1 - Basic' },
                { value: 'level2', label: 'Level 2 - Comprehensive' },
                { value: 'level3', label: 'Level 3 - Full Audit' }
              ]},
              { name: 'hazardAssessment', label: 'Hazard Assessment', type: 'textarea', required: true },
              { name: 'complianceStatus', label: 'Compliance Status', type: 'radio', required: true, options: [
                { value: 'compliant', label: 'Fully Compliant' },
                { value: 'minor-issues', label: 'Minor Issues' },
                { value: 'major-issues', label: 'Major Issues' },
                { value: 'non-compliant', label: 'Non-Compliant' }
              ]}
            ]
          }
        ],
        metadata: {
          createdBy: 'DEF Safety Admin',
          createdAt: new Date(),
          updatedAt: new Date(),
          description: 'DEF Corp safety inspection form with compliance tracking',
          allowedRoles: ['rep', 'admin'],
          category: 'reps',
          tags: ['inspection', 'def-corp', 'safety', 'compliance']
        }
      }
    ];
  }
}
