import { Component, OnInit } from '@angular/core';
import {
  FormField,
  FormSection, // ADD THIS IMPORT
  ReusableFormComponent,
} from '../../../sharedComponents/reusable-form/reusable-form.component';

import { Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormSubmissionService } from '../../../services/form-submission.service';
import { MatIconModule } from '@angular/material/icon';

import { MatButtonModule } from '@angular/material/button';
import { DocxProcessingService } from '../../../services/docx-processing.service';
import { PdfTemplateService } from '../../../services/pdf-template.service';
import { TemplateManagementService } from '../../../services/template-management.service';

@Component({
  selector: 'app-rfq',
  imports: [
    ReusableFormComponent,
    MatIconModule,
    MatButtonModule
],
  templateUrl: './rfq.component.html',
  styleUrl: './rfq.component.css',
})
export class RfqComponent implements OnInit {
  // Repeat functionality properties
  isRepeatMode = false;
  originalSubmissionId: string | null = null;
  repeatedSubmissionData: any = null;

  // Add a property to hold initial form data
  initialFormData: any = {};

  constructor(
  private route: ActivatedRoute,
  private router: Router,
  private formSubmissionService: FormSubmissionService,
  private docxProcessingService: DocxProcessingService,
  private templateManagementService: TemplateManagementService,
  private pdfTemplateService: PdfTemplateService
  ) {}

  ngOnInit() {
    // Check if this is a repeat RFQ from query parameters
    this.route.queryParams.subscribe((params) => {
      if (params['repeat'] && params['submissionId']) {
        this.isRepeatMode = true;
        this.originalSubmissionId = params['submissionId'];
        this.loadSubmissionForRepeat(params['submissionId']);
      }
    });
    // Set default dateSubmitted if not in repeat mode
    if (!this.isRepeatMode) {
      const today = new Date();
      this.initialFormData.dateSubmitted = today.toISOString().split('T')[0];
    }
  }
  // To make a field not rquired, set required: false
  // To make a field required, set required: true
  // To remove validation, remove the validators array or set it to an empty array

  rfqSections: FormSection[] = [
    {
      // Quote timeline section
      title: 'Quote Timeline',
      description: '',
      expanded: true,
      fields: [
        // Timeline guidance label
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

        // date submitted field
        {
          name: 'dateSubmitted',
          label: 'Date Submitted',
          type: 'date',
          required: true,
          clearable: true,
          validators: [Validators.required],
        },
        // Date due field
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
      // Rep details section
      title: 'Rep Details',
      description: '',
      fields: [
        // Information label
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

        // Rep Name field
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

        // CC Mail To field
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

    // Roof timeline section
    {
      title: 'Roof Timeline',
      description: '',
      fields: [
        // Timeline explanation label
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

        // roof timeline field
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

        // abk field
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

        // pg2 field
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

    // project details section
    {
      title: 'Project Details',
      //description: 'Project details & Client info',
      fields: [
        // Important notice label
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

        // stand num field
        {
          name: 'standNum',
          label: 'Stand / Site Address',
          type: 'text',
          required: true,
          clearable: true,
        },

        // client type field
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

        // ADD CONDITIONAL FIELD FOR COMPANY - company name field
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

        // client name field
        {
          name: 'clientName',
          label: 'Client Full Name',
          type: 'text',
          required: true,
          clearable: true,
        },

        // client phone field
        {
          name: 'clientPhone',
          label: 'Client Phone Number',
          type: 'tel',
          required: true,
          placeholder: '+27721549865',
          clearable: true,
        },

        // client email field
        {
          name: 'clientEmail',
          label: 'Client Email Address',
          type: 'email',
          required: true,
          placeholder: 'Enter client email address',
          clearable: true,
        },

        // building type field
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

        // municipality field
        {
          name: 'municipality',
          label: 'Municipality',
          type: 'text',
          required: false,
          clearable: true,
        },
      ],
    },

    // Truss Details Section
    {
      title: 'Truss Details',
      //description: 'Truss specifications & requirements',
      fields: [
        // Truss specifications label
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

        // Technical details notice
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

        // Max truss spacing field
        {
          name: 'maxTrussSpacing',
          label: 'Max Truss Spacing',
          type: 'text',
          required: true,
          clearable: true,
        },

        // Main Pitch field
        {
          name: 'mainPitch',
          label: 'Main Pitch',
          type: 'number',
          required: true,
          clearable: true,
          placeholder: 'Decimal values accepted also',
          validators: [Validators.min(1), Validators.max(100000)],
        },

        // Pitch 2 field
        {
          name: 'pitch2',
          label: 'Pitch 2',
          type: 'number',
          required: false,
          clearable: true,
          placeholder: 'Decimal values accepted also',
          validators: [Validators.min(0), Validators.max(100000)],
        },

        // Roofing Services field
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

        // drawings field
        {
          name: 'drawings',
          label: 'Drawings',
          type: 'number',
          required: true,
          clearable: true,
          placeholder: 'Enter number of drawings',
        },

        // ADD PICTURE FIELDS FOR DOCUMENTATION
        // Site photos
        {
          name: 'sitePhoto',
          label: 'Site Photo',
          type: 'picture',
          required: false,
          pictureConfig: {
            placeholder: 'Add Site Photo',
            maxFileSize: 10485760, // 10MB for high-quality photos
            acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          },
        },

        // Architectural drawings/plans
        {
          name: 'architecturalDrawing',
          label: 'Architectural Drawing / Plan',
          type: 'picture',
          required: false,
          pictureConfig: {
            placeholder: 'Upload Drawing/Plan',
            maxFileSize: 15728640, // 15MB for detailed drawings
            acceptedTypes: [
              'image/jpeg',
              'image/png',
              'image/webp',
              'image/tiff',
            ],
          },
        },

        // Reference photo
        {
          name: 'referencePhoto',
          label: 'Reference Photo (Optional)',
          type: 'picture',
          required: false,
          pictureConfig: {
            placeholder: 'Add Reference Photo',
            maxFileSize: 5242880, // 5MB
            acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          },
        },

        // Ceiling type field
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

        // Wall corbel field
        {
          name: 'wallCorbel',
          label: 'Wall Corbel',
          type: 'text',
          required: false,
          clearable: true,
        },

        // Eaves overhang field
        {
          name: 'eavesOH',
          label: 'Eaves Overhang',
          type: 'text',
          required: true,
          clearable: true,
          placeholder: 'horizontal dimension in mm from wall',
        },

        // Gable overhang field
        {
          name: 'gableOH',
          label: 'Gable Overhang',
          type: 'text',
          required: true,
          clearable: true,
          placeholder: 'state the overhang from wall',
        },

        // Apex overhang field
        {
          name: 'apexOH',
          label: 'Apex Overhang',
          type: 'text',
          required: false,
          clearable: true,
          placeholder: 'state the overhang from wall',
        },

        // Ulay spec field
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

        // ADD CONDITIONAL FIELD FOR YES - where do you need the solar installed on the structure, above bathroom
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

        // Is Solar Needed question field
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

        // ADD CONDITIONAL FIELD FOR YES - where do you need the solar installed on the structure, above bathroom
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

        // Is Geyser Needed question field
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

        // ADD CONDITIONAL FIELD FOR YES - where do you need the geyser installed on the structure
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

        // Is Exposed Trusses Needed question field
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

        // ADD CONDITIONAL FIELD FOR YES - type of exposed truss design required
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

        // ADD CONDITIONAL FIELD FOR YES - type of exposed truss manual
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

        // ADD CONDITIONAL FIELD FOR YES - which areas of the structure needs exposed truss
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

        // Truss Sundry field
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

        // Truss Notes field
        {
          name: 'trussNotes',
          label: 'Truss Notes',
          type: 'textarea',
          rows: 4,
          placeholder:
            'Tip: ⌚ Avoid Re-Quotes, Consult & confirm with client, provide short accurate info to designer for quicker turnaround time',
          validators: [Validators.maxLength(500)],
        },

        // optional p&g1 question field
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

        // ADD CONDITIONAL FIELD FOR YES - where do you need the geyser installed on the structure
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
        //////////

        // building type field
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

        // ADD CONDITIONAL FIELD FOR OTHER building type
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

        // municipality field
        {
          name: 'municipality',
          label: 'Municipality',
          type: 'text',
          required: false,
          clearable: true,
        },

        // Maps field:
        {
          name: 'projectLocation',
          label: 'Project Location (Click to Select)',
          type: 'map',
          required: true,
          mapConfig: {
            defaultCenter: [28.0473, -26.2041], // Johannesburg
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
      // Cover section
      title: 'Cover Type',
      expanded: false,
      fields: [
        // Cover selection guidance
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

        // Is quote cover needed
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

        // ADD CONDITIONAL FIELD FOR YES - type of cover truss design required
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

        // Tile Profile
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

        // Tile Colour
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

        // Tile Nailing
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

        // Sheet Profile
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
          options: [
            { value: 'Corrugated', label: 'Corrugated' },
            { value: 'Concealed Fix', label: 'Concealed Fix' },
            { value: 'IBR', label: 'IBR' },
            { value: 'Craftlock', label: 'Craftlock' },
            { value: 'Widespan', label: 'Widespan' },
            { value: 'Brownbuilt', label: 'Brownbuilt' },
            { value: 'Rheinzink Double Standing', label: 'Rheinzink Double Standing' },
            { value: 'Newlok', label: 'Newlok' },
          ],
        },

        // Sheet Colour
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

        // Cover Notes field
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
      // Drawings section
      title: 'Drawings & Images',
      expanded: false,
      fields: [
        // Section title label
        {
          name: 'additional_details_info',
          label:
            'Provide additional information relevant to your RFQ. Optional fields that help us better understand your requirements.',
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

        // Caption label
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

        // Is quote cover needed
        {
          name: 'drawings1',
          label: 'Drawing 1 date',
          type: 'date',
          multiple: false,
          required: false,
          clearable: true,
        },

        // Dwg 1 text field
        {
          name: 'dwg1No',
          label: 'Drawing 1 Name',
          type: 'text',
          placeholder: 'Tip: Enter drawing name',
          validators: [Validators.maxLength(500)],
        },

        // ADD CONDITIONAL FIELD - shows when drawings1 has a date value
        {
          name: 'drawings2',
          label: 'Drawing 2 Date',
          type: 'date',
          required: false,
          clearable: true,
          conditional: {
            dependsOn: 'drawings1',
            showWhen: 'hasValue', // This will show when drawings1 has any date value
          },
        },

        // Dwg 2 text field
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
            showWhen: 'hasValue', // This will show when drawings1 has any date value
          },
        },

        // ADD CONDITIONAL FIELD - shows when drawings2 has a date value
        {
          name: 'drawings3',
          label: 'Drawing 3 Date',
          type: 'date',
          required: false,
          clearable: true,
          conditional: {
            dependsOn: 'drawings2',
            showWhen: 'hasValue', // This will show when drawings2 has any date value
          },
        },

        // Dwg 3 text field
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
            showWhen: 'hasValue', // This will show when drawings2 has any date value
          },
        },

        // ADD CONDITIONAL FIELD - shows when drawings3 has a date value
        {
          name: 'drawings4',
          label: 'Drawing 4 Date',
          type: 'date',
          required: false,
          clearable: true,
          conditional: {
            dependsOn: 'drawings3',
            showWhen: 'hasValue', // This will show when drawings3 has any date value
          },
        },

        // Dwg 4 text field
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
            showWhen: 'hasValue', // This will show when drawings3 has any date value
          },
        },

        // ADD CONDITIONAL FIELD - shows when drawings4 has a date value
        {
          name: 'drawings5',
          label: 'Drawing 5 Date',
          type: 'date',
          required: false,
          clearable: true,
          conditional: {
            dependsOn: 'drawings4',
            showWhen: 'hasValue', // This will show when drawings4 has any date value
          },
        },

        // Dwg 5 text field
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
            showWhen: 'hasValue', // This will show when drawings4 has any date value
          },
        },

        // Picture Upload Fields
        {
          name: 'drawingPhoto1',
          label: 'Drawing 1 Photo/Scan',
          type: 'picture',
          required: false,
          placeholder: 'Upload drawing photo or scan',
          pictureConfig: {
            maxFileSize: 10 * 1024 * 1024, // 10MB for high-res drawings
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
            maxFileSize: 10 * 1024 * 1024, // 10MB for high-res drawings
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
            maxFileSize: 10 * 1024 * 1024, // 10MB for high-res drawings
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
            maxFileSize: 10 * 1024 * 1024, // 10MB for high-res drawings
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
            maxFileSize: 10 * 1024 * 1024, // 10MB for high-res drawings
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

        // {
        //   name: 'sitePhoto',
        //   label: 'Site Photo',
        //   type: 'picture',
        //   required: false,
        //   placeholder: 'Take or upload site photo',
        //   pictureConfig: {
        //     maxFileSize: 5 * 1024 * 1024, // 5MB for photos
        //     acceptedTypes: ['image/jpeg', 'image/png', 'image/webp']
        //   }
        // },
      ],
    },

    {
      // Extra Information section
      title: 'Extra Information',
      expanded: false,
      fields: [
        // Is gate access payment needed
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

        // General notes
        {
          name: 'generalNotes',
          label: 'General Notes',
          type: 'textarea',
          rows: 4,
          placeholder: 'Tip: 😁 Happy client = Retaining client',
          validators: [Validators.maxLength(500)],
        },

        // Rep Signature Field
        {
          name: 'repSign',
          label: 'Rep Signature',
          type: 'signature',
          required: true,
          placeholder: 'Please sign here to confirm your request',
        },
      ],
    },

    // {
    //   title: 'Additional Details', // NEW SECTION
    //   description: 'Personal and account information',
    //   fields: [
    //     {
    //       name: 'password',
    //       label: 'Password',
    //       type: 'password',
    //       required: true,
    //       placeholder: 'Enter a strong password',
    //     },
    //     {
    //       name: 'age',
    //       label: 'Age',
    //       type: 'number',
    //       required: true,
    //       placeholder: 'Enter your age',
    //       validators: [Validators.min(18), Validators.max(100)],
    //     },
    //     {
    //       name: 'phone',
    //       label: 'Phone Number',
    //       type: 'tel',
    //       required: true,
    //       placeholder: '+1234567890',
    //     },
    //     {
    //       name: 'dateOfBirth',
    //       label: 'Date of Birth',
    //       type: 'date',
    //       required: true,
    //     },
    //     {
    //       name: 'country',
    //       label: 'Country',
    //       type: 'select',
    //       required: true,
    //       options: [
    //         { value: 'za', label: 'South Africa' },
    //         { value: 'us', label: 'United States' },
    //         { value: 'uk', label: 'United Kingdom' },
    //         { value: 'ca', label: 'Canada' },
    //         { value: 'au', label: 'Australia' },
    //       ],
    //     },
    //     {
    //       name: 'skills',
    //       label: 'Skills',
    //       type: 'select',
    //       multiple: true,
    //       required: true,
    //       options: [
    //         { value: 'angular', label: 'Angular' },
    //         { value: 'react', label: 'React' },
    //         { value: 'vue', label: 'Vue.js' },
    //         { value: 'nodejs', label: 'Node.js' },
    //         { value: 'python', label: 'Python' },
    //         { value: 'java', label: 'Java' },
    //       ],
    //     },
    //     {
    //       name: 'bio',
    //       label: 'Biography',
    //       type: 'textarea',
    //       rows: 4,
    //       placeholder: 'Tell us about yourself...',
    //       validators: [Validators.maxLength(500)],
    //     },
    //     {
    //       name: 'gender',
    //       label: 'Gender',
    //       type: 'radio',
    //       required: true,
    //       options: [
    //         { value: 'male', label: 'Male' },
    //         { value: 'female', label: 'Female' },
    //         { value: 'other', label: 'Other' },
    //         { value: 'prefer-not-to-say', label: 'Prefer not to say' },
    //       ],
    //     },
    //     {
    //       name: 'newsletter',
    //       label: 'Subscribe to newsletter',
    //       type: 'checkbox',
    //     },
    //     {
    //       name: 'acceptTerms',
    //       label: 'I accept the terms and conditions',
    //       type: 'checkbox',
    //       required: true,
    //     },

    //     // basic signature field
    //     {
    //       name: 'customerName',
    //       label: 'Customer Name',
    //       type: 'text',
    //       required: true,
    //     },
    //     {
    //       name: 'customerSignature',
    //       label: 'Customer Signature',
    //       type: 'signature',
    //       required: true,
    //       placeholder: 'Please sign here to confirm your request',
    //     },

    //     // Advanced signature with configurations
    //     {
    //       name: 'projectDetails',
    //       label: 'Project Details',
    //       type: 'textarea',
    //       required: true,
    //       rows: 4,
    //     },
    //     {
    //       name: 'contractSignature',
    //       label: 'Contract Agreement Signature',
    //       type: 'signature',
    //       required: true,
    //       placeholder: 'Sign here to legally bind this contract',
    //       signatureConfig: {
    //         canvasWidth: 700,
    //         canvasHeight: 250,
    //         strokeColor: '#1976d2',
    //         strokeWidth: 3,
    //         backgroundColor: '#fafafa',
    //       },
    //     },
    //   ],
    // },
    // // Conditional signature field
    // {
    //   title: 'Agreement Terms',
    //   description: 'Please review and accept the terms',
    //   fields: [
    //     {
    //       name: 'termsAccepted',
    //       label: 'I accept the terms and conditions',
    //       type: 'checkbox',
    //       required: true,
    //     },
    //     {
    //       name: 'legalSignature',
    //       label: 'Legal Authorization Signature',
    //       type: 'signature',
    //       required: true,
    //       placeholder: 'Your signature confirms legal acceptance',
    //       conditional: {
    //         dependsOn: 'termsAccepted',
    //         showWhen: true,
    //       },
    //       signatureConfig: {
    //         canvasWidth: 600,
    //         canvasHeight: 180,
    //         strokeColor: '#d32f2f',
    //         strokeWidth: 2,
    //       },
    //     },
    //   ],
    // },
  ];

  // onFormSubmit($event: any) {
  // throw new Error('Method not implemented.');
  // }

  onFormSubmit(event: any) {
    console.log('Form submitted successfully!', event);

    // Add metadata for repeated submissions
    const submissionData = {
      ...event,
      isRepeatedSubmission: this.isRepeatMode,
      originalSubmissionId: this.originalSubmissionId,
    };

    // Save submission using the service
    this.formSubmissionService
      .createSubmission(
        'RFQ',
        'Request for Quote',
        submissionData,
        this.rfqSections
      )
      .subscribe({
        next: (response) => {
          // Merge metadata into form data for DOCX
          const docxDataRaw = {
            ...submissionData,
            submissionId: response.submissionId,
            createdAt: response.createdAt,
            updatedAt: response.updatedAt,
            status: response.status,
          };
          // Process all fields for PDF output (labels always shown, values empty if not filled)
  const docxData = this.processFieldsForPdf(docxDataRaw, this.rfqSections);

          // Fetch the first available RFQ template and generate PDF
          this.templateManagementService.getTemplatesForForm('rfq').subscribe({
            next: (templates) => {
              if (templates && templates.length > 0) {
                const template = templates[0];
                if (template.type === 'html') {
                  // Get template from template management service first, then generate PDF
                  this.templateManagementService.getTemplate(template.id).subscribe({
                    next: (fullTemplate) => {
                      if (fullTemplate) {
                        console.log('✅ Template found for PDF generation:', fullTemplate.name);
                        // Use the content from the template management service
                        this.generatePdfDirectly(fullTemplate, docxData, template.formType);
                      } else {
                        console.error('❌ Template not found in template management service:', template.id);
                      }
                    },
                    error: (error) => {
                      console.error('❌ Error getting template:', error);
                    }
                  });
                } else {
                  // Use DOCX template PDF generation
                  const recipients = Array.isArray(docxData.ccMail) ? docxData.ccMail : [];
                  const clientEmail = docxData.clientEmail || '';
                  this.docxProcessingService.processRfqSubmission(
                    template,
                    docxData,
                    recipients,
                    clientEmail,
                    {
                      preserveStyles: true,
                      preserveImages: true,
                      preserveTables: true,
                      outputFormat: 'pdf',
                    }
                  ).subscribe({
                    next: (result) => {
                      if (result && result.downloadUrl) {
                        // Trigger download
                        window.open(result.downloadUrl, '_blank');
                      }
                      // Route to submissions page after successful PDF generation
                      this.router.navigate(['/submissions']);
                    },
                    error: (err) => {
                      console.error('Error generating PDF:', err);
                    },
                  });
                }
              } else {
                alert('No RFQ template found. Please upload a template first.');
              }
            },
            error: (err) => {
              console.error('Error fetching templates:', err);
            },
          });

          console.log('RFQ submitted successfully:', response);
          alert(
            `RFQ ${
              this.isRepeatMode ? 'repeated' : 'submitted'
            } successfully! ID: ${response.submissionId}`
          );
        },
        error: (error) => {
          console.error('Error submitting RFQ:', error);
          alert('Error submitting RFQ. Please try again.');
        },
      });
  }

  // Load original submission data for repeating
  private loadSubmissionForRepeat(submissionId: string) {
    this.formSubmissionService.getSubmission(submissionId).subscribe({
      next: (submission) => {
        if (submission) {
          this.repeatedSubmissionData = this.prepareDataForRepeat(
            submission.formData
          );
          console.log(
            'Loaded submission for repeat:',
            this.repeatedSubmissionData
          );
        }
      },
      error: (error) => {
        console.error('Error loading submission for repeat:', error);
      },
    });
  }

  // Prepare the data for repeating (remove submission-specific fields)
  private prepareDataForRepeat(originalData: any): any {
    const dataToRepeat = { ...originalData };

    // Remove fields that shouldn't be duplicated
    delete dataToRepeat.dateSubmitted;
    delete dataToRepeat.submissionId;
    delete dataToRepeat.status;
    delete dataToRepeat.createdAt;
    delete dataToRepeat.updatedAt;
    delete dataToRepeat.isRepeatedSubmission;
    delete dataToRepeat.originalSubmissionId;

    // Reset date due to today + 7 days as default
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    dataToRepeat.dateDue = nextWeek.toISOString().split('T')[0];

    // Set today as submitted date
    const today = new Date();
    dataToRepeat.dateSubmitted = today.toISOString().split('T')[0];

    return dataToRepeat;
  }

  onFormValueChange(event: any) {
    // Drastically reduce logging frequency for better performance
    if (Math.random() < 0.001) {
      // Only log 0.1% of form changes
      console.log('Form value changed:', event);
    }

    // You can perform real-time validation or other actions here
    // For example, enable/disable submit button, show live preview, etc.
  }

  /**
   * Processes all fields for PDF output, ensuring all labels are present and
   * values are empty string if not filled or not shown (conditional/dependent fields).
   */
  private processFieldsForPdf(formData: any, rfqSections: FormSection[]): any {
    const processed: any = {};

    // Always include these metadata fields if present in formData
    ['createdAt', 'submissionId', 'repName'].forEach(key => {
      if (formData[key] !== undefined) {
        processed[key] = formData[key];
      } else {
        processed[key] = '';
      }
    });

    rfqSections.forEach(section => {
      section.fields.forEach(field => {
        // Always use the value or empty string
        let value = formData[field.name] ?? '';

        // For conditional fields, always set their value (yes/no/other)
        // For dependent fields, set value if condition met, else empty string
        if (field.conditional) {
          const depValue = formData[field.conditional.dependsOn];
          if (field.conditional.showWhen === 'hasValue') {
            if (!depValue) value = '';
          } else if (depValue !== field.conditional.showWhen) {
            value = '';
          }
        }

        // Special logic for computed display fields
        if (field.name === 'ulaySpec') {
          if (Array.isArray(formData.ulaySpec)) {
            if (formData.ulaySpec.includes('OtherIns')) {
              processed.membraneType = formData.insSpec || '';
            } else {
              processed.membraneType = formData.ulaySpec.join(', ');
            }
          } else if (formData.ulaySpec === 'OtherIns') {
            processed.membraneType = formData.insSpec || '';
          } else {
            processed.membraneType = formData.ulaySpec || '';
          }
        }

        // Solar Area (dependent)
        if (field.name === 'solarLoad') {
          processed.solarLoad = formData.solarLoad ?? '';
          processed.solarAreaDisplay = formData.solarLoad === 'yes' ? formData.solarArea || '' : '';
        }

        // Geyser Area (dependent)
        if (field.name === 'geyserLoad') {
          processed.geyserLoad = formData.geyserLoad ?? '';
          processed.geyserAreaDisplay = formData.geyserLoad === 'yes' ? formData.geyserArea || '' : '';
        }

        // Exposed Truss (dependent)
        if (field.name === 'exposedTruss') {
          processed.exposedTruss = formData.exposedTruss ?? '';
          processed.trussTypeDisplay = formData.exposedTruss === 'yes' ? formData.trussType || '' : '';
          processed.trussType2Display = formData.exposedTruss === 'yes' ? formData.trussType2 || '' : '';
          processed.trussAreaDisplay = formData.exposedTruss === 'yes' ? formData.trussArea || '' : '';
        }

        // Optional P&G1 (dependent)
        if (field.name === 'optionalPG1') {
          processed.optionalPG1 = formData.optionalPG1 ?? '';
          processed.pg1DescDisplay = formData.optionalPG1 === 'yes' ? formData.pg1Desc || '' : '';
        }

        // Building Type (Other)
        if (field.name === 'buildingType') {
          processed.buildingType = formData.buildingType ?? '';
          processed.otherBuildDisplay = formData.buildingType === 'other' ? formData.otherBuild || '' : '';
        }

        // === IMAGE & SIGNATURE HANDLING ===
        if (field.type === 'picture') {
          // If value is a PictureData object, extract dataUrl; else use as-is
          if (value && typeof value === 'object' && value.dataUrl) {
            processed[field.name] = value.dataUrl;
          } else if (typeof value === 'string' && value.startsWith('data:image/')) {
            processed[field.name] = value;
          } else {
            processed[field.name] = '';
          }
          return; // Skip default assignment below
        }

        if (field.type === 'signature') {
          // Signature is expected to be a base64 PNG data URL
          if (typeof value === 'string' && value.startsWith('data:image/')) {
            processed[field.name] = value;
          } else {
            processed[field.name] = '';
          }
          return; // Skip default assignment below
        }

        // Always set the field (unless it's a computed display field above)
        if (!processed.hasOwnProperty(field.name)) {
          processed[field.name] = value;
        }
      });
    });

    return processed;
  }

  private generatePdfDirectly(template: any, formData: any, formType: string): void {
    // Create a simple HTML content from the template
    let htmlContent = template.content || '<h1>PDF Document</h1><p>Generated from form data</p>';

    // Extract form fields for replacement
    const allFormFields = this.extractAllFormFields(formData);

    // Replace placeholders in template
    Object.keys(allFormFields).forEach(key => {
      const placeholder = `{{${key}}}`;
      let value = allFormFields[key];

      if (typeof value === 'string' && value.startsWith('data:image/')) {
        value = `<img src="${value}" alt="${key}" style="max-width: 400px; max-height: 200px; display: block; margin: 8px 0;" />`;
      }

      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value || 'N/A');
    });

    // Create printable HTML
    const printableHtml = this.wrapInPrintableHtml(htmlContent, formType);

    // Open print window
    this.printToPdf(printableHtml, `${formType}-${formData.submissionId || 'document'}.pdf`);
  }

  private extractAllFormFields(data: any, prefix: string = ''): Record<string, any> {
    const fields: Record<string, any> = {};

    if (!data || typeof data !== 'object') {
      return fields;
    }

    Object.keys(data).forEach(key => {
      const value = data[key];
      const fieldKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively extract nested objects
        const nestedFields = this.extractAllFormFields(value, fieldKey);
        Object.assign(fields, nestedFields);
      } else {
        // Store primitive values, arrays, or dates
        fields[fieldKey] = value;
        fields[key] = value; // Also store without prefix for simple access
      }
    });

    return fields;
  }

  private printToPdf(htmlContent: string, filename: string): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Unable to open print window');
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    // Automatically trigger print dialog after a short delay
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  private wrapInPrintableHtml(content: string, formType: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${formType.toUpperCase()} Document</title>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 8.5in;
              margin: 0 auto;
              padding: 0.5in;
              background: white;
            }

            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }

            .header h1 {
              margin: 0;
              color: #2c3e50;
              font-size: 24px;
            }

            .header p {
              margin: 5px 0 0 0;
              color: #7f8c8d;
              font-size: 14px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              background: white;
            }

            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background-color: #f2f2f2;
              font-weight: bold;
              color: #2c3e50;
            }

            .field-label {
              background-color: #f8f9fa;
              font-weight: bold;
              width: 30%;
              color: #495057;
            }

            .field-value {
              width: 70%;
              word-wrap: break-word;
            }

            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${formType.toUpperCase()} Document</h1>
            <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>

          ${content}

          <div class="footer">
            <p>This document was automatically generated from ${formType.toUpperCase()} form submission.</p>
          </div>
        </body>
      </html>
    `;
  }
}

