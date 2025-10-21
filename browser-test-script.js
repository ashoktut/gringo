// Quick Service Integration Test
// Run this in the browser console to test core functionality

console.log('🧪 Testing Multi-Tenant Template Management System...');

// Test 1: Check if services are available
console.log('\n📋 Test 1: Service Availability');
try {
  const userMgmtService = window.ng?.getAllComponents?.(document.querySelector('app-root'))?.find(c => c.userManagementService)?.userManagementService;
  const authBridgeService = window.ng?.getAllComponents?.(document.querySelector('app-root'))?.find(c => c.authBridge)?.authBridge;

  console.log('✅ UserManagementService:', !!userMgmtService);
  console.log('✅ AuthBridgeService:', !!authBridgeService);
} catch (error) {
  console.log('⚠️ Service availability test failed:', error.message);
}

// Test 2: Check default data initialization
console.log('\n📋 Test 2: Default Data');
try {
  // Check if default companies exist
  const companies = JSON.parse(localStorage.getItem('app-companies') || '[]');
  console.log('✅ Default Companies:', companies.length, 'companies loaded');
  companies.forEach(company => {
    console.log(`  - ${company.name} (${company.code})`);
  });

  // Check if default users exist
  const users = JSON.parse(localStorage.getItem('app-users') || '[]');
  console.log('✅ Default Users:', users.length, 'users loaded');
  users.forEach(user => {
    console.log(`  - ${user.email} (${user.role})`);
  });

} catch (error) {
  console.log('⚠️ Default data test failed:', error.message);
}

// Test 3: Authentication State
console.log('\n📋 Test 3: Authentication');
try {
  const session = JSON.parse(localStorage.getItem('user-session') || 'null');
  if (session) {
    console.log('✅ Active Session Found');
    console.log(`  - User: ${session.user?.email} (${session.user?.role})`);
    console.log(`  - Company: ${session.company?.name || 'None'}`);
  } else {
    console.log('ℹ️ No active session (not logged in)');
  }
} catch (error) {
  console.log('⚠️ Authentication test failed:', error.message);
}

// Test 4: Template Storage
console.log('\n📋 Test 4: Template Storage');
try {
  const templates = JSON.parse(localStorage.getItem('templates') || '[]');
  console.log('✅ Templates in Storage:', templates.length);

  const assignedTemplates = templates.filter(t => t.assignedCompanies?.length > 0);
  const universalTemplates = templates.filter(t => t.isUniversal);

  console.log(`  - Assigned Templates: ${assignedTemplates.length}`);
  console.log(`  - Universal Templates: ${universalTemplates.length}`);
} catch (error) {
  console.log('⚠️ Template storage test failed:', error.message);
}

// Test 5: Service Methods (if logged in)
console.log('\n📋 Test 5: Service Methods');
try {
  // This would need to be tested when services are properly injected
  console.log('ℹ️ Service method testing requires proper component injection');
  console.log('ℹ️ Use the component-specific tests in the testing guide');
} catch (error) {
  console.log('⚠️ Service method test failed:', error.message);
}

console.log('\n🎯 Testing Complete! Check results above.');
console.log('📖 For detailed testing, follow the TESTING_GUIDE.md');
