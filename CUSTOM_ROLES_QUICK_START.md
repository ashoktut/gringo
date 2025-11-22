# Custom Roles System - Quick Start Guide

## 🚀 Setup Instructions

### 1. Apply Database Schema
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `database-migration-custom-roles.sql`
3. Click "Run" to execute the migration
4. Verify tables created in Table Editor

### 2. Access the Management Pages
- **Role Management**: `/role-management` (Company Admins only)
- **User Management**: `/user-management` (Company Admins only)

---

## 📋 For Company Administrators

### Creating Custom Roles

1. Navigate to `/role-management`
2. In the left panel, enter:
   - **Role Name**: Any text (e.g., "Sales Representative", "Driver", "Factory Worker")
   - **Description**: Optional explanation of the role
3. Click **"Create Role"**
4. Role appears in the list below

### Assigning Form Permissions

1. Click on a role in the left panel
2. Right panel shows all available forms
3. For each form, check the permissions:
   - ☑ **View**: User can see the form in navigation
   - ☑ **Create**: User can create new submissions
   - ☑ **Edit**: User can modify submissions
   - ☑ **Delete**: User can delete submissions
4. Changes save automatically

**Permission Examples:**
```
Sales Rep Role:
  - RFQ Form: ✓ View, ✓ Create, ✗ Edit, ✗ Delete
  - Invoice Form: ✓ View, ✗ Create, ✗ Edit, ✗ Delete

Manager Role:
  - RFQ Form: ✓ View, ✓ Create, ✓ Edit, ✓ Delete
  - Invoice Form: ✓ View, ✓ Create, ✓ Edit, ✗ Delete
```

### Assigning Roles to Users

1. Navigate to `/user-management`
2. Find the user in the table
3. In the "Custom Role" column, select a role from dropdown
4. Role is assigned immediately
5. User will only see permitted forms on next login/refresh

**Note:** Only regular users (account_type: "user") can be assigned custom roles. Super Admins and Company Admins have full access by default.

### Deleting Roles

1. In `/role-management`, click the **×** button on a role
2. Confirm deletion
3. Users assigned to this role will lose their role (set to NULL)
4. They will no longer see any forms until reassigned

---

## 👤 For Regular Users

### What You'll See

- **Navigation Menu**: Only forms you have "View" permission for
- **Dashboard**: Only your permitted forms
- **Form Actions**:
  - Create button: Only if you have "Create" permission
  - Edit button: Only if you have "Edit" permission
  - Delete button: Only if you have "Delete" permission

### If You Don't See Any Forms

Your administrator hasn't assigned you a role yet. Contact them to:
1. Create a role that fits your job
2. Assign relevant forms to that role
3. Assign the role to your user account

---

## 🔒 Security & Isolation

### Company Isolation
- Each company's roles are completely isolated
- Company A cannot see Company B's roles
- Super Admins can see all data across companies

### Permission Enforcement
- Database-level Row Level Security (RLS)
- API checks permissions before allowing actions
- Frontend hides unavailable options
- Attempts to bypass UI are blocked by database

### Admin Hierarchy
```
Super Admin (role: super_admin)
  └─ Full access to all companies and features
     └─ Can create/manage companies
        └─ Can view all data

Company Admin (role: company_admin)
  └─ Full access within their company
     └─ Can create/manage custom roles
        └─ Can assign roles to users
           └─ Can view all company submissions

Regular User (role: user)
  └─ Access only to assigned forms
     └─ Actions limited by role permissions
        └─ Cannot see admin pages
           └─ Cannot manage roles or users
```

---

## 📊 Common Scenarios

### Scenario 1: Sales Team
```
Role: Sales Representative
Permissions:
  - RFQ Form: View, Create (can submit quotes)
  - Client DB: View only (read-only access)
  - Dashboard: View (can see team metrics)

Result: Sales reps can submit quotes but not modify existing ones
```

### Scenario 2: Drivers/Field Workers
```
Role: Field Technician
Permissions:
  - Work Orders: View, Create, Edit
  - Equipment Checklist: View, Create
  - Reports: Create only

Result: Field workers can manage their work orders and create reports
```

### Scenario 3: Accounting Department
```
Role: Accountant
Permissions:
  - Invoices: View, Create, Edit, Delete
  - Expense Reports: View, Create, Edit
  - Financial Reports: View only

Result: Full invoice management, limited expense editing
```

### Scenario 4: Managers/Supervisors
```
Role: Department Manager
Permissions:
  - All Forms: View, Create, Edit, Delete

Result: Full access similar to Company Admin but no role management
```

---

## 🛠️ Troubleshooting

### User Can't See Any Forms
**Cause:** No role assigned
**Fix:** 
1. Go to `/user-management`
2. Assign appropriate role to user
3. Ask user to refresh page

### User Sees Forms But Can't Create/Edit
**Cause:** Role has View permission only
**Fix:**
1. Go to `/role-management`
2. Click on user's role
3. Check additional permissions (Create/Edit)

### Changes Not Reflecting
**Cause:** Browser cache
**Fix:** Ask user to:
1. Refresh page (Ctrl+R or Cmd+R)
2. Or clear browser cache
3. Or log out and log back in

### "Permission Denied" Errors
**Cause:** RLS policy blocking action
**Fix:**
1. Check user's role assignment
2. Verify role has correct permissions
3. Check database RLS policies in Supabase

### Can't Create Roles
**Cause:** Not a Company Admin
**Fix:** Must be company_admin or super_admin account type

---

## 💡 Best Practices

### Role Naming
- ✅ Use clear, descriptive names: "Sales Manager", "Warehouse Staff"
- ✅ Match your org structure: "Junior Designer", "Senior Engineer"
- ❌ Avoid: "Role1", "Test", "User"

### Permission Strategy
- **Principle of Least Privilege**: Give minimum permissions needed
- **Start Restrictive**: Easy to add permissions later
- **Group by Function**: Similar roles should have similar permissions
- **Regular Reviews**: Audit permissions quarterly

### User Assignment
- Assign roles during onboarding
- Review role assignments when job duties change
- Remove/change roles when employees leave
- Document role-to-job-title mapping

### Testing New Roles
1. Create test user account
2. Assign new role
3. Log in as test user
4. Verify expected behavior
5. Adjust permissions as needed

---

## 🔗 Related Documentation

- **Full Implementation Guide**: `CUSTOM_ROLES_IMPLEMENTATION.md`
- **Database Schema**: `database-migration-custom-roles.sql`
- **Main Project Docs**: `PROJECT_DOCUMENTATION.md`

---

## 📞 Support Checklist

Before asking for help:
- [ ] Database migration applied successfully
- [ ] User has correct account_type (check user_profiles table)
- [ ] Role has been created
- [ ] Forms are assigned to role with correct permissions
- [ ] Role is assigned to user
- [ ] User has refreshed their browser
- [ ] No console errors in browser (F12)
- [ ] Supabase logs checked for errors

---

## ✅ Quick Checklist

**For Admins Setting Up:**
- [ ] Database migration completed
- [ ] System form types seeded (RFQ, RQR)
- [ ] At least one custom role created
- [ ] Forms assigned to role
- [ ] Test user assigned role
- [ ] Verified user can see forms

**For Users:**
- [ ] Account created and activated
- [ ] Role assigned by administrator
- [ ] Can see forms in navigation
- [ ] Can perform expected actions (create/edit/delete)
- [ ] Cannot perform restricted actions

---

## 🎯 Key Takeaways

1. **Flexible**: Create any role name that matches your organization
2. **Granular**: Four permission types per form (View, Create, Edit, Delete)
3. **Secure**: Database-enforced permissions with RLS
4. **Simple**: Clear UI for managing roles and users
5. **Isolated**: Companies cannot see each other's data
6. **Production-Ready**: Full error handling and validation

---

## 🚨 Common Mistakes to Avoid

❌ **Forgetting to assign "View" permission**
   → User won't see form at all

❌ **Assigning role but no forms to role**
   → User sees nothing

❌ **Creating role but not assigning to users**
   → Role exists but unused

❌ **Not refreshing after changes**
   → Appears broken but just needs refresh

❌ **Trying to assign role to admins**
   → Admins have full access, don't need roles

---

Need more help? Check the full implementation docs or database logs!
