import { Component, OnInit } from '@angular/core';
import {
  FormField,
  FormSection, // ADD THIS IMPORT
  ReusableFormComponent,
} from '../../../sharedComponents/reusable-form/reusable-form.component';
import { CommonModule } from '@angular/common';
import { Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormSubmissionService } from '../../../services/form-submission.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-rfq',
  imports: [CommonModule, ReusableFormComponent, MatIconModule, MatButtonModule],
  templateUrl: './rfq.component.html',
  styleUrl: './rfq.component.css',
})
export class RfqComponent implements OnInit {
  // Repeat functionality properties
  isRepeatMode = false;
  originalSubmissionId: string | null = null;
  repeatedSubmissionData: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formSubmissionService: FormSubmissionService
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
  }
  // To make a field not rquired, set required: false
  // To make a field required, set required: true
  // To remove validation, remove the validators array or set it to an empty array

  rfqSections: FormSection[] = [
    {
      // Quote timeline section
      title: 'Quote Timeline',
      description: 'Set a realistic timeline ',
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
      description: 'Rep info & email recipients',
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
            { value: 'bryan', label: 'Bryan Van Staden' },
            { value: 'jeff', label: 'Jeff Nain' },
            { value: 'roux', label: 'Roux Mahlerbe' },
            { value: 'ruan', label: 'Ruan Schroder' },
            { value: 'other', label: 'Other' },
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
            { value: 'andri@roofing.com', label: 'Andri Pretorius' },
            { value: 'bryan@roofing.com', label: 'Bryan Van Staden' },
            { value: 'jeff@roofing.com', label: 'Jeff Nain' },
            { value: 'roux@roofing.com', label: 'Roux Mahlerbe' },
            { value: 'ruan@roofing.com', label: 'Ruan Schroder' },
            { value: 'lyndsay@roofing.com', label: 'Lyndsay Cotton' },
            { value: 'stacy@roofing.com', label: 'Stacy Burgess' },
          ],
        },
      ],
    },

    // Roof timeline section
    {
      title: 'Roof Timeline',
      description: 'ABK and P&G info',
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
            { value: 'above 6 months', label: '> 6 months' },
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
            { value: 'private', label: 'Private Client' },
            { value: 'company', label: 'Company' },
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
            showWhen: 'company',
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
            { value: '0', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'addLess', label: 'Addition less than 80m²' },
            { value: 'addMore', label: 'Addition more than 80m²' },
            { value: 'directMatch', label: 'Direct Match' },
            { value: 'public', label: 'Public Building' },
            { value: 'other', label: 'Other Building Type' },
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
            { value: 'tiled', label: 'Tiled Roof' },
            { value: 'sheeted', label: 'Sheeted Roof' },
            { value: 'slated', label: 'Slated Roof' },
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
          validators: [Validators.min(1), Validators.max(100000)],
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

        // Wall cobbling field
        {
          name: 'wallCobbling',
          label: 'Wall Cobbling',
          type: 'text',
          required: false,
          clearable: true,
        },

        // Eaves overhang field
        {
          name: 'eavesOverhang',
          label: 'Eaves Overhang',
          type: 'text',
          required: true,
          clearable: true,
          placeholder: 'horizontal dimension in mm from wall',
        },

        // Gable overhang field
        {
          name: 'gableOverhang',
          label: 'Gable Overhang',
          type: 'text',
          required: true,
          clearable: true,
          placeholder: 'state the overhang from wall',
        },

        // Apex overhang field
        {
          name: 'apexOverhang',
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
            { value: 'Bubblefoil', label: 'Bubblefoil or similar' },
            { value: 'Thick Insulation', label: 'Thick insulation' },
            { value: 'Isoboard', label: 'Isoboard or similar' },
            { value: 'AluBubble', label: 'ALU bubble' },
            { value: 'Durafoil', label: 'Durafoil' },
            { value: 'OtherIns', label: 'OtherIns' },
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
            showWhen: 'OtherIns',
          },
        },

        // Is Solar Needed question field
        {
          name: 'isSolarLoading',
          label: 'Solar Loading Required ?',
          type: 'select',
          multiple: false,
          required: true,
          clearable: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        },

        // ADD CONDITIONAL FIELD FOR YES - where do you need the solar installed on the structure, above bathroom
        {
          name: 'solarLoadingArea',
          label: 'Which area requires solar loading?',
          type: 'text',
          required: true,
          clearable: true,
          placeholder: 'eg. Above bedroom',
          conditional: {
            dependsOn: 'isSolarLoading',
            showWhen: 'yes',
          },
        },

        // Is Geyser Needed question field
        {
          name: 'isGeyserLoading',
          label: 'Geyser Loading Required ?',
          type: 'select',
          multiple: false,
          required: true,
          clearable: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        },

        // ADD CONDITIONAL FIELD FOR YES - where do you need the geyser installed on the structure
        {
          name: 'geyserLoadingArea',
          label: 'Which area requires solar loading?',
          type: 'text',
          required: true,
          clearable: true,
          placeholder: 'eg. Bedroom, mention accurate area from plans',
          conditional: {
            dependsOn: 'isGeyserLoading',
            showWhen: 'yes',
          },
        },

        // Is Exposed Trusses Needed question field
        {
          name: 'isExposedTrussRequired',
          label: 'Exposed trusses Required in design ?',
          type: 'select',
          multiple: false,
          required: true,
          clearable: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        },

        // ADD CONDITIONAL FIELD FOR YES - type of exposed truss design required
        {
          name: 'exposedTrussType',
          label: 'Exposed Truss Design',
          type: 'select',
          required: true,
          clearable: true,
          options: [
            { value: 'partially', label: 'Partially Exposed' },
            { value: 'completely', label: 'Completely Exposed' },
          ],
          conditional: {
            dependsOn: 'isExposedTrussRequired',
            showWhen: 'yes',
          },
        },

        // ADD CONDITIONAL FIELD FOR YES - type of exposed truss manual
        {
          name: 'exposedTrussType_2',
          label: 'Exposed Truss Design Type Required',
          type: 'text',
          required: true,
          clearable: true,
          placeholder: 'eg. Bedroom, mention accurate area from plans',
          conditional: {
            dependsOn: 'isExposedTrussRequired',
            showWhen: 'yes',
          },
        },

        // ADD CONDITIONAL FIELD FOR YES - which areas of the structure needs exposed truss
        {
          name: 'exposedTrussType_3',
          label: 'Areas That Require Exposed trusses',
          type: 'text',
          required: true,
          clearable: true,
          placeholder: 'eg. Bedroom, mention accurate area from plans',
          conditional: {
            dependsOn: 'isExposedTrussRequired',
            showWhen: 'yes',
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
          name: 'optionalP&G1',
          label: 'Optional P&G1',
          type: 'select',
          multiple: false,
          required: true,
          clearable: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        },

        // ADD CONDITIONAL FIELD FOR YES - where do you need the geyser installed on the structure
        {
          name: 'p&g1Description',
          label: 'P&G1 Description',
          type: 'text',
          required: true,
          clearable: true,
          placeholder: 'List all the items required in a short description',
          conditional: {
            dependsOn: 'optionalP&G1',
            showWhen: 'yes',
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
            { value: '0', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'addLess', label: 'Addition less than 80m²' },
            { value: 'addMore', label: 'Addition more than 80m²' },
            { value: 'directMatch', label: 'Direct Match' },
            { value: 'public', label: 'Public Building' },
            { value: 'other', label: 'Other Building Type' },
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
          name: 'isQuoteCoverRequired',
          label: 'Quote Cover Needed?',
          type: 'select',
          multiple: false,
          required: true,
          clearable: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
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
            { value: 'tiles', label: 'Tiles' },
            { value: 'sheeting', label: 'Sheeting' },
            { value: 'slate', label: 'Slate, but not by LCP' },
          ],
          conditional: {
            dependsOn: 'isQuoteCoverRequired',
            showWhen: 'yes',
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
            showWhen: 'tiles',
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
            showWhen: 'tiles',
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
            showWhen: 'tiles',
          },
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
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
            showWhen: 'sheeting',
          },
          options: [
            { value: 'Corrugated', label: 'Corrugated' },
            { value: 'sheeting', label: 'Concealed Fix' },
            { value: 'slate', label: 'IBR' },
            { value: 'slate', label: 'Craftlock' },
            { value: 'slate', label: 'Widespan' },
            { value: 'slate', label: 'Brownbuilt' },
            { value: 'slate', label: 'Rheinzink Double Standing' },
            { value: 'slate', label: 'Newlok' },
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
            showWhen: 'sheeting',
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
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
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
    if (Math.random() < 0.001) { // Only log 0.1% of form changes
      console.log('Form value changed:', event);
    }

    // You can perform real-time validation or other actions here
    // For example, enable/disable submit button, show live preview, etc.
  }
}
