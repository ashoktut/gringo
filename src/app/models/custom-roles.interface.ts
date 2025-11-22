export interface CustomRole {
  id: string;
  company_id: string;
  role_name: string;
  role_description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormType {
  id: string;
  company_id: string | null;
  form_code: string;
  form_name: string;
  form_description: string | null;
  is_system_form: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleFormAssignment {
  id: string;
  custom_role_id: string;
  form_type_id: string;
  can_create: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
}

export interface UserAccessibleForm {
  form_id: string;
  form_code: string;
  form_name: string;
  can_create: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface CreateCustomRoleDto {
  role_name: string;
  role_description?: string;
  company_id: string;
}

export interface AssignFormToRoleDto {
  custom_role_id: string;
  form_type_id: string;
  can_create: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface CompanyUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  account_type: string; // super_admin, company_admin, user
  company_id: string | null;
  custom_role_id: string | null;
  custom_roles?: {
    id: string;
    role_name: string;
  } | null;
}
