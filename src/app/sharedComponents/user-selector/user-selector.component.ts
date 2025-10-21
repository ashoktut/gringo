import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { UserManagementService } from '../../services/user-management.service';
import { User, Company, UserSession } from '../../models/user.models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `
    <div class="user-selector-container">
      @if (currentSession) {
        <!-- Current User Display -->
        <mat-card class="current-user-card">
          <mat-card-content>
            <div class="user-info">
              <div class="user-details">
                <mat-icon class="user-icon">account_circle</mat-icon>
                <div>
                  <div class="user-name">{{ currentSession.user.name }}</div>
                  <div class="user-email">{{ currentSession.user.email }}</div>
                </div>
              </div>
              <mat-chip [class]="getRoleClass(currentSession.user.role)">
                {{ getRoleDisplay(currentSession.user.role) }}
              </mat-chip>
            </div>

            @if (currentSession.company) {
              <div class="company-info">
                <mat-icon>business</mat-icon>
                <span>{{ currentSession.company.name }} ({{ currentSession.company.code }})</span>
              </div>
            }

            <div class="actions">
              @if (currentSession.user.role === 'super-admin') {
                <button mat-outlined-button (click)="showCompanySwitcher = !showCompanySwitcher">
                  <mat-icon>swap_horiz</mat-icon>
                  Switch Company Context
                </button>
              }
              <button mat-outlined-button (click)="showUserSwitcher = !showUserSwitcher">
                <mat-icon>person</mat-icon>
                Switch User
              </button>
              <button mat-outlined-button (click)="logout()">
                <mat-icon>logout</mat-icon>
                Logout
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Company Switcher for Super Admin -->
        @if (showCompanySwitcher && currentSession.user.role === 'super-admin') {
          <mat-card class="switcher-card">
            <mat-card-header>
              <mat-card-title>Switch Company Context</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Select Company</mat-label>
                <mat-select [(value)]="selectedCompanyId" (selectionChange)="switchCompany()">
                  <mat-option value="">Global (No Company)</mat-option>
                  @for (company of companies; track company.id) {
                    <mat-option [value]="company.id">
                      {{ company.name }} ({{ company.code }})
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </mat-card-content>
          </mat-card>
        }

        <!-- User Switcher -->
        @if (showUserSwitcher) {
          <mat-card class="switcher-card">
            <mat-card-header>
              <mat-card-title>Switch User (Demo Mode)</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="user-list">
                @for (user of users; track user.id) {
                  <div class="user-option"
                       [class.selected]="currentSession && user.id === currentSession.user.id"
                       (click)="loginAs(user)">
                    <div class="user-info">
                      <div>
                        <div class="user-name">{{ user.name }}</div>
                        <div class="user-email">{{ user.email }}</div>
                      </div>
                      <mat-chip [class]="getRoleClass(user.role)">
                        {{ getRoleDisplay(user.role) }}
                      </mat-chip>
                    </div>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        }

      } @else {
        <!-- Login Screen -->
        <mat-card class="login-card">
          <mat-card-header>
            <mat-card-title>Select User (Demo Mode)</mat-card-title>
            <mat-card-subtitle>Choose a user to experience different permission levels</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="user-list">
              @for (user of users; track user.id) {
                <div class="user-option" (click)="loginAs(user)">
                  <div class="user-info">
                    <div>
                      <div class="user-name">{{ user.name }}</div>
                      <div class="user-email">{{ user.email }}</div>
                    </div>
                    <mat-chip [class]="getRoleClass(user.role)">
                      {{ getRoleDisplay(user.role) }}
                    </mat-chip>
                  </div>
                  <div class="user-description">
                    {{ getUserDescription(user) }}
                  </div>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .user-selector-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .current-user-card, .switcher-card, .login-card {
      margin-bottom: 20px;
    }

    .user-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .user-details {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .user-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #666;
    }

    .user-name {
      font-weight: 500;
      font-size: 16px;
    }

    .user-email {
      color: #666;
      font-size: 14px;
    }

    .company-info {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding: 8px;
      background-color: #f5f5f5;
      border-radius: 8px;
      color: #666;
    }

    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .user-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .user-option {
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .user-option:hover {
      background-color: #f5f5f5;
      border-color: #1976d2;
    }

    .user-option.selected {
      background-color: #e3f2fd;
      border-color: #1976d2;
    }

    .user-description {
      margin-top: 8px;
      font-size: 14px;
      color: #666;
    }

    .full-width {
      width: 100%;
    }

    .role-super-admin {
      background-color: #f44336 !important;
      color: white !important;
    }

    .role-company-admin {
      background-color: #ff9800 !important;
      color: white !important;
    }

    .role-user {
      background-color: #4caf50 !important;
      color: white !important;
    }
  `]
})
export class UserSelectorComponent implements OnInit {
  users: User[] = [];
  companies: Company[] = [];
  currentSession: UserSession | null = null;
  selectedCompanyId: string = '';
  showUserSwitcher = false;
  showCompanySwitcher = false;

  constructor(
    private userService: UserManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadCompanies();
    this.loadCurrentSession();
  }

  private loadUsers(): void {
    this.userService.users$.subscribe(users => {
      this.users = users;
    });
  }

  private loadCompanies(): void {
    this.userService.companies$.subscribe(companies => {
      this.companies = companies;
    });
  }

  private loadCurrentSession(): void {
    this.userService.currentSession$.subscribe(session => {
      this.currentSession = session;
      this.selectedCompanyId = session?.company?.id || '';
    });
  }

  loginAs(user: User): void {
    this.userService.login(user.email).subscribe(session => {
      if (session) {
        this.showUserSwitcher = false;
        this.router.navigate(['/templates']);
      }
    });
  }

  switchCompany(): void {
    if (this.selectedCompanyId) {
      this.userService.switchCompany(this.selectedCompanyId).subscribe(success => {
        if (success) {
          this.showCompanySwitcher = false;
        }
      });
    } else {
      // Switch to global context
      const currentUser = this.currentSession?.user;
      if (currentUser) {
        this.userService.login(currentUser.email).subscribe(() => {
          this.showCompanySwitcher = false;
        });
      }
    }
  }

  logout(): void {
    this.userService.logout();
    this.router.navigate(['/']);
  }

  getRoleDisplay(role: string): string {
    switch (role) {
      case 'super-admin': return 'Super Admin';
      case 'company-admin': return 'Company Admin';
      case 'user': return 'User';
      default: return role;
    }
  }

  getRoleClass(role: string): string {
    return `role-${role}`;
  }

  getUserDescription(user: User): string {
    switch (user.role) {
      case 'super-admin':
        return 'Can manage all companies and templates globally';
      case 'company-admin':
        return `Can manage templates for ${this.getCompanyName(user.companyId)}`;
      case 'user':
        return `Regular user for ${this.getCompanyName(user.companyId)}`;
      default:
        return '';
    }
  }

  private getCompanyName(companyId?: string): string {
    if (!companyId) return 'Unknown Company';
    const company = this.companies.find(c => c.id === companyId);
    return company ? company.name : 'Unknown Company';
  }
}
