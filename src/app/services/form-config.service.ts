import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { FormSection } from '../sharedComponents/reusable-form/reusable-form.component';
import { Validators, ValidatorFn } from '@angular/forms';
import { IndexedDbService } from './indexed-db.service';
import { FormSeedDataService } from './form-seed-data.service';

export interface FormConfiguration {
  id: string;
  name: string;
  formType: string; // Made more flexible to support any form type
  version: string;
  companyId?: string;
  isDefault: boolean;
  isActive: boolean;
  sections: FormSection[];
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    description?: string;
    industry?: string;
    allowedRoles?: string[]; // New: Roles that can access this form
    category?: 'reps' | 'clients' | 'admin' | 'public'; // New: Form category
    tags?: string[]; // New: Tags for better organization
  };
}

@Injectable({
  providedIn: 'root'
})
export class FormConfigService {
  private readonly indexedDbService = inject(IndexedDbService);
  private readonly seedDataService = inject(FormSeedDataService);
  private formConfigs: FormConfiguration[] = [];
  private formConfigsSubject = new BehaviorSubject<FormConfiguration[]>([]);

  constructor() {
    this.loadFormConfigurations();
    this.loadDefaultConfigurations();
    this.loadSampleDataForDevelopment();
  }

  /**
   * Load default form configurations including RFQ
   */
  private loadDefaultConfigurations() {
    const rfqConfig = this.createRfqFormConfiguration();
    this.formConfigs.push(rfqConfig);
    this.formConfigsSubject.next([...this.formConfigs]);
  }

  /**
   * Load sample data for development/testing
   * In production, this should be removed or controlled by environment flag
   */
  private loadSampleDataForDevelopment() {
    // Only load sample data in development
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const sampleConfigs = this.seedDataService.getSampleConfigurations();
      this.formConfigs.push(...sampleConfigs);
      this.formConfigsSubject.next([...this.formConfigs]);
    }
  }

  /**
   * Create the default RFQ form configuration
   */
  private createRfqFormConfiguration(): FormConfiguration {
    return {
      id: 'rfq-default-2025',
      name: 'RFQ - Request for Quote (Roofing)',
      formType: 'rfq',
      version: '2.0',
      isDefault: true,
      isActive: true,
      sections: [
        {
          title: 'Quote Timeline',
          description: '',
          expanded: true,
          fields: [
            {
              name: 'timelineGuideLabel',
              label: '',
              type: 'label',
              text: 'ℹ️ Please allow adequate time for quote preparation. Rush requests may incur additional fees.',
              labelConfig: {
                style: 'info',
                alignment: 'left',
              },
            },
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
          description: '',
          fields: [
            {
              name: 'repInfoLabel',
              label: '',
              type: 'label',
              text: 'Please select the representative handling this RFQ and specify email recipients for notifications.',
              labelConfig: {
                style: 'info',
                alignment: 'left',
              },
            },
            {
              name: 'repName',
              label: 'Rep Name',
              type: 'select',
              required: true,
              clearable: true,
              options: [
                { value: 'Bryan Van Staden', label: 'Bryan Van Staden' },
                { value: 'Jeff Nain', label: 'Jeff Nain' },
                { value: 'Roux Mahlerbe', label: 'Roux Mahlerbe' },
                { value: 'Ruan Schroder', label: 'Ruan Schroder' },
                { value: 'Other', label: 'Other' },
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
                { value: 'andri@lcproofing.co.za', label: 'Andri Pretorius' },
                { value: 'bryan@lcproofing.co.za', label: 'Bryan Van Staden' },
                { value: 'jeff@lcproofing.co.za', label: 'Jeff Nain' },
                { value: 'roux@lcproofing.co.za', label: 'Roux Mahlerbe' },
                { value: 'ruan@lcproofing.co.za', label: 'Ruan Schroder' },
                { value: 'lyndsay@lcproofing.co.za', label: 'Lyndsay Cotton' },
                { value: 'stacy@lcproofing.co.za', label: 'Stacy Burgess' },
              ],
            },
          ],
        },
        {
          title: 'Roof Timeline',
          description: '',
          fields: [
            {
              name: 'roofTimelineExplainLabel',
              label: '',
              type: 'label',
              text: 'Select your preferred timeline for roof construction. This helps us prioritize production scheduling.',
              labelConfig: {
                style: 'default',
                alignment: 'left',
              },
            },
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
                { value: 'above 6 months', label: 'More than 6 months' },
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
          fields: [
            {
              name: 'projectNoticeLabel',
              label: '',
              type: 'label',
              text: '⚠️ Important: Ensure all project details are accurate as they will be used for quotes and scheduling.',
              labelConfig: {
                style: 'warning',
                alignment: 'left',
              },
            },
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
                { value: 'Private', label: 'Private Client' },
                { value: 'Company', label: 'Company' },
              ],
            },
            {
              name: 'companyName',
              label: 'Company Name',
              type: 'text',
              required: true,
              clearable: true,
              placeholder: 'Enter company name',
              conditional: {
                dependsOn: 'clientType',
                showWhen: 'Company',
              },
            },
            {
              name: 'clientName',
              label: 'Client Full Name',
              type: 'text',
              required: true,
              clearable: true,
            },
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
                { value: 'Residential', label: 'Residential' },
                { value: 'Commercial', label: 'Commercial' },
                { value: 'Addition less than 80m²', label: 'Addition less than 80m²' },
                { value: 'Addition more than 80m²', label: 'Addition more than 80m²' },
                { value: 'Direct Match', label: 'Direct Match' },
                { value: 'Public Building', label: 'Public Building' },
                { value: 'Other', label: 'Other Building Type' },
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
          title: 'Truss Details',
          fields: [
            {
              name: 'trussSpecsLabel',
              label: '',
              type: 'label',
              text: '🏗️ Truss Specifications',
              labelConfig: {
                style: 'subtitle',
                alignment: 'left',
                bold: true,
              },
            },
            {
              name: 'trussNoticeLabel',
              label: '',
              type: 'label',
              text: 'Provide accurate measurements and load requirements for proper truss design calculations.',
              labelConfig: {
                style: 'caption',
                alignment: 'left',
              },
            },
            {
              name: 'structureType',
              label: 'Structure Type',
              type: 'select',
              multiple: true,
              required: true,
              clearable: true,
              options: [
                { value: 'Tiled Roof', label: 'Tiled Roof' },
                { value: 'Sheeted Roof', label: 'Sheeted Roof' },
                { value: 'Slated Roof', label: 'Slated Roof' },
              ],
            },
            {
              name: 'maxTrussSpacing',
              label: 'Max Truss Spacing',
              type: 'text',
              required: true,
              clearable: true,
            },
            {
              name: 'mainPitch',
              label: 'Main Pitch',
              type: 'number',
              required: true,
              clearable: true,
              placeholder: 'Decimal values accepted also',
              validators: [Validators.min(1), Validators.max(100000)],
            },
            {
              name: 'pitch2',
              label: 'Pitch 2',
              type: 'number',
              required: false,
              clearable: true,
              placeholder: 'Decimal values accepted also',
              validators: [Validators.min(0), Validators.max(100000)],
            },
            {
              name: 'serviceType',
              label: 'Roofing Service Required',
              type: 'select',
              multiple: true,
              required: true,
              clearable: true,
              options: [
                { value: 'Supply Truss', label: 'Supply Truss' },
                { value: 'Supply Cover', label: 'Supply Cover' },
                { value: 'Erect Truss', label: 'Erect Truss' },
                { value: 'Erect Cover', label: 'Erect Cover' },
              ],
            },
            {
              name: 'drawings',
              label: 'Drawings',
              type: 'number',
              required: true,
              clearable: true,
              placeholder: 'Enter number of drawings',
            },
            {
              name: 'sitePhoto',
              label: 'Site Photo',
              type: 'picture',
              required: false,
              pictureConfig: {
                placeholder: 'Add Site Photo',
                maxFileSize: 10485760,
                acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
              },
            },
            {
              name: 'architecturalDrawing',
              label: 'Architectural Drawing / Plan',
              type: 'picture',
              required: false,
              pictureConfig: {
                placeholder: 'Upload Drawing/Plan',
                maxFileSize: 15728640,
                acceptedTypes: [
                  'image/jpeg',
                  'image/png',
                  'image/webp',
                  'image/tiff',
                ],
              },
            },
            {
              name: 'referencePhoto',
              label: 'Reference Photo (Optional)',
              type: 'picture',
              required: false,
              pictureConfig: {
                placeholder: 'Add Reference Photo',
                maxFileSize: 5242880,
                acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
              },
            },
            {
              name: 'ceilingType',
              label: 'Ceiling Type',
              type: 'select',
              required: true,
              options: [
                {
                  value: 'Standard Fixed Ceiling',
                  label: 'Standard Fixed Ceiling',
                },
                { value: 'Suspended Ceiling', label: 'Suspended Ceiling' },
              ],
            },
            {
              name: 'wallCorbel',
              label: 'Wall Corbel',
              type: 'text',
              required: false,
              clearable: true,
            },
            {
              name: 'eavesOH',
              label: 'Eaves Overhang',
              type: 'text',
              required: true,
              clearable: true,
              placeholder: 'horizontal dimension in mm from wall',
            },
            {
              name: 'gableOH',
              label: 'Gable Overhang',
              type: 'text',
              required: true,
              clearable: true,
              placeholder: 'state the overhang from wall',
            },
            {
              name: 'apexOH',
              label: 'Apex Overhang',
              type: 'text',
              required: false,
              clearable: true,
              placeholder: 'state the overhang from wall',
            },
            {
              name: 'ulaySpec',
              label: 'Ulay Spec',
              type: 'select',
              multiple: true,
              required: true,
              options: [
                { value: 'Undertile', label: 'Undertile membrane' },
                {
                  value: 'Single sided sisalation',
                  label: 'Single sided sisalation',
                },
                {
                  value: 'Double sided sisalation',
                  label: 'Double sided sisalation',
                },
                { value: 'Bubblefoil or Similar', label: 'Bubblefoil or similar' },
                { value: 'Thick Insulation', label: 'Thick insulation' },
                { value: 'Isoboard', label: 'Isoboard or similar' },
                { value: 'Alu Bubble', label: 'ALU bubble' },
                { value: 'Durafoil', label: 'Durafoil' },
                { value: 'Other Ins', label: 'Other Ins' },
              ],
              placeholder: 'Select Items',
              clearable: true,
            },
            {
              name: 'insSpec',
              label: 'Ins Spec',
              type: 'text',
              required: true,
              clearable: true,
              placeholder: 'Other and alternative specifications',
              conditional: {
                dependsOn: 'ulaySpec',
                showWhen: 'Other Ins',
              },
            },
            {
              name: 'solarLoad',
              label: 'Solar Loading Required ?',
              type: 'select',
              multiple: false,
              required: true,
              clearable: true,
              options: [
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ],
            },
            {
              name: 'solarArea',
              label: 'Which area requires solar loading?',
              type: 'text',
              required: true,
              clearable: true,
              placeholder: 'eg. Above bedroom',
              conditional: {
                dependsOn: 'solarLoad',
                showWhen: 'Yes',
              },
            },
            {
              name: 'geyserLoad',
              label: 'Geyser Loading Required ?',
              type: 'select',
              multiple: false,
              required: true,
              clearable: true,
              options: [
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ],
            },
            {
              name: 'geyserArea',
              label: 'Which area requires geyser loading?',
              type: 'text',
              required: true,
              clearable: true,
              placeholder: 'eg. Bedroom, mention accurate area from plans',
              conditional: {
                dependsOn: 'geyserLoad',
                showWhen: 'Yes',
              },
            },
            {
              name: 'exposedTruss',
              label: 'Exposed trusses Required in design ?',
              type: 'select',
              multiple: false,
              required: true,
              clearable: true,
              options: [
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ],
            },
            {
              name: 'trussType',
              label: 'Exposed Truss Design',
              type: 'select',
              required: true,
              clearable: true,
              options: [
                { value: 'Partially Exposed', label: 'Partially Exposed' },
                { value: 'Completely Exposed', label: 'Completely Exposed' },
              ],
              conditional: {
                dependsOn: 'exposedTruss',
                showWhen: 'Yes',
              },
            },
            {
              name: 'trussType2',
              label: 'Exposed Truss Design Type Required',
              type: 'text',
              required: true,
              clearable: true,
              placeholder: 'eg. Bedroom, mention accurate area from plans',
              conditional: {
                dependsOn: 'exposedTruss',
                showWhen: 'Yes',
              },
            },
            {
              name: 'trussArea',
              label: 'Areas That Require Exposed trusses',
              type: 'text',
              required: true,
              clearable: true,
              placeholder: 'eg. Bedroom, mention accurate area from plans',
              conditional: {
                dependsOn: 'exposedTruss',
                showWhen: 'Yes',
              },
            },
            {
              name: 'trussSundry',
              label: 'Truss Sundry',
              type: 'select',
              multiple: true,
              required: true,
              clearable: true,
              placeholder: 'Tip: ⌚ For faster quote turnaround, mark on drawings',
              options: [
                { value: 'Verge Tiles', label: 'Verge Tiles' },
                { value: 'Mono Ridges', label: 'Mono Ridges' },
                { value: 'Barge Boards', label: 'Barge Boards' },
                { value: 'Facias', label: 'Facias' },
                { value: 'Shutterboard', label: 'Shutterboard' },
                { value: 'Gable Trims', label: 'Gable Trims' },
                { value: 'Apex Trims', label: 'Apex Trims' },
                { value: 'None eg: hip roof', label: 'None, eg: hip roof' },
              ],
            },
            {
              name: 'trussNotes',
              label: 'Truss Notes',
              type: 'textarea',
              rows: 4,
              placeholder: 'Tip: ⌚ Avoid Re-Quotes, Consult & confirm with client, provide short accurate info to designer for quicker turnaround time',
              validators: [Validators.maxLength(500)],
            },
            {
              name: 'optionalPG1',
              label: 'Optional P&G1',
              type: 'select',
              multiple: false,
              required: true,
              clearable: true,
              options: [
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ],
            },
            {
              name: 'pg1Desc',
              label: 'P&G1 Description',
              type: 'text',
              required: true,
              clearable: true,
              placeholder: 'List all the items required in a short description',
              conditional: {
                dependsOn: 'optionalPG1',
                showWhen: 'Yes',
              },
            },
            {
              name: 'otherBuild',
              label: 'Other Building Type',
              type: 'text',
              required: true,
              clearable: true,
              placeholder: 'Other Building Type',
              conditional: {
                dependsOn: 'buildingType',
                showWhen: 'Other',
              },
            },
            {
              name: 'projectLocation',
              label: 'Project Location (Click to Select)',
              type: 'map',
              required: true,
              mapConfig: {
                defaultCenter: [28.0473, -26.2041],
                zoom: 10,
                height: '450px',
                enableGeocoding: true,
                enableLocationPicker: true,
                style: 'liberty',
              },
            },
          ],
        },
        {
          title: 'Cover Type',
          expanded: false,
          fields: [
            {
              name: 'coverGuidanceLabel',
              label: '',
              type: 'label',
              text: '⚠️ Important: Cover selection affects structural requirements and final pricing. Choose carefully based on your project needs.',
              labelConfig: {
                style: 'warning',
                alignment: 'left',
              },
            },
            {
              name: 'coverReq',
              label: 'Quote Cover Needed?',
              type: 'select',
              multiple: false,
              required: true,
              clearable: true,
              options: [
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ],
            },
            {
              name: 'coverType',
              label: 'Select Cover Type',
              type: 'select',
              required: true,
              clearable: true,
              options: [
                { value: 'Tiles', label: 'Tiles' },
                { value: 'Sheeting', label: 'Sheeting' },
                { value: 'Slate, but not by LCP', label: 'Slate, but not by LCP' },
              ],
              conditional: {
                dependsOn: 'coverReq',
                showWhen: 'Yes',
              },
            },
            {
              name: 'tileProfile',
              label: 'Tile Profile',
              type: 'text',
              required: true,
              clearable: true,
              conditional: {
                dependsOn: 'coverType',
                showWhen: 'Tiles',
              },
            },
            {
              name: 'tileColour',
              label: 'Tile Colour',
              type: 'text',
              required: false,
              clearable: true,
              conditional: {
                dependsOn: 'coverType',
                showWhen: 'Tiles',
              },
            },
            {
              name: 'tileNailing',
              label: 'Tile Nailing',
              type: 'select',
              required: false,
              clearable: true,
              conditional: {
                dependsOn: 'coverType',
                showWhen: 'Tiles',
              },
              options: [
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ],
            },
            {
              name: 'sheetProfile',
              label: 'Sheet Profile',
              type: 'text',
              required: false,
              clearable: true,
              conditional: {
                dependsOn: 'coverType',
                showWhen: 'Sheeting',
              },
            },
            {
              name: 'sheetColour',
              label: 'Sheet Colour',
              type: 'text',
              required: false,
              clearable: true,
              conditional: {
                dependsOn: 'coverType',
                showWhen: 'Sheeting',
              },
            },
            {
              name: 'coverNotes',
              label: 'Cover Notes',
              type: 'textarea',
              rows: 4,
              placeholder: 'Tip: 😁 Happy client = Retaining client',
              validators: [Validators.maxLength(500)],
            },
          ],
        },
        {
          title: 'Drawings & Images',
          expanded: false,
          fields: [
            {
              name: 'additional_details_info',
              label: 'Provide additional information relevant to your RFQ. Optional fields that help us better understand your requirements.',
              type: 'label',
              labelConfig: {
                style: 'caption',
              },
            },
            {
              name: 'drawingsSectionTitle',
              label: '',
              type: 'label',
              text: 'Upload Drawings & Site Photos',
              labelConfig: {
                style: 'title',
                alignment: 'center',
                bold: true,
              },
            },
            {
              name: 'drawingsCaption',
              label: '',
              type: 'label',
              text: 'Add dates for drawings and upload photos/scans. Picture fields will appear when drawing dates are selected.',
              labelConfig: {
                style: 'caption',
                alignment: 'center',
              },
            },
            {
              name: 'drawings1',
              label: 'Drawing 1 date',
              type: 'date',
              multiple: false,
              required: false,
              clearable: true,
            },
            {
              name: 'dwg1No',
              label: 'Drawing 1 Name',
              type: 'text',
              placeholder: 'Tip: Enter drawing name',
              validators: [Validators.maxLength(500)],
            },
            {
              name: 'drawings2',
              label: 'Drawing 2 Date',
              type: 'date',
              required: false,
              clearable: true,
              conditional: {
                dependsOn: 'drawings1',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'dwg2No',
              label: 'Drawing 2 Name',
              type: 'text',
              required: false,
              clearable: true,
              placeholder: 'Tip: Enter drawing name',
              validators: [Validators.maxLength(500)],
              conditional: {
                dependsOn: 'drawings1',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'drawings3',
              label: 'Drawing 3 Date',
              type: 'date',
              required: false,
              clearable: true,
              conditional: {
                dependsOn: 'drawings2',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'dwg3No',
              label: 'Drawing 3 Name',
              type: 'text',
              required: false,
              clearable: true,
              placeholder: 'Tip: Enter drawing name',
              validators: [Validators.maxLength(500)],
              conditional: {
                dependsOn: 'drawings2',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'drawings4',
              label: 'Drawing 4 Date',
              type: 'date',
              required: false,
              clearable: true,
              conditional: {
                dependsOn: 'drawings3',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'dwg4No',
              label: 'Drawing 4 Name',
              type: 'text',
              required: false,
              clearable: true,
              placeholder: 'Tip: Enter drawing name',
              validators: [Validators.maxLength(500)],
              conditional: {
                dependsOn: 'drawings3',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'drawings5',
              label: 'Drawing 5 Date',
              type: 'date',
              required: false,
              clearable: true,
              conditional: {
                dependsOn: 'drawings4',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'dwg5No',
              label: 'Drawing 5 Name',
              type: 'text',
              required: false,
              clearable: true,
              placeholder: 'Tip: Enter drawing name',
              validators: [Validators.maxLength(500)],
              conditional: {
                dependsOn: 'drawings4',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'drawingPhoto1',
              label: 'Drawing 1 Photo/Scan',
              type: 'picture',
              required: false,
              placeholder: 'Upload drawing photo or scan',
              pictureConfig: {
                maxFileSize: 10 * 1024 * 1024,
                acceptedTypes: [
                  'image/jpeg',
                  'image/png',
                  'image/webp',
                  'application/pdf',
                ],
              },
              conditional: {
                dependsOn: 'drawings1',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'drawingPhoto2',
              label: 'Drawing 2 Photo/Scan',
              type: 'picture',
              required: false,
              placeholder: 'Upload drawing photo or scan',
              pictureConfig: {
                maxFileSize: 10 * 1024 * 1024,
                acceptedTypes: [
                  'image/jpeg',
                  'image/png',
                  'image/webp',
                  'application/pdf',
                ],
              },
              conditional: {
                dependsOn: 'drawings2',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'drawingPhoto3',
              label: 'Drawing 3 Photo/Scan',
              type: 'picture',
              required: false,
              placeholder: 'Upload drawing photo or scan',
              pictureConfig: {
                maxFileSize: 10 * 1024 * 1024,
                acceptedTypes: [
                  'image/jpeg',
                  'image/png',
                  'image/webp',
                  'application/pdf',
                ],
              },
              conditional: {
                dependsOn: 'drawings3',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'drawingPhoto4',
              label: 'Drawing 4 Photo/Scan',
              type: 'picture',
              required: false,
              placeholder: 'Upload drawing photo or scan',
              pictureConfig: {
                maxFileSize: 10 * 1024 * 1024,
                acceptedTypes: [
                  'image/jpeg',
                  'image/png',
                  'image/webp',
                  'application/pdf',
                ],
              },
              conditional: {
                dependsOn: 'drawings4',
                showWhen: 'hasValue',
              },
            },
            {
              name: 'drawingPhoto5',
              label: 'Drawing 5 Photo/Scan',
              type: 'picture',
              required: false,
              placeholder: 'Upload drawing photo or scan',
              pictureConfig: {
                maxFileSize: 10 * 1024 * 1024,
                acceptedTypes: [
                  'image/jpeg',
                  'image/png',
                  'image/webp',
                  'application/pdf',
                ],
              },
              conditional: {
                dependsOn: 'drawings5',
                showWhen: 'hasValue',
              },
            },
          ],
        },
        {
          title: 'Extra Information',
          expanded: false,
          fields: [
            {
              name: 'gateAccess',
              label: 'Gate Access Payment Needed?',
              type: 'select',
              multiple: false,
              required: true,
              clearable: true,
              options: [
                { value: 'Yes', label: 'Yes' },
                { value: 'No', label: 'No' },
              ],
            },
            {
              name: 'generalNotes',
              label: 'General Notes',
              type: 'textarea',
              rows: 4,
              placeholder: 'Tip: 😁 Happy client = Retaining client',
              validators: [Validators.maxLength(500)],
            },
            {
              name: 'repSign',
              label: 'Rep Signature',
              type: 'signature',
              required: true,
              placeholder: 'Please sign here to confirm your request',
            },
          ],
        },
      ],
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Comprehensive roofing quote request form with conditional fields, file uploads, and digital signature',
        industry: 'Construction/Roofing',
      },
    };
  }

  /**
   * Get the comprehensive RFQ configuration (public access)
   */
  getComprehensiveRfqConfiguration(): FormConfiguration {
    return this.createRfqFormConfiguration();
  }

  /**
   * Get form configuration for a specific form type and company
   */
  getFormConfig(formType: string, companyId?: string): Observable<FormConfiguration | null> {
    return this.formConfigsSubject.pipe(
      map(configs => {
        // Find the most appropriate configuration
        let config = configs.find(c =>
          c.formType === formType &&
          c.companyId === companyId &&
          c.isActive
        );

        // Fallback to default configuration for the form type
        if (!config) {
          config = configs.find(c =>
            c.formType === formType &&
            c.isDefault &&
            c.isActive
          );
        }

        // Return default RFQ configuration if nothing found
        if (!config && formType === 'rfq') {
          return {
            id: 'default-runtime-rfq',
            name: 'Default RFQ Configuration',
            formType: 'rfq',
            version: '1.0.0',
            isDefault: true,
            isActive: true,
            sections: this.getDefaultRfqConfiguration(),
            metadata: {
              createdBy: 'system',
              createdAt: new Date(),
              updatedAt: new Date(),
              description: 'Runtime default RFQ configuration'
            }
          } as FormConfiguration;
        }

        return config || null;
      })
    );
  }

  /**
   * Get form sections only (backward compatibility)
   */
  getFormSections(formType: string, companyId?: string): Observable<FormSection[]> {
    return this.getFormConfig(formType, companyId).pipe(
      map(config => config?.sections || [])
    );
  }

  /**
   * Get all form configurations
   */
  getAllFormConfigs(): Observable<FormConfiguration[]> {
    return this.formConfigsSubject.asObservable();
  }

  /**
   * Get form configurations filtered by user role and company
   */
  getFormConfigsByRole(role: string, companyId?: string): Observable<FormConfiguration[]> {
    return this.formConfigsSubject.pipe(
      map(configs => this.filterConfigsByRole(configs, role, companyId))
    );
  }

  /**
   * Get form configurations for a specific category (reps, clients, admin, public)
   */
  getFormConfigsByCategory(category: 'reps' | 'clients' | 'admin' | 'public', companyId?: string): Observable<FormConfiguration[]> {
    return this.formConfigsSubject.pipe(
      map(configs => configs.filter(config => {
        // Only show active configurations
        if (!config.isActive) return false;

        // Check category match
        const configCategory = config.metadata?.category || 'public';
        if (configCategory !== category && configCategory !== 'public') return false;

        // Check company match if specified
        if (companyId && config.companyId && config.companyId !== companyId) return false;

        return true;
      }))
    );
  }

  /**
   * Get available form types for a specific role and company
   */
  getAvailableFormTypes(role: string, companyId?: string): Observable<string[]> {
    return this.getFormConfigsByRole(role, companyId).pipe(
      map(configs => {
        const formTypes = new Set(configs.map(config => config.formType));
        return Array.from(formTypes).sort();
      })
    );
  }

  /**
   * Filter configurations by role and company
   */
  private filterConfigsByRole(configs: FormConfiguration[], role: string, companyId?: string): FormConfiguration[] {
    return configs.filter(config => {
      // Only show active configurations
      if (!config.isActive) return false;

      // Check role permissions
      if (!this.isConfigAllowedForRole(config, role)) return false;

      // Check company permissions
      if (companyId && config.companyId && config.companyId !== companyId) {
        // Only allow company-specific forms for that company
        return false;
      }

      return true;
    });
  }

  /**
   * Check if configuration is allowed for a specific role
   */
  private isConfigAllowedForRole(config: FormConfiguration, role: string): boolean {
    const allowedRoles = config.metadata?.allowedRoles || ['public'];

    // Admin can access everything
    if (role === 'admin') return true;

    // Check if role is explicitly allowed
    if (allowedRoles.includes(role)) return true;

    // Check if public access is allowed
    if (allowedRoles.includes('public')) return true;

    return false;
  }

  /**
   * Save a new form configuration
   */
  saveFormConfig(config: FormConfiguration): Observable<FormConfiguration> {
    config.metadata.updatedAt = new Date();

    const index = this.formConfigs.findIndex(c => c.id === config.id);
    if (index > -1) {
      this.formConfigs[index] = config;
    } else {
      this.formConfigs.push(config);
    }

    return this.saveToStorage().pipe(
      map(() => {
        this.formConfigsSubject.next([...this.formConfigs]);
        return config;
      })
    );
  }

  /**
   * Create a new form configuration based on existing one
   */
  createFormConfig(
    name: string,
    formType: string,
    basedOnConfigId?: string,
    companyId?: string
  ): Observable<FormConfiguration> {
    console.log('Creating form config:', { name, formType, basedOnConfigId, companyId });

    const baseConfig = basedOnConfigId ?
      this.formConfigs.find(c => c.id === basedOnConfigId) :
      null;

    console.log('Base config found:', baseConfig);

    const newConfig: FormConfiguration = {
      id: this.generateConfigId(),
      name,
      formType,
      version: '1.0.0',
      companyId,
      isDefault: !companyId, // Company-specific configs are not default
      isActive: true,
      sections: baseConfig ? [...baseConfig.sections] : this.getDefaultRfqConfiguration(),
      metadata: {
        createdBy: 'system', // TODO: Get from auth service
        createdAt: new Date(),
        updatedAt: new Date(),
        description: `${name} form configuration`
      }
    };

    console.log('New config created:', newConfig);

    return this.saveFormConfig(newConfig).pipe(
      catchError(error => {
        console.error('Error saving config:', error);
        throw error;
      })
    );
  }

  /**
   * Get available companies for form configurations
   */
  getAvailableCompanies(): Observable<string[]> {
    return this.formConfigsSubject.pipe(
      map(configs => {
        const companies = new Set<string>();
        configs.forEach(config => {
          if (config.companyId) {
            companies.add(config.companyId);
          }
        });
        return Array.from(companies).sort();
      })
    );
  }

  /**
   * Get configurations for a specific company
   */
  getCompanyConfigurations(companyId: string): Observable<FormConfiguration[]> {
    return this.formConfigsSubject.pipe(
      map(configs => configs.filter(c => c.companyId === companyId))
    );
  }

  /**
   * Set configuration as default for its form type
   */
  setAsDefault(configId: string): Observable<FormConfiguration> {
    const config = this.formConfigs.find(c => c.id === configId);
    if (!config) {
      throw new Error('Configuration not found');
    }

    // Remove default status from other configs of the same type
    this.formConfigs.forEach(c => {
      if (c.formType === config.formType && c.id !== configId) {
        c.isDefault = false;
      }
    });

    // Set this config as default
    config.isDefault = true;
    config.metadata.updatedAt = new Date();

    return this.saveToStorage().pipe(
      map(() => {
        this.formConfigsSubject.next([...this.formConfigs]);
        return config;
      })
    );
  }

  /**
   * Toggle configuration active status
   */
  toggleActiveStatus(configId: string): Observable<FormConfiguration> {
    const config = this.formConfigs.find(c => c.id === configId);
    if (!config) {
      throw new Error('Configuration not found');
    }

    config.isActive = !config.isActive;
    config.metadata.updatedAt = new Date();

    return this.saveToStorage().pipe(
      map(() => {
        this.formConfigsSubject.next([...this.formConfigs]);
        return config;
      })
    );
  }
  deleteFormConfig(configId: string): Observable<boolean> {
    const index = this.formConfigs.findIndex(c => c.id === configId);
    if (index > -1) {
      this.formConfigs.splice(index, 1);
      return this.saveToStorage().pipe(
        map(() => {
          this.formConfigsSubject.next([...this.formConfigs]);
          return true;
        })
      );
    }
    return of(false);
  }

  /**
   * Initialize default configurations
   */
  initializeDefaultConfigs(): Observable<void> {
    const defaultRfqConfig: FormConfiguration = {
      id: 'default-rfq',
      name: 'Default RFQ Form',
      formType: 'rfq',
      version: '1.0.0',
      isDefault: true,
      isActive: true,
      sections: this.getDefaultRfqConfiguration(),
      metadata: {
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: 'Default Request for Quote form configuration',
        industry: 'construction'
      }
    };

    return this.saveFormConfig(defaultRfqConfig).pipe(
      map(() => void 0)
    );
  }

  /**
   * Create sample RQR configuration for testing
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
   * Create sample inspection configuration for testing
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
   * Create sample contact configuration for testing
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
   * Create sample admin configuration for testing
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
   * Get default RFQ configuration (your existing form structure)
   */
  public getDefaultRfqConfiguration(): FormSection[] {
    return [
      {
        title: 'Quote Timeline',
        description: '',
        expanded: true,
        fields: [
          {
            name: 'timelineGuideLabel',
            label: '',
            type: 'label',
            text: 'ℹ️ Please allow adequate time for quote preparation. Rush requests may incur additional fees.',
            labelConfig: {
              style: 'info',
              alignment: 'left',
            },
          },
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
        description: '',
        fields: [
          {
            name: 'repInfoLabel',
            label: '',
            type: 'label',
            text: 'Please select the representative handling this RFQ and specify email recipients for notifications.',
            labelConfig: {
              style: 'info',
              alignment: 'left',
            },
          },
          {
            name: 'repName',
            label: 'Rep Name',
            type: 'select',
            required: true,
            clearable: true,
            options: [
              { value: 'Bryan Van Staden', label: 'Bryan Van Staden' },
              { value: 'Jeff Nain', label: 'Jeff Nain' },
              { value: 'Roux Mahlerbe', label: 'Roux Mahlerbe' },
              { value: 'Ruan Schroder', label: 'Ruan Schroder' },
              { value: 'Other', label: 'Other' },
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
              { value: 'andri@lcproofing.co.za', label: 'Andri Pretorius' },
              { value: 'bryan@lcproofing.co.za', label: 'Bryan Van Staden' },
              { value: 'jeff@lcproofing.co.za', label: 'Jeff Nain' },
              { value: 'roux@lcproofing.co.za', label: 'Roux Mahlerbe' },
              { value: 'ruan@lcproofing.co.za', label: 'Ruan Schroder' },
              { value: 'lyndsay@lcproofing.co.za', label: 'Lyndsay Cotton' },
              { value: 'stacy@lcproofing.co.za', label: 'Stacy Burgess' },
            ],
          },
        ],
      },
      {
        title: 'Project Details',
        fields: [
          {
            name: 'projectNoticeLabel',
            label: '',
            type: 'label',
            text: '⚠️ Important: Ensure all project details are accurate as they will be used for quotes and scheduling.',
            labelConfig: {
              style: 'warning',
              alignment: 'left',
            },
          },
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
              { value: 'Private', label: 'Private Client' },
              { value: 'Company', label: 'Company' },
            ],
          },
          {
            name: 'companyName',
            label: 'Company Name',
            type: 'text',
            required: true,
            clearable: true,
            placeholder: 'Enter company name',
            conditional: {
              dependsOn: 'clientType',
              showWhen: 'Company',
            },
          },
          {
            name: 'clientName',
            label: 'Client Full Name',
            type: 'text',
            required: true,
            clearable: true,
          },
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
              { value: 'Residential', label: 'Residential' },
              { value: 'Commercial', label: 'Commercial' },
              { value: 'Addition less than 80m²', label: 'Addition less than 80m²' },
              { value: 'Addition more than 80m²', label: 'Addition more than 80m²' },
              { value: 'Direct Match', label: 'Direct Match' },
              { value: 'Public Building', label: 'Public Building' },
              { value: 'Other', label: 'Other Building Type' },
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
        title: 'Truss Details',
        fields: [
          {
            name: 'trussSpecsLabel',
            label: '',
            type: 'label',
            text: '🏗️ Truss Specifications',
            labelConfig: {
              style: 'subtitle',
              alignment: 'left',
              bold: true,
            },
          },
          {
            name: 'structureType',
            label: 'Structure Type',
            type: 'select',
            multiple: true,
            required: true,
            clearable: true,
            options: [
              { value: 'Tiled Roof', label: 'Tiled Roof' },
              { value: 'Sheeted Roof', label: 'Sheeted Roof' },
              { value: 'Slated Roof', label: 'Slated Roof' },
            ],
          },
          {
            name: 'maxTrussSpacing',
            label: 'Max Truss Spacing',
            type: 'text',
            required: true,
            clearable: true,
          },
          {
            name: 'mainPitch',
            label: 'Main Pitch',
            type: 'number',
            required: true,
            clearable: true,
            placeholder: 'Decimal values accepted also',
            validators: [Validators.min(1), Validators.max(100000)],
          },
          {
            name: 'serviceType',
            label: 'Roofing Service Required',
            type: 'select',
            multiple: true,
            required: true,
            clearable: true,
            options: [
              { value: 'Supply Truss', label: 'Supply Truss' },
              { value: 'Supply Cover', label: 'Supply Cover' },
              { value: 'Erect Truss', label: 'Erect Truss' },
              { value: 'Erect Cover', label: 'Erect Cover' },
            ],
          },
          {
            name: 'repSign',
            label: 'Rep Signature',
            type: 'signature',
            required: true,
            placeholder: 'Please sign here to confirm your request',
          },
        ],
      },
    ];
  }

  /**
   * Serialize validators for storage
   */
   private serializeValidators(validators?: ValidatorFn[]): string[] {
    if (!validators) return [];

    return validators
      .filter(validator => validator != null) // Filter out null/undefined validators
      .map(validator => {
        // Convert Angular validators to string identifiers
        if (validator === Validators.required) return 'required';
        if (validator === Validators.email) return 'email';

        // Handle min/max validators with parameters
        const validatorStr = validator.toString();
        if (validatorStr.includes('minlength')) {
          const match = validatorStr.match(/minlength.*?(\d+)/);
          return match ? `minlength:${match[1]}` : 'minlength';
        }
        if (validatorStr.includes('maxlength')) {
          const match = validatorStr.match(/maxlength.*?(\d+)/);
          return match ? `maxlength:${match[1]}` : 'maxlength';
        }
        if (validatorStr.includes('min')) {
          const match = validatorStr.match(/min.*?(\d+)/);
          return match ? `min:${match[1]}` : 'min';
        }
        if (validatorStr.includes('max')) {
          const match = validatorStr.match(/max.*?(\d+)/);
          return match ? `max:${match[1]}` : 'max';
        }

        return 'unknown';
      });
  }  /**
   * Deserialize validators from storage
   */
  private deserializeValidators(validatorStrings?: string[]): ValidatorFn[] {
    if (!validatorStrings) return [];

    return validatorStrings.map(validatorStr => {
      if (validatorStr === 'required') return Validators.required;
      if (validatorStr === 'email') return Validators.email;

      // Handle parameterized validators
      if (validatorStr.startsWith('minlength:')) {
        const length = parseInt(validatorStr.split(':')[1]);
        return Validators.minLength(length);
      }
      if (validatorStr.startsWith('maxlength:')) {
        const length = parseInt(validatorStr.split(':')[1]);
        return Validators.maxLength(length);
      }
      if (validatorStr.startsWith('min:')) {
        const min = parseInt(validatorStr.split(':')[1]);
        return Validators.min(min);
      }
      if (validatorStr.startsWith('max:')) {
        const max = parseInt(validatorStr.split(':')[1]);
        return Validators.max(max);
      }

      return Validators.nullValidator;
    }).filter(v => v !== Validators.nullValidator);
  }

  /**
   * Prepare configuration for storage by serializing validators
   */
  private prepareForStorage(config: FormConfiguration): any {
    const storageConfig = JSON.parse(JSON.stringify(config));

    // Serialize validators in all fields
    storageConfig.sections.forEach((section: any) => {
      section.fields.forEach((field: any) => {
        if (field.validators) {
          field.validators = this.serializeValidators(field.validators);
        }
      });
    });

    return storageConfig;
  }

  /**
   * Restore configuration from storage by deserializing validators
   */
  private restoreFromStorage(storageConfig: any): FormConfiguration {
    const config = { ...storageConfig };

    // Deserialize validators in all fields
    config.sections.forEach((section: any) => {
      section.fields.forEach((field: any) => {
        if (field.validators) {
          field.validators = this.deserializeValidators(field.validators);
        }
      });
    });

    return config as FormConfiguration;
  }

  private loadFormConfigurations(): void {
    this.indexedDbService.getAll(this.indexedDbService.STORES.FORM_CONFIGS).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.formConfigs = data.map(item => this.restoreFromStorage(item.data));
          this.formConfigsSubject.next([...this.formConfigs]);
          console.log('✅ Form configurations loaded:', this.formConfigs.length);
        } else {
          console.log('ℹ️ No form configurations found, initializing defaults');
          this.initializeDefaultConfigs().subscribe();
        }
      },
      error: (error) => {
        console.error('❌ Failed to load form configurations:', error);
        this.formConfigsSubject.next([]);
      }
    });
  }

  private saveToStorage(): Observable<void> {
    const itemsToSave = this.formConfigs.map(config => ({
      id: config.id,
      data: this.prepareForStorage(config)
    }));

    return this.indexedDbService.saveAll(this.indexedDbService.STORES.FORM_CONFIGS, itemsToSave).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('❌ Failed to save form configurations:', error);
        throw error;
      })
    );
  }

  /**
   * Bulk delete configurations
   */
  bulkDeleteConfigurations(configIds: string[]): Observable<boolean> {
    const initialCount = this.formConfigs.length;

    // Remove configurations with matching IDs
    this.formConfigs = this.formConfigs.filter(config => !configIds.includes(config.id!));

    if (this.formConfigs.length === initialCount) {
      return of(false); // No configurations were deleted
    }

    return this.saveToStorage().pipe(
      map(() => {
        this.formConfigsSubject.next([...this.formConfigs]);
        return true;
      }),
      catchError(error => {
        console.error('❌ Failed to bulk delete configurations:', error);
        return of(false);
      })
    );
  }

  /**
   * Get the default RFQ form configuration specifically
   */
  getRfqConfiguration(): Observable<FormConfiguration> {
    return this.getFormConfig('rfq').pipe(
      map(config => {
        if (config) {
          return config;
        }
        // Return the RFQ configuration we created
        return this.createRfqFormConfiguration();
      })
    );
  }

  /**
   * Get RFQ sections only (for backward compatibility with existing RFQ component)
   */
  getRfqSections(): Observable<FormSection[]> {
    return this.getRfqConfiguration().pipe(
      map(config => config.sections)
    );
  }

  private generateConfigId(): string {
    return 'config-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
