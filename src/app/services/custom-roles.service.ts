import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  CustomRole,
  FormType,
  RoleFormAssignment,
  UserAccessibleForm,
  CreateCustomRoleDto,
  AssignFormToRoleDto,
  CompanyUser
} from '../models/custom-roles.interface';

@Injectable({
  providedIn: 'root'
})
export class CustomRolesService {
  private supabase = inject(SupabaseService);

  // Signals for reactive state
  customRoles = signal<CustomRole[]>([]);
  formTypes = signal<FormType[]>([]);
  userAccessibleForms = signal<UserAccessibleForm[]>([]);

  /**
   * Get all custom roles for current user's company
   */
  async getCustomRoles(companyId?: string): Promise<CustomRole[]> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      let query = this.supabase.client
        .from('custom_roles')
        .select('*')
        .order('role_name');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      this.customRoles.set(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching custom roles:', error);
      throw error;
    }
  }

  /**
   * Create a new custom role
   */
  async createCustomRole(dto: CreateCustomRoleDto): Promise<CustomRole> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await this.supabase.client
        .from('custom_roles')
        .insert({
          company_id: dto.company_id,
          role_name: dto.role_name,
          role_description: dto.role_description,
          created_by: this.supabase.currentUserValue?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Refresh the list
      await this.getCustomRoles(dto.company_id);

      return data;
    } catch (error) {
      console.error('Error creating custom role:', error);
      throw error;
    }
  }

  /**
   * Update a custom role
   */
  async updateCustomRole(roleId: string, updates: Partial<CustomRole>): Promise<CustomRole> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await this.supabase.client
        .from('custom_roles')
        .update(updates)
        .eq('id', roleId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating custom role:', error);
      throw error;
    }
  }

  /**
   * Delete a custom role
   */
  async deleteCustomRole(roleId: string): Promise<void> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      const { error } = await this.supabase.client
        .from('custom_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting custom role:', error);
      throw error;
    }
  }

  /**
   * Get all form types
   */
  async getFormTypes(companyId?: string): Promise<FormType[]> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      let query = this.supabase.client
        .from('form_types')
        .select('*')
        .order('form_name');

      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      this.formTypes.set(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching form types:', error);
      throw error;
    }
  }

  /**
   * Get form assignments for a role
   */
  async getRoleFormAssignments(roleId: string): Promise<RoleFormAssignment[]> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await this.supabase.client
        .from('role_form_assignments')
        .select(`
          *,
          form_types (*)
        `)
        .eq('custom_role_id', roleId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching role form assignments:', error);
      throw error;
    }
  }

  /**
   * Assign a form to a role
   */
  async assignFormToRole(dto: AssignFormToRoleDto): Promise<RoleFormAssignment> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await this.supabase.client
        .from('role_form_assignments')
        .upsert({
          custom_role_id: dto.custom_role_id,
          form_type_id: dto.form_type_id,
          can_create: dto.can_create,
          can_view: dto.can_view,
          can_edit: dto.can_edit,
          can_delete: dto.can_delete
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error assigning form to role:', error);
      throw error;
    }
  }

  /**
   * Remove form assignment from role
   */
  async removeFormFromRole(roleId: string, formId: string): Promise<void> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      const { error } = await this.supabase.client
        .from('role_form_assignments')
        .delete()
        .eq('custom_role_id', roleId)
        .eq('form_type_id', formId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing form from role:', error);
      throw error;
    }
  }

  /**
   * Get accessible forms for current user
   */
  async getUserAccessibleForms(): Promise<UserAccessibleForm[]> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      const userId = this.supabase.currentUserValue?.id;
      if (!userId) {
        return [];
      }

      const { data, error } = await this.supabase.client
        .rpc('get_user_accessible_forms', { user_uuid: userId });

      if (error) throw error;

      this.userAccessibleForms.set(data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching user accessible forms:', error);
      throw error;
    }
  }

  /**
   * Assign custom role to a user
   */
  async assignRoleToUser(userId: string, roleId: string | null): Promise<void> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      const { error } = await this.supabase.client
        .from('user_profiles')
        .update({ custom_role_id: roleId })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error assigning role to user:', error);
      throw error;
    }
  }

  /**
   * Get users by company
   */
  async getCompanyUsers(companyId: string): Promise<CompanyUser[]> {
    try {
      if (!this.supabase.client) {
        throw new Error('Supabase client not available');
      }

      const { data, error } = await this.supabase.client
        .from('user_profiles')
        .select(`
          id,
          user_id,
          email,
          full_name,
          role,
          company_id,
          custom_role_id,
          custom_roles (
            id,
            role_name
          )
        `)
        .eq('company_id', companyId)
        .order('email');

      if (error) throw error;

      // Map role to account_type and handle custom_roles array from Supabase
      const users: CompanyUser[] = (data || []).map((user: any) => ({
        id: user.id,
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        account_type: user.role,
        company_id: user.company_id,
        custom_role_id: user.custom_role_id,
        custom_roles: Array.isArray(user.custom_roles) && user.custom_roles.length > 0
          ? user.custom_roles[0]
          : null
      }));

      return users;
    } catch (error) {
      console.error('Error fetching company users:', error);
      throw error;
    }
  }
}
