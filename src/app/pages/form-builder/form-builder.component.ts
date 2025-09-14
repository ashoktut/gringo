import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { FormConfiguration } from '../../services/form-config.service';
import { VisualFormEditorComponent } from '../../sharedComponents/visual-form-editor/visual-form-editor.component';
import { ConfigManagementComponent } from './config-management/config-management.component';

@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    VisualFormEditorComponent,
    ConfigManagementComponent
  ],
  template: `
    <div class="form-builder-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="header-icon">build</mat-icon>
            Form Configuration Builder
          </mat-card-title>
          <mat-card-subtitle>
            Manage and design dynamic form configurations with the integrated visual editor
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <mat-tab-group [selectedIndex]="activeTabIndex()" (selectedIndexChange)="activeTabIndex.set($event)">
            <mat-tab label="Manage Configurations">
              <div class="tab-content">
                <app-config-management></app-config-management>
              </div>
            </mat-tab>

            <mat-tab label="Visual Editor" [disabled]="!editingConfig()">
              <div class="tab-content" *ngIf="editingConfig()">
                <div class="editor-header">
                  <h3>Editing: {{ editingConfig()?.name }}</h3>
                  <button mat-raised-button color="primary" (click)="createNewConfiguration()">
                    <mat-icon>add</mat-icon>
                    Create New Configuration
                  </button>
                </div>

                <app-visual-form-editor
                  [configuration]="editingConfig()"
                  (save)="onConfigurationSaved($event)"
                  (cancel)="onEditorCancelled()">
                </app-visual-form-editor>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .form-builder-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: #667eea;
      margin-right: 12px;
    }

    .tab-content {
      padding: 20px 0;
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e0e0e0;
    }

    .editor-header h3 {
      margin: 0;
      color: #333;
    }

    @media (max-width: 768px) {
      .form-builder-container {
        padding: 10px;
      }

      .editor-header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
      }
    }
  `]
})
export class FormBuilderComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  editingConfig = signal<FormConfiguration | null>(null);
  configurations = signal<FormConfiguration[]>([]);
  activeTabIndex = signal<number>(0);
  canEdit = computed(() => !!this.editingConfig());

  ngOnInit() {
    this.loadConfigurations();
    this.checkForEditMode();
  }

  private loadConfigurations() {
    const mockConfigurations: FormConfiguration[] = [
      {
        id: '1',
        name: 'Contact Form',
        formType: 'contact',
        version: '1.0',
        isDefault: true,
        isActive: true,
        sections: [],
        metadata: {
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
          description: 'Basic contact form with name, email, and message fields'
        }
      }
    ];
    this.configurations.set(mockConfigurations);
  }

  private checkForEditMode() {
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        const configId = params['edit'];
        const config = this.configurations().find(c => c.id === configId);
        if (config) {
          this.editConfiguration(config);
        }
      }
    });
  }

  editConfiguration(config: FormConfiguration) {
    this.editingConfig.set(config);
    this.activeTabIndex.set(1);
  }

  createNewConfiguration() {
    const newConfig: FormConfiguration = {
      id: '',
      name: 'New Configuration',
      formType: 'custom',
      version: '1.0',
      isDefault: false,
      isActive: true,
      sections: [],
      metadata: {
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: ''
      }
    };
    this.editingConfig.set(newConfig);
    this.activeTabIndex.set(1);
  }

  onConfigurationSaved(config: FormConfiguration) {
    if (!config.id) {
      config.id = Date.now().toString();
      this.configurations.update(configs => [...configs, config]);
    } else {
      this.configurations.update(configs =>
        configs.map(c => c.id === config.id ? config : c)
      );
    }
    this.editingConfig.set(null);
    this.activeTabIndex.set(0);
  }

  onEditorCancelled() {
    this.editingConfig.set(null);
    this.activeTabIndex.set(0);
  }

  deleteConfiguration(config: FormConfiguration) {
    this.configurations.update(configs =>
      configs.filter(c => c.id !== config.id)
    );
    if (this.editingConfig()?.id === config.id) {
      this.editingConfig.set(null);
      this.activeTabIndex.set(0);
    }
  }
}
