import { Component } from '@angular/core';
import {
  FormField,
  FormSection, // ADD THIS IMPORT
  ReusableFormComponent,
} from '../../../sharedComponents/reusable-form/reusable-form.component';
import { CommonModule } from '@angular/common';
import { Validators } from '@angular/forms';

@Component({
  selector: 'app-rfq',
  imports: [CommonModule, ReusableFormComponent],
  templateUrl: './rfq.component.html',
  styleUrl: './rfq.component.css',
})
export class RfqComponent {
  // To make a field not rquired, set required: false
  // To make a field required, set required: true
  // To remove validation, remove the validators array or set it to an empty array

  rfqSections: FormSection[] = [
    {
      title: 'Quote Timeline',
      description: 'Set a realistic timeline ',
      expanded: true,
      fields: [
        {
          name: 'dateSubmitted',
          label: 'Date Submitted',
          type: 'date',
          required: true,
          clearable: true,
          validators: [Validators.required],
        },
        {
          name: 'dateDue',
          label: 'Date Due',
          type: 'date',
          required: true,
          clearable: true,
          validators: [Validators.required],
        },
      ],
    },
    {
      title: 'Rep Details',
      description: 'Rep details & send email to',
      fields: [
        {
          name: 'repName',
          label: 'Rep Name',
          type: 'select',
          required: true,
          clearable: true,
          options: [
            { value: 'bryan', label: 'Bryan Van Staden' },
            { value: 'jeff', label: 'Jeff Nain' },
            { value: 'roux', label: 'Roux Mahlerbe' },
            { value: 'ruan', label: 'Ruan Schroder' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'ccMail',
          label: 'CC Mail To',
          type: 'select',
          multiple: true,
          required: true,
          clearable: true,
          options: [
            { value: 'andri@roofing.com', label: 'Andri Pretorius' },
            { value: 'bryan@roofing.com', label: 'Bryan Van Staden' },
            { value: 'jeff@roofing.com', label: 'Jeff Nain' },
            { value: 'roux@roofing.com', label: 'Roux Mahlerbe' },
            { value: 'ruan@roofing.com', label: 'Ruan Schroder' },
            { value: 'stacy@roofing.com', label: 'Stacy Burgess' },
          ],
        },
      ],
    },
    {
      title: 'Roof Timeline',
      description: 'ABK and P&G info',
      fields: [
        {
          name: 'roofTimeline',
          label: 'Roof Timeline',
          type: 'select',
          required: true,
          clearable: true,
          options: [
            { value: '1 week', label: '1 week' },
            { value: '2 weeks', label: '2 weeks' },
            { value: '1 month', label: '1 month' },
            { value: '2 months', label: '2 months' },
            { value: '3 months', label: '3 months' },
            { value: '6 months', label: '6 months' },
            { value: 'above 6 months', label: '> 6 months' },
          ],
        },
        {
          name: 'abk',
          label: 'ABK',
          type: 'select',
          clearable: true,
          options: [
            { value: '0', label: '0' },
            { value: '1000', label: 'AA' },
            { value: '2000', label: 'BB' },
            { value: '3000', label: 'CC' },
            { value: '4000', label: 'DD' },
            { value: '5000', label: 'EE' },
          ],
        },
        {
          name: 'pg2',
          label: 'P&G 2',
          type: 'select',
          required: true,
          clearable: true,
          options: [
            { value: '0', label: '0' },
            { value: '1000', label: 'AA' },
            { value: '2000', label: 'BB' },
            { value: '3000', label: 'CC' },
            { value: '4000', label: 'DD' },
            { value: '5000', label: 'EE' },
            { value: '6000', label: 'FF' },
            { value: '7000', label: 'GG' },
            { value: '8000', label: 'HH' },
            { value: '9000', label: 'II' },
            { value: '10000', label: 'JJ' },
            { value: '11000', label: 'KK' },
            { value: '12000', label: 'LL' },
            { value: '13000', label: 'MM' },
            { value: '14000', label: 'NN' },
            { value: '15000', label: 'OO' },
          ],
        },
      ],
    },
    {
      title: 'Project Details',
      description: 'Project details & Client info',
      fields: [
        {
          name: 'standNum',
          label: 'Stand / Site Address',
          type: 'text',
          required: true,
          clearable: true,
        },
        {
          name: 'clientType',
          label: 'Client Type',
          type: 'select',
          multiple: false,
          required: true,
          clearable: true,
          options: [
            { value: 'private', label: 'Private Client' },
            { value: 'company', label: 'Company' },
          ],
        },
        // ADD CONDITIONAL FIELD FOR COMPANY
        {
          name: 'companyName',
          label: 'Company Name',
          type: 'text',
          required: true,
          clearable: true,
          placeholder: 'Enter company name',
          conditional: {
            dependsOn: 'clientType',
            showWhen: 'company',
          },
        },
        {
          name: 'clientName',
          label: 'Client Full Name',
          type: 'text',
          required: true,
          clearable: true,
        },

        //////////
        {
          name: 'clientPhone',
          label: 'Client Phone Number',
          type: 'tel',
          required: true,
          placeholder: '+27721549865',
          clearable: true,
        },
        {
          name: 'clientEmail',
          label: 'Client Email Address',
          type: 'email',
          required: true,
          placeholder: 'Enter client email address',
          clearable: true,
        },
        {
          name: 'buildingType',
          label: 'Building Type',
          type: 'select',
          required: false,
          clearable: true,
          options: [
            { value: '0', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'addLess', label: 'Addition less than 80m²' },
            { value: 'addMore', label: 'Addition more than 80m²' },
            { value: 'directMatch', label: 'Direct Match' },
            { value: 'public', label: 'Public Building' },
            { value: 'other', label: 'Other Building Type' },
          ],
        },
        {
          name: 'municipality',
          label: 'Municipality',
          type: 'text',
          required: false,
          clearable: true,
        },
      ],
    },
    {
      title: 'Additional Details', // NEW SECTION
      description: 'Personal and account information',
      fields: [
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          required: true,
          placeholder: 'Enter a strong password',
        },
        {
          name: 'age',
          label: 'Age',
          type: 'number',
          required: true,
          placeholder: 'Enter your age',
          validators: [Validators.min(18), Validators.max(100)],
        },
        {
          name: 'phone',
          label: 'Phone Number',
          type: 'tel',
          required: true,
          placeholder: '+1234567890',
        },
        {
          name: 'dateOfBirth',
          label: 'Date of Birth',
          type: 'date',
          required: true,
        },
        {
          name: 'country',
          label: 'Country',
          type: 'select',
          required: true,
          options: [
            { value: 'za', label: 'South Africa' },
            { value: 'us', label: 'United States' },
            { value: 'uk', label: 'United Kingdom' },
            { value: 'ca', label: 'Canada' },
            { value: 'au', label: 'Australia' },
          ],
        },
        {
          name: 'skills',
          label: 'Skills',
          type: 'select',
          multiple: true,
          required: true,
          options: [
            { value: 'angular', label: 'Angular' },
            { value: 'react', label: 'React' },
            { value: 'vue', label: 'Vue.js' },
            { value: 'nodejs', label: 'Node.js' },
            { value: 'python', label: 'Python' },
            { value: 'java', label: 'Java' },
          ],
        },
        {
          name: 'bio',
          label: 'Biography',
          type: 'textarea',
          rows: 4,
          placeholder: 'Tell us about yourself...',
          validators: [Validators.maxLength(500)],
        },
        {
          name: 'gender',
          label: 'Gender',
          type: 'radio',
          required: true,
          options: [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
            { value: 'prefer-not-to-say', label: 'Prefer not to say' },
          ],
        },
        {
          name: 'newsletter',
          label: 'Subscribe to newsletter',
          type: 'checkbox',
        },
        {
          name: 'acceptTerms',
          label: 'I accept the terms and conditions',
          type: 'checkbox',
          required: true,
        },
      ],
    },
  ];

  // onFormSubmit($event: any) {
  // throw new Error('Method not implemented.');
  // }

  onFormSubmit(event: any) {
    console.log('Form submitted successfully!', event);

    // Here you would typically send the data to your backend
    // Example:
    // this.userService.createUser(formData).subscribe(
    //   response => console.log('User created:', response),
    //   error => console.error('Error creating user:', error)
    // );

    // Show success message
    alert('Form submitted successfully! Check console for form data.');
  }

  onFormValueChange(event: any) {
    console.log('Form value changed:', event);

    // You can perform real-time validation or other actions here
    // For example, enable/disable submit button, show live preview, etc.
  }
}
