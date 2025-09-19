import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SidenavService } from '../../services/sidenav.service';
import { PdfGenerationService } from '../../services/pdf-generation.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  constructor(
    private sidenavService: SidenavService,
    private pdfService: PdfGenerationService,
    private snackBar: MatSnackBar
  ) {}

  toggleSidenav() {
    this.sidenavService.toggle();
  }

  testEnhancedPDF() {
    console.log('🚀 Starting PDF test...');
    const sampleData = this.getSampleData();

    this.pdfService.generateEnhancedRFQ(sampleData).subscribe({
      next: () => {
        this.snackBar.open('Enhanced PDF generated successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      },
      error: (error: any) => {
        console.error('Error generating PDF:', error);
        this.snackBar.open('Error generating PDF. Please try again.', 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
      }
    });
  }

  debugTemplate() {
    console.log('🔍 Starting template debug...');
    const sampleData = this.getSampleData();

    this.pdfService.debugTemplate(sampleData).subscribe({
      next: () => {
        console.log('✅ Debug completed - check new browser window');
        this.snackBar.open('Debug template opened in new window', 'Close', {
          duration: 3000
        });
      },
      error: (error: any) => {
        console.error('Debug error:', error);
        this.snackBar.open('Debug failed: ' + error.message, 'Close', {
          duration: 5000
        });
      }
    });
  }

  // Add a simple test method for html2pdf
  testSimplePDF() {
    console.log('🧪 Testing simple PDF generation...');

    const simpleHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Simple Test</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color: #0b7ad4;">Simple PDF Test</h1>
        <p>This is a simple test to verify html2pdf is working.</p>
        <p>Generated at: ${new Date().toLocaleString()}</p>
        <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Test Field 1:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">Test Value 1</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Test Field 2:</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">Test Value 2</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    if (typeof (window as any).html2pdf !== 'undefined') {
      const options = {
        margin: 0.5,
        filename: 'simple-test.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      (window as any).html2pdf().set(options).from(simpleHtml).save().then(() => {
        console.log('✅ Simple PDF test successful!');
        this.snackBar.open('Simple PDF test successful!', 'Close', { duration: 3000 });
      }).catch((error: any) => {
        console.error('❌ Simple PDF test failed:', error);
        this.snackBar.open('Simple PDF test failed: ' + error.message, 'Close', { duration: 5000 });
      });
    } else {
      console.error('❌ html2pdf library not found');
      this.snackBar.open('html2pdf library not found', 'Close', { duration: 5000 });
    }
  }

  private getSampleData() {
    return {
      // Basic RFQ Info
      rfqNumber: 'RFQ-2024-001',
      dateRequested: new Date().toLocaleDateString(),
      dateRequired: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      submissionId: 'RFQ-2024-001',
      createdAt: new Date().toLocaleString(),

      // Representative info
      repName: 'Bryan Van Staden',

      // Quick Meta Grid
      drawnOn: new Date().toLocaleDateString(),
      drawnBy: 'B. Van Staden',
      customerNo: 'C-12345',
      quotedOn: new Date().toLocaleDateString(),
      estimator: 'John Estimator',
      quoteNo: 'Q-2024-001',
      rateCheck: 'Checked',

      // Dates
      dateSubmitted: new Date().toLocaleDateString(),
      dateDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),

      // Office codes
      abk: 'ABK-001',
      other: 'Other-001',
      pg2: 'PG2-001',

      // Project Information
      standNum: '123 Main Street, Cape Town, 8001',
      companyName: 'ABC Construction Company',
      clientName: 'John Smith',
      clientEmail: 'john.smith@abcconstruction.com',
      clientPhone: '(021) 555-1234',
      ccMail: 'cc@abcconstruction.com',
      buildingType: 'Residential House',
      municipality: 'City of Cape Town',
      roofTimeline: '4 weeks',

      // Project Design Information
      gateAccess: 'Yes - R500',
      structureType: 'Tiled Roof',
      maxTrussSpacing: '1200mm',
      mainPitch: '30 degrees',
      pitch2: '25 degrees',
      serviceType: 'Supply & Install',
      eavesOH: '350mm',
      gableOH: '350mm',
      apexOH: '200mm',
      membraneType: 'Sisalation',
      ceilingType: 'Rhinolite',
      wallCorbel: '215mm',
      solarLoad: 'Yes - 6 panels',
      solarAreaDisplay: 'South facing roof',
      geyserLoad: 'Yes - 200L',
      geyserAreaDisplay: 'Bathroom area',
      exposedTruss: 'Yes',
      trussTypeDisplay: 'Laminated beam',
      trussType2Display: 'Pine laminated',
      trussAreaDisplay: 'Living room',
      trussSundry: 'Ridge capping, gutters',
      trussNotes: 'Standard residential truss design with 30-degree pitch. Client requires exposed trusses in living area.',
      optionalPG1: 'Yes',
      pg1DescDisplay: 'Additional reinforcement',

      // Roof Covering Information
      coverReq: 'Yes',
      coverType: 'Concrete tiles',
      tileProfile: 'Double Roman',
      tileColour: 'Charcoal',
      tileNailing: 'Every 3rd course',
      sheetProfile: 'IBR',
      sheetColour: 'Charcoal',
      coverNotes: 'Premium quality tiles with 20-year warranty. Installation includes all flashings and ridge capping.',

      // Drawing Details
      drawings1: 'Site Plan',
      dwg1No: 'SP-001',
      drawings2: 'Roof Plan',
      dwg2No: 'RP-001',
      drawings3: 'Elevations',
      dwg3No: 'EL-001',
      drawings4: 'Sections',
      dwg4No: 'SE-001',
      drawings5: 'Details',
      dwg5No: 'DT-001',

      // Images (placeholders)
      drawingPhoto1: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRyYXdpbmcgUGhvdG8gMTwvdGV4dD48L3N2Zz4=',
      drawingPhoto2: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRyYXdpbmcgUGhvdG8gMjwvdGV4dD48L3N2Zz4=',
      drawingPhoto3: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRyYXdpbmcgUGhvdG8gMzwvdGV4dD48L3N2Zz4=',
      drawingPhoto4: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRyYXdpbmcgUGhvdG8gNDwvdGV4dD48L3N2Zz4=',
      drawingPhoto5: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRyYXdpbmcgUGhvdG8gNTwvdGV4dD48L3N2Zz4=',

      // General Notes
      generalNotes: 'This is a sample RFQ for testing purposes. All specifications are subject to final approval and may be adjusted based on site conditions and client requirements.',

      // Header image
      headerImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjYwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxOTc2ZDIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxDUCBSb29maW5nPC90ZXh0Pjwvc3ZnPg=='
    };
  }

  quickActions = [
    {
      "title": "Forms Dashboard",
      "description": "Browse all available forms for your role",
      "routePath": "/reps/forms",
      "icon": "dashboard",
      "color": "primary"
    },
    {
      "title": "Create RFQ",
      "description": "Request for Quote - Get quotes for your projects",
      "routePath": "/reps/forms/rfq",
      "icon": "request_quote",
      "color": "primary"
    },
    {
      "title": "Create RQR",
      "description": "Request for Re-Quote - Request updated quotes",
      "routePath": "/reps/forms/rqr",
      "icon": "refresh",
      "color": "accent"
    },
    {
      "title": "View Submissions",
      "description": "Browse and manage all form submissions",
      "routePath": "/submissions",
      "icon": "folder_open",
      "color": "warn"
    },
    {
      "title": "Manage Templates",
      "description": "Create and edit document templates",
      "routePath": "/templates",
      "icon": "description",
      "color": "primary"
    }
  ];

  recentActivity = [
    { action: "RFQ submitted", time: "2 hours ago", icon: "assignment" },
    { action: "Template updated", time: "1 day ago", icon: "edit" },
    { action: "Quote approved", time: "3 days ago", icon: "check_circle" }
  ];

  stats = [
    { label: "Active RFQs", value: "12", icon: "trending_up", color: "primary" },
    { label: "Templates", value: "8", icon: "description", color: "accent" },
    { label: "This Month", value: "45", icon: "calendar_today", color: "warn" }
  ];
}
