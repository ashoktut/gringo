# Multi-Tenant Template Management System - Testing Guide

## 🎯 **How to Test the New Multi-Tenant Features**

### **Prerequisites**

- Application is running on `http://localhost:4200`
- Browser developer tools open (F12) to monitor console logs
- Multiple browser tabs/windows for testing different user roles

---

## **Test Scenario 1: Authentication Flow**

### **Test the Login System**

1. **Navigate to:** `http://localhost:4200`
2. **Expected:** Should redirect to `/login` page
3. **Test Login Form:**
   - Try entering different email addresses
   - Check if company domain suggestion works
   - Verify password visibility toggle
   - Test form validation (required fields, email format)

### **Expected Console Logs:**

``
Bridge login initiated for: user@company.com
AuthService authentication successful
UserManagementService session synchronized
Navigation to dashboard/home
``

--

## **Test Scenario 2: Super Admin Features**

### **Login as Super Admin**

1. **Use Credentials:** (These are created by default in UserManagementService)
   - Email: `super@admin.com`
   - Password: `password123`
   - Role: `super-admin`

2. **Navigate to Templates Page:** `/templates`

### **Expected Super Admin Features:**

- ✅ **See ALL templates** from all companies
- ✅ **Template Assignment Button** visible
- ✅ **User Context Display** shows "Super Admin" role
- ✅ **Company Filter** shows "All Companies"
- ✅ **Assignment Dialog** opens when clicking assign button

### **Test Template Assignment:**

1. Click "Assign to Companies" button on any template
2. **Expected Dialog Features:**
   - List of available companies with checkboxes
   - "Select All" / "Deselect All" buttons
   - Preview of selected companies
   - Save/Cancel buttons
3. Select companies and save
4. **Verify:** Template now shows assigned companies in the list

---

## **Test Scenario 3: Company Admin Features**

### **Login as Company Admin**

1. **Use Credentials:**
   - Email: `admin@company1.com`
   - Password: `password123`
   - Role: `company-admin`
   - Company: `Company 1`

2. **Navigate to Templates Page:** `/templates`

### **Expected Company Admin Features:**

- ✅ **See ONLY company templates** + universal templates
- ✅ **NO Assignment Button** (hidden for company admins)
- ✅ **User Context Display** shows company name and role
- ✅ **Company Filter** shows current company only
- ✅ **Template Creation** works with company context

### **Test Template Filtering:**

1. **Compare with Super Admin view:** Should see fewer templates
2. **Check template list:** Should only include:
   - Templates assigned to current company
   - Universal templates (isUniversal: true)
   - Templates created by current company

---

## **Test Scenario 4: PDF Generation Integration**

### **Test Form Submission with Company Templates**

1. **Login as Company Admin** (`admin@company1.com`)

2. **Navigate to Submissions:** `/submissions`

3. **Create New Submission:**
   - Fill out form data
   - **Click "Generate PDF"**

4. **Expected Behavior:**
   - Template dropdown shows ONLY company-appropriate templates
   - No templates from other companies visible
   - PDF generation uses correct company template

### **Test with Different Companies:**

1. **Login as Company 2 Admin:** `admin@company2.com`
2. **Repeat PDF generation**
3. **Verify:** Different set of templates available

---

## **Test Scenario 5: Role-Based UI Elements**

### **Navigation and Menu Testing**

**As Super Admin:**

- ✅ Can access `/admin/templates`
- ✅ Can access all management features
- ✅ Template assignment options visible

**As Company Admin:**

- ✅ Can access `/templates` (company-filtered)
- ✅ Cannot access super-admin routes
- ✅ Assignment options hidden

**As Regular User:**

- ✅ Limited template access
- ✅ Form submission with filtered templates
- ✅ No admin features visible

---

## **Test Scenario 6: Data Persistence**

### **Test Session Management**

1. **Login and set up data**
2. **Refresh browser**
3. **Expected:** User remains logged in with correct context
4. **Open new tab:** Should maintain same session
5. **Logout and login as different user:** Should show different data

---

## **Test Scenario 7: Error Handling**

### **Test Edge Cases**

1. **Invalid Login Credentials**
   - Should show error message
   - Should not break application

2. **Unauthorized Access**
   - Try accessing super-admin routes as company admin
   - Should redirect or show access denied

3. **Missing Company Context**
   - Test what happens with users without company assignment

---

## **🔍 Browser Console Testing Commands**

Open browser console (F12) and test service methods directly:

### **Check Current User:**

```javascript
// Get current authentication state
const authBridge = window.ng?.getComponent?.(document.querySelector('app-root'))?.['authBridge'];
console.log('Current User:', authBridge?.getCurrentUser());
console.log('Current Company:', authBridge?.getCurrentCompany());
console.log('Is Super Admin:', authBridge?.isSuperAdmin());
console.log('Is Company Admin:', authBridge?.isCompanyAdmin());
```

**Test Template Filtering:**

```javascript
// Check template access
const templateService = window.ng?.getComponent?.(document.querySelector('app-root'))?.['templateService'];
templateService?.getTemplatesForCurrentUser().subscribe(templates => {
  console.log('User Templates:', templates);
});
```

---

## **📊 Expected Test Results**

### **Super Admin Session:**

- Can see ALL templates across companies
- Can assign templates to companies
- Has access to all administrative features
- Can switch between company contexts

### **Company Admin Session:**

- Sees only assigned company templates
- Cannot assign templates to other companies
- Limited to company-specific features
- Cannot access other companies' data

### **Regular User Session:**

- Basic template access for their company
- Form submission with appropriate templates
- No administrative capabilities
- PDF generation with correct company templates

---

## **🚨 Common Issues to Check**

1. **Templates not filtering correctly** - Check user company assignment
2. **Assignment dialog not working** - Verify super-admin permissions
3. **PDF generation fails** - Check template availability for company
4. **Authentication errors** - Verify AuthBridgeService integration
5. **Route access denied** - Check authentication guards

---

## **✅ Success Criteria**

**✓ Authentication:** Users can login and maintain sessions
**✓ Role-based Access:** Different features for different roles
**✓ Template Filtering:** Company-appropriate template visibility
**✓ Assignment Management:** Super-admins can assign templates
**✓ PDF Integration:** Form submissions use correct templates
**✓ Data Persistence:** Sessions and assignments persist
**✓ Error Handling:** Graceful handling of edge cases

---

This comprehensive testing approach will validate all aspects of the multi-tenant template management system!
