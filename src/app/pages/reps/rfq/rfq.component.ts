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
      // Quote timeline section
      title: 'Quote Timeline',
      description: '',
      expanded: true,
      fields: [

                // Information label
        {
          name: 'quoteInfoLabel',
          label: '',
          type: 'label',
          text: 'Set a realistic turnaround time for the quote to be sent to client',
          labelConfig: {
            style: 'info',
            alignment: 'left'
          }
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
          text: 'Select the rep handling this RFQ and specify email recipients to cc quote to',
          labelConfig: {
            style: 'info',
            alignment: 'left'
          }
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
            alignment: 'left'
          }
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
            { value: 'supply-truss', label: 'Supply Truss' },
            { value: 'supply-cover', label: 'Supply Cover' },
            { value: 'erect-truss', label: 'Erect Truss' },
            { value: 'erect-cover', label: 'Erect Cover' },
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
            { value: 'undertile', label: 'Undertile membrane' },
            { value: 'singleSisilation', label: 'Single sided sisilation' },
            { value: 'doubleSisilation', label: 'Double sided sisilation' },
            { value: 'bubblefoil', label: 'Bubblefoil or similar' },
            { value: 'thickInsulation', label: 'Thick insulation' },
            { value: 'isoboard', label: 'Isoboard or similar' },
            { value: 'aluBubble', label: 'ALU bubble' },
            { value: 'durafoil', label: 'Durafoil' },
            { value: 'otherIns', label: 'Other ins' },
          ],
          placeholder: 'Select Items',
          clearable: true,
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
          label: 'Exposed Truss Design Type Required',
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
        // {
        //   name: 'exposedTrussType_2',
        //   label: 'Exposed Truss Design Type Required',
        //   type: 'text',
        //   required: true,
        //   clearable: true,
        //   placeholder: 'eg. Bedroom, mention accurate area from plans',
        //   conditional: {
        //     dependsOn: 'isExposedTrussRequired',
        //     showWhen: 'yes',
        //   },
        // },

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
            { value: 'vergeTiles', label: 'Verge Tiles' },
            { value: 'monoRidges', label: 'Mono Ridges' },
            { value: 'bargeBoards', label: 'Barge Boards' },
            { value: 'facias', label: 'Facias' },
            { value: 'shutterboard', label: 'Shutterboard' },
            { value: 'gableTrims', label: 'Gable Trims' },
            { value: 'apexTrims', label: 'Apex Trims' },
            { value: 'none', label: 'None, eg: hip roof' },
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

        // ADD CONDITIONAL FIELD FOR YES - type of exposed truss design required
        {
          name: 'exposedTrussType',
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
          name: 'drawingsSectionTitle',
          label: '',
          type: 'label',
          text: 'Upload Drawings & Site Photos',
          labelConfig: {
            style: 'title',
            alignment: 'center',
            bold: true
          }
        },

        // Caption label
        {
          name: 'drawingsCaption',
          label: '',
          type: 'label',
          text: 'Add dates for drawings and upload photos/scans. Picture fields will appear when drawing dates are selected.',
          labelConfig: {
            style: 'caption',
            alignment: 'center'
          }
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

                        // Conditions label
        {
          name: 'conditionsLabel',
          label: '',
          type: 'label',
          text: 'Notes and comments for consideration when quoting: 1.Manufacture & delivery dates are dependent on workload at time of deposit payment. 2.Manufacture is dependent on availability of material not normally included in a standard roof design. 3.Laminated beams can take up to 3 or 4 weeks to procure. 4.Decorative and purpose made plated trusses will take an additional 3.weeks to the normal truss dates. 5.No manufacture will commence until the deposit is paid and signed terms & conditions are forwarded to the LCP Roofing head office. 6.Inaccurate information, changes to the design & building not according to plan will delay the manufacture and erection process. 7.Final design is ONLY done when the terms and conditions are signed and the deposit is paid. It could happen that certain design elements can change which affect the layout of the roof. The client will be requested to sign this off if such a change occurs. LCP Roofing will do everything possible to ensure the original quote is correct and accurate. 8.Overhangs are standard 50mm or 1 tile(350mm), 1.5 tile (500mm) or 2 tile (650mm) on SLOPE. Deviations from this will result in an unnecessary additional cost. 9.Roof sheeting can take up to 4 weeks to procure from site measure and colour confirmation; and up to 12 weeks in Nov & Dec. 10.Take special note to discuss Roof Wire or Hoop Iron holding down details and note the National Building Regulations in this regard. 11.LCP quotes to complete a roof and guarantees the quoted price if we supply the complete service. Should LCP Roofing not do the erection, any materials shortages will be charged for. No refunds are given for excess materials left over on site.',
          labelConfig: {
            style: 'info',
            alignment: 'left',
            italic: true,
          }
        },

                // Repeat RFQ
        {
          name: 'repeatRFQ',
          label: 'Repeat RFQ ?',
          type: 'select',
          multiple: false,
          required: true,
          clearable: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        },

        // basic signature field
         {
           name: 'customerSignature',
           label: 'Customer Signature',
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
