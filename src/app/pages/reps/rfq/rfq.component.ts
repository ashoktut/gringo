import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DynamicFormComponent, DynamicFormConfig } from '../../../sharedComponents/dynamic-form/dynamic-form.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-rfq',
  standalone: true,
  imports: [
    CommonModule,
    DynamicFormComponent
  ],
  template: `
    <app-dynamic-form
      [config]="formConfig"
      [companyId]="companyId"
      [initialData]="initialData"
      [enableRepeatMode]="isRepeatMode"
      (formSubmitted)="onFormSubmitted($event)"
      (formSaved)="onFormSaved($event)">
    </app-dynamic-form>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      padding: 20px;
    }
  `]
})
export class RfqComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  formConfig: DynamicFormConfig = { formType: 'rfq' };
  companyId?: string;
  repeatSubmissionId?: string;
  initialData: any = {};
  isRepeatMode = false;

  ngOnInit() {
    // Handle query parameters for company selection and repeat functionality
    this.route.queryParams.subscribe(params => {
      this.companyId = params['companyId'] || undefined;
      this.repeatSubmissionId = params['repeat'] ? params['submissionId'] : undefined;
      this.isRepeatMode = !!params['repeat'];

      // Set default date if not repeating
      if (!this.repeatSubmissionId) {
        this.initialData = {
          dateSubmitted: new Date().toISOString().split('T')[0]
        };
      }
    });
  }

  onFormSubmitted(submission: any): void {
    this.snackBar.open('RFQ submitted successfully!', 'Close', {
      duration: 3000
    });
  }

  onFormSaved(data: any): void {
    this.snackBar.open('RFQ saved as draft', 'Close', {
      duration: 2000
    });
  }
}
