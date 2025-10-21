# 🧪 Multi-Tenant System Testing Checklist

## **Quick Start Testing Steps**

### **Step 1: Verify Application is Running** ✅

- Application should be running on `http://localhost:4200`
- No console errors on startup
- Login page should be displayed

### **Step 2: Test Default Data Initialization**

1. Open browser developer tools (F12)
2. Go to Application tab → Local Storage → `http://localhost:4200`
3. **Check for these keys:**
   - `app-users` - Should contain default users
   - `app-companies` - Should contain default companies  
   - `templates` - Should contain sample templates
   - `user-session` - May be empty if not logged in

### **Step 3: Test Super Admin Login**

1. **Credentials:**
   - Email: `super@admin.com`
   - Password: `password123`
2. **Expected Results:**
   - Successful login
   - Redirect to dashboard/home
   - Console shows bridge login success
   - `user-session` created in localStorage

### **Step 4: Test Super Admin Template Management**

1. Navigate to `/templates`
2. **Expected Features:**
   - ✅ User context shows "Super Admin"
   - ✅ Can see ALL templates
   - ✅ "Assign to Companies" button visible
   - ✅ Template list shows all companies' templates

3. **Test Assignment Dialog:**
   - Click "Assign to Companies" on any template
   - Dialog opens with company checkboxes
   - Select companies and save
   - Verify template now shows assigned companies

### **Step 5: Test Company Admin Access**

1. **Logout** (if login/logout available) or open new incognito window
2. **Login as Company Admin:**
   - Email: `admin@company1.com`  
   - Password: `password123`
3. **Navigate to `/templates`**
4. **Expected Results:**
   - ✅ User context shows company name
   - ✅ Only sees company-specific templates
   - ✅ NO "Assign to Companies" button
   - ✅ Fewer templates than Super Admin saw

### **Step 6: Test PDF Generation Integration**

1. **As Company Admin**, navigate to `/submissions`
2. **Test Form Submission:**
   - Fill out any form
   - Click "Generate PDF"
   - **Expected:** Template dropdown shows only company templates
   - PDF generation should work with company-appropriate template

### **Step 7: Test Role-Based Route Protection**

1. **As Company Admin**, try to access:
   - `/admin/templates` - Should be blocked or redirect
   - Super-admin only routes should be protected

### **Step 8: Test Session Persistence**

1. **Refresh the browser**
2. **Expected:** Should remain logged in with same context
3. **Open new tab** - Should maintain session
4. **Check localStorage** - Session data should persist

---

## **Browser Console Tests**

### **Test 1: Check Service Availability**

```javascript
// Paste this in browser console
console.log('Testing service availability...');
const components = window.ng?.getAllComponents?.(document.querySelector('app-root')) || [];
console.log('Available components:', components.length);
```

### **Test 2: Check Authentication State**

```javascript
// Check current auth state
const session = JSON.parse(localStorage.getItem('user-session') || 'null');
console.log('Current session:', session);
if (session) {
  console.log('User:', session.user?.email, session.user?.role);
  console.log('Company:', session.company?.name);
}
```

### **Test 3: Check Template Data**

```javascript
// Check template storage
const templates = JSON.parse(localStorage.getItem('templates') || '[]');
console.log('Total templates:', templates.length);
console.log('Assigned templates:', templates.filter(t => t.assignedCompanies?.length > 0).length);
console.log('Universal templates:', templates.filter(t => t.isUniversal).length);
```

---

## **Expected Behavior Summary**

### **✅ Super Admin Experience:**

- Sees ALL templates from all companies
- Can assign templates to companies
- Has access to all administrative features
- Template assignment dialog works
- Can manage company assignments

### **✅ Company Admin Experience:**  

- Sees only their company's templates + universal ones
- Cannot assign templates to other companies
- Template list is filtered by company
- PDF generation uses company-appropriate templates
- Cannot access super-admin features

### **✅ Authentication Integration:**

- AuthBridgeService synchronizes both auth systems
- Sessions persist across browser refreshes
- Role-based route protection works
- Login/logout affects both services

### **✅ PDF Generation Integration:**

- Form submissions show filtered template options
- PDF generation uses company-specific templates
- Template selection respects company context
- Generated PDFs use appropriate company branding/data

---

## **Common Issues & Solutions**

### **Issue: Templates not filtering**

- **Check:** User has correct company assignment
- **Check:** Templates have proper assignedCompanies array
- **Solution:** Verify session data in localStorage

### **Issue: Assignment dialog not showing**

- **Check:** User has super-admin role
- **Check:** AuthBridgeService is working
- **Solution:** Verify role-based UI conditions

### **Issue: PDF generation fails**

- **Check:** Company has assigned templates
- **Check:** Form type matches template formType
- **Solution:** Ensure template availability for company

### **Issue: Authentication not working**

- **Check:** AuthBridgeService integration
- **Check:** Both AuthService and UserManagementService
- **Solution:** Verify bridge synchronization in console

---

## **Success Indicators**

**🟢 All Working Correctly If:**

- ✅ Different users see different template sets
- ✅ Super admin can assign templates to companies  
- ✅ Company admins cannot access other companies' data
- ✅ PDF generation respects company context
- ✅ Authentication persists across sessions
- ✅ Role-based UI elements show/hide correctly
- ✅ No console errors during normal operation

**🔴 Issues Present If:**

- ❌ All users see all templates
- ❌ Assignment dialog doesn't work
- ❌ Company filtering not working
- ❌ PDF generation shows all templates
- ❌ Sessions don't persist
- ❌ Console shows authentication errors

---

Use this checklist to systematically test all the new multi-tenant features!
