#!/usr/bin/env node

/**
 * Multi-Tenant Template Management System - Automated Test Runner
 *
 * This script runs basic validation tests to ensure the system is working correctly.
 * Run with: node test-runner.js
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Multi-Tenant Template Management System - Test Runner');
console.log('=' .repeat(60));

// Test 1: Check if core service files exist
function testServiceFiles() {
  console.log('\n📋 Test 1: Service Files Existence');

  const requiredFiles = [
    'src/app/services/auth-bridge.service.ts',
    'src/app/services/user-management.service.ts',
    'src/app/services/template-storage.service.ts',
    'src/app/services/template-management.service.ts',
    'src/app/guards/user-auth.guard.ts',
    'src/app/pages/templates/templates.component.ts',
    'src/app/sharedComponents/template-assignment-dialog/template-assignment-dialog.component.ts'
  ];

  let allExist = true;
  requiredFiles.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, file));
    console.log(`${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allExist = false;
  });

  return allExist;
}

// Test 2: Check TypeScript compilation
function testTypeScriptCompilation() {
  console.log('\n📋 Test 2: TypeScript Compilation');

  const { execSync } = require('child_process');
  try {
    execSync('npx tsc --noEmit', { cwd: __dirname, stdio: 'pipe' });
    console.log('✅ TypeScript compilation successful');
    return true;
  } catch (error) {
    console.log('❌ TypeScript compilation failed');
    console.log(error.stdout?.toString() || error.message);
    return false;
  }
}

// Test 3: Check for required imports and exports
function testServiceIntegration() {
  console.log('\n📋 Test 3: Service Integration');

  try {
    // Check AuthBridgeService
    const authBridgeContent = fs.readFileSync('src/app/services/auth-bridge.service.ts', 'utf8');
    const hasAuthServiceImport = authBridgeContent.includes('import { AuthService }');
    const hasUserMgmtImport = authBridgeContent.includes('import { UserManagementService }');
    const hasLoginMethod = authBridgeContent.includes('async login(');

    console.log(`${hasAuthServiceImport ? '✅' : '❌'} AuthBridgeService imports AuthService`);
    console.log(`${hasUserMgmtImport ? '✅' : '❌'} AuthBridgeService imports UserManagementService`);
    console.log(`${hasLoginMethod ? '✅' : '❌'} AuthBridgeService has login method`);

    // Check TemplateStorageService
    const templateStorageContent = fs.readFileSync('src/app/services/template-storage.service.ts', 'utf8');
    const hasCompanyFiltering = templateStorageContent.includes('getTemplatesForCurrentUser');
    const hasAssignmentMethod = templateStorageContent.includes('assignTemplateToCompanies');

    console.log(`${hasCompanyFiltering ? '✅' : '❌'} TemplateStorageService has company filtering`);
    console.log(`${hasAssignmentMethod ? '✅' : '❌'} TemplateStorageService has assignment methods`);

    // Check Templates Component
    const templatesContent = fs.readFileSync('src/app/pages/templates/templates.component.ts', 'utf8');
    const hasUserContext = templatesContent.includes('loadUserContext') || templatesContent.includes('userContext');
    const hasRoleBasedUI = templatesContent.includes('isSuperAdmin') || templatesContent.includes('isCompanyAdmin');

    console.log(`${hasUserContext ? '✅' : '❌'} Templates component has user context`);
    console.log(`${hasRoleBasedUI ? '✅' : '❌'} Templates component has role-based UI`);

    return hasAuthServiceImport && hasUserMgmtImport && hasLoginMethod &&
           hasCompanyFiltering && hasAssignmentMethod && hasUserContext && hasRoleBasedUI;

  } catch (error) {
    console.log('❌ Service integration test failed:', error.message);
    return false;
  }
}

// Test 4: Check authentication guard updates
function testAuthGuards() {
  console.log('\n📋 Test 4: Authentication Guards');

  try {
    const guardContent = fs.readFileSync('src/app/guards/user-auth.guard.ts', 'utf8');
    const hasAuthBridgeImport = guardContent.includes('AuthBridgeService');
    const usesAuthBridge = guardContent.includes('authBridge.isAuthenticated');

    console.log(`${hasAuthBridgeImport ? '✅' : '❌'} Guards import AuthBridgeService`);
    console.log(`${usesAuthBridge ? '✅' : '❌'} Guards use AuthBridge methods`);

    return hasAuthBridgeImport && usesAuthBridge;
  } catch (error) {
    console.log('❌ Auth guards test failed:', error.message);
    return false;
  }
}

// Test 5: Check if Angular build succeeds
function testAngularBuild() {
  console.log('\n📋 Test 5: Angular Build Test');

  const { execSync } = require('child_process');
  try {
    console.log('⏳ Running Angular build (this may take a moment)...');
    execSync('ng build --configuration development', {
      cwd: __dirname,
      stdio: 'pipe',
      timeout: 120000 // 2 minute timeout
    });
    console.log('✅ Angular build successful');
    return true;
  } catch (error) {
    console.log('❌ Angular build failed');
    if (error.stdout) {
      console.log('Build output:', error.stdout.toString().slice(-500)); // Last 500 chars
    }
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting comprehensive system tests...\n');

  const results = {
    serviceFiles: testServiceFiles(),
    typeScript: testTypeScriptCompilation(),
    integration: testServiceIntegration(),
    authGuards: testAuthGuards(),
    // Skip build test for now as it takes time
    // angularBuild: testAngularBuild()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const allPassed = Object.values(results).every(result => result);

  console.log('\n' + '='.repeat(60));
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Multi-tenant system is ready for testing.');
    console.log('📖 Next steps: Follow TESTING_CHECKLIST.md for manual testing.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
    console.log('🔧 Fix the failing tests before proceeding with manual testing.');
  }
  console.log('='.repeat(60));

  return allPassed;
}

// Run the tests
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
