# Company-Specific Configuration Analysis

## Overview
This document identifies all components, services, and features in the Gringo project that need to be adapted for multi-tenant, company-specific functionality.

## 🏢 Components Requiring Company-Specific Handling

### 1. Form System Components

#### `ReusableFormComponent`
**Current State**: Generic form component
**Required Changes**:
- Filter available field types based on company features
- Apply company-specific field validation rules
- Use company branding for form styling
- Respect company form limits (max forms per subscription)
- Apply company-specific default values

```typescript
// Company-specific form configuration
interface CompanyFormConfig {
  availableFieldTypes: string[];
  customFieldTypes: CustomFieldType[];
  validationRules: { [fieldName: string]: any };
  defaultSettings: any;
  maxFormsAllowed: number;
  customStyling: any;
}
```

#### `PictureUploadComponent`
**Required Changes**:
- Apply company storage limits
- Use company-specific upload directories
- Respect company file type restrictions
- Apply company image processing rules

#### `DigitalSignatureComponent`
**Required Changes**:
- Enable/disable based on company features
- Apply company signature requirements
- Use company-specific signature validation

### 2. Template System

#### `TemplateProcessingService`
**Required Changes**:
- Filter templates by company access
- Apply company-specific template variables
- Use company branding in templates
- Respect template usage limits

#### `PdfTemplateService`
**Required Changes**:
- Company-specific PDF styling
- Company logo and branding integration
- Company-specific template storage

### 3. Email Services

#### `EmailService`
**Required Changes**:
- Use company SMTP settings
- Apply company email templates
- Company-specific sender addresses
- Respect email sending limits

### 4. Navigation and Layout

#### `AppComponent`
**Required Changes**:
- Show/hide features based on company subscription
- Apply company branding (colors, logo)
- Company-specific navigation items
- Display company name and info

### 5. User Management

#### `UserService`
**Required Changes**:
- Filter users by company
- Apply company user limits
- Company-specific user roles
- Company registration policies

## 🎨 Branding and Theming Components

### Theme Service
**New Component Needed**:
```typescript
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  applyCompanyTheme(company: Company): void;
  resetToDefaultTheme(): void;
  getCurrentTheme(): CompanyBranding;
}
```

### Components Needing Branding:
- Login/Register forms
- Navigation header
- Form components
- Email templates
- PDF outputs

## 📊 Data and Storage Components

### Form Submission Handling
**Required Changes**:
- Route submissions to company-specific storage
- Apply company retention policies
- Company-specific data export formats

### Offline Sync Service
**Required Changes**:
- Company-specific sync endpoints
- Company data isolation
- Company-specific conflict resolution

## 🔧 Configuration Service

### New CompanyConfigService Needed:
```typescript
@Injectable({
  providedIn: 'root'
})
export class CompanyConfigService {
  // Get company-specific configuration
  getCompanyConfig(companyId: string): Observable<CompanyFormConfig>;
  
  // Get feature availability
  isFeatureEnabled(feature: string): boolean;
  
  // Get company limits
  getCompanyLimits(): CompanyLimits;
  
  // Apply company settings
  applyCompanySettings(settings: CompanySettings): void;
}
```

## 📋 Implementation Priority

### High Priority (Core Functionality)
1. **Form System**: Update ReusableFormComponent for company features
2. **Authentication**: Complete login/register with company selection
3. **User Management**: Company-specific user handling
4. **Navigation**: Show/hide features based on subscription

### Medium Priority (Enhanced Features)
1. **Branding**: Company-specific theming
2. **Templates**: Company-specific template handling
3. **Email**: Company SMTP configuration
4. **Storage**: Company data isolation

### Low Priority (Advanced Features)
1. **Analytics**: Company-specific reporting
2. **Integrations**: Company-specific API connections
3. **Customization**: Advanced company-specific features

## 🛠 Implementation Strategy

### Phase 1: Core Multi-Tenancy
- Implement CompanyConfigService
- Update AuthService integration
- Modify ReusableFormComponent for company features
- Update navigation based on permissions

### Phase 2: Company Branding
- Implement ThemeService
- Apply company branding to login/forms
- Company-specific email templates
- Company logo integration

### Phase 3: Advanced Features
- Company-specific analytics
- Advanced permission controls
- Custom company integrations
- Company-specific workflows

## 📝 Code Examples

### Updating ReusableFormComponent:
```typescript
export class ReusableFormComponent implements OnInit {
  private companyConfig = inject(CompanyConfigService);
  private authService = inject(AuthService);

  ngOnInit() {
    // Get current company
    const company = this.authService.currentCompany();
    
    // Apply company-specific configuration
    if (company) {
      this.applyCompanyConfig(company.id);
    }
  }

  private applyCompanyConfig(companyId: string) {
    this.companyConfig.getCompanyConfig(companyId).subscribe(config => {
      // Filter available field types
      this.availableFieldTypes = config.availableFieldTypes;
      
      // Apply custom validation rules
      this.validationRules = config.validationRules;
      
      // Apply company styling
      this.applyStyling(config.customStyling);
    });
  }
}
```

### Company Feature Guard:
```typescript
// Usage in routes
{
  path: 'advanced-forms',
  component: AdvancedFormsComponent,
  canActivate: [authGuard, featureGuard('formBuilder')]
}
```

## 🚀 Next Steps

1. Start with Phase 1 implementation
2. Create CompanyConfigService
3. Update existing components systematically
4. Test multi-tenant functionality
5. Implement branding system
6. Add advanced company-specific features

This analysis provides a roadmap for converting the current single-tenant application into a robust multi-tenant system with company-specific configurations.
