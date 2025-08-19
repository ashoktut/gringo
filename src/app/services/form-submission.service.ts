import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { FormSection } from '../sharedComponents/reusable-form/reusable-form.component';

export interface FormSubmission {
  submissionId: string;
  formType: string;
  formTitle: string;
  formData: any;
  formStructure: FormSection[];
  status: 'draft' | 'submitted' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  isRepeatedSubmission?: boolean;
  originalSubmissionId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FormSubmissionService {
  private submissions: FormSubmission[] = [];
  private submissionsSubject = new BehaviorSubject<FormSubmission[]>([]);

  constructor() {
    // Load from localStorage on service initialization
    this.loadSubmissionsFromStorage();
  }

  // Create new submission
  createSubmission(
    formType: string,
    formTitle: string,
    formData: any,
    formStructure: FormSection[]
  ): Observable<FormSubmission> {
    const submission: FormSubmission = {
      submissionId: this.generateId(),
      formType,
      formTitle,
      formData,
      formStructure,
      status: 'submitted',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.submissions.push(submission);
    this.saveSubmissionsToStorage();
    this.submissionsSubject.next([...this.submissions]);

    return of(submission);
  }

  // Get all submissions
  getAllSubmissions(): Observable<FormSubmission[]> {
    return this.submissionsSubject.asObservable();
  }

  // Get single submission
  getSubmission(submissionId: string): Observable<FormSubmission | undefined> {
    const submission = this.submissions.find(s => s.submissionId === submissionId);
    return of(submission);
  }

  // Delete submission
  deleteSubmission(submissionId: string): Observable<boolean> {
    const index = this.submissions.findIndex(s => s.submissionId === submissionId);
    if (index > -1) {
      this.submissions.splice(index, 1);
      this.saveSubmissionsToStorage();
      this.submissionsSubject.next([...this.submissions]);
      return of(true);
    }
    return of(false);
  }

  // Private helper methods
  private generateId(): string {
    return 'RFQ-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private saveSubmissionsToStorage(): void {
    localStorage.setItem('gringo_submissions', JSON.stringify(this.submissions));
  }

  private loadSubmissionsFromStorage(): void {
    const stored = localStorage.getItem('gringo_submissions');
    if (stored) {
      this.submissions = JSON.parse(stored).map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt)
      }));
      this.submissionsSubject.next([...this.submissions]);
    }
  }
}
