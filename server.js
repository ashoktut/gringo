const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory storage for development
let submissions = [];
let templates = [];
let users = [];

// API Routes

// Form Submissions
app.post('/api/submissions', (req, res) => {
  console.log('📝 Form submission received:', {
    timestamp: new Date().toISOString(),
    formType: req.body.formType,
    companyId: req.body.companyId,
    dataSize: JSON.stringify(req.body).length
  });

  const submission = {
    id: Date.now().toString(),
    ...req.body,
    receivedAt: new Date().toISOString(),
    status: 'received'
  };

  submissions.push(submission);

  // Simulate processing delay
  setTimeout(() => {
    res.json({
      success: true,
      id: submission.id,
      message: 'Form submission received successfully',
      timestamp: submission.receivedAt
    });
  }, 100);
});

app.get('/api/submissions', (req, res) => {
  res.json({
    success: true,
    submissions: submissions.slice(-50), // Return last 50 submissions
    total: submissions.length
  });
});

app.get('/api/submissions/:id', (req, res) => {
  const submission = submissions.find(s => s.id === req.params.id);
  if (submission) {
    res.json({ success: true, submission });
  } else {
    res.status(404).json({ success: false, message: 'Submission not found' });
  }
});

// Templates
app.get('/api/templates', (req, res) => {
  res.json({
    success: true,
    templates: templates
  });
});

app.post('/api/templates', (req, res) => {
  const template = {
    id: Date.now().toString(),
    ...req.body,
    createdAt: new Date().toISOString()
  };
  templates.push(template);
  res.json({ success: true, template });
});

// Email endpoints
app.post('/api/email/send', (req, res) => {
  console.log('📧 Email send request:', {
    to: req.body.to,
    subject: req.body.subject,
    type: req.body.type
  });

  res.json({
    success: true,
    messageId: `msg_${Date.now()}`,
    status: 'sent'
  });
});

// File upload endpoints
app.post('/api/upload', (req, res) => {
  console.log('📁 File upload request:', {
    files: req.body.files?.length || 0,
    totalSize: JSON.stringify(req.body).length
  });

  res.json({
    success: true,
    files: req.body.files?.map((file, index) => ({
      id: `file_${Date.now()}_${index}`,
      originalName: file.name || `file_${index}`,
      url: `/uploads/${Date.now()}_${index}`,
      size: file.size || 0
    })) || []
  });
});

// Sync endpoints for offline functionality
app.post('/api/sync/batch', (req, res) => {
  console.log('🔄 Batch sync request:', {
    items: req.body.items?.length || 0
  });

  const results = req.body.items?.map(item => ({
    id: item.id,
    status: 'synced',
    timestamp: new Date().toISOString()
  })) || [];

  res.json({
    success: true,
    results
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    stats: {
      submissions: submissions.length,
      templates: templates.length
    }
  });
});

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login attempt:', {
    email: req.body.email,
    companyDomain: req.body.companyDomain
  });

  const { email, password, companyDomain } = req.body;

  // Mock authentication logic
  if (email && password) {
    const mockUser = {
      id: '1',
      email: email,
      firstName: 'John',
      lastName: 'Doe',
      companyId: 'company1',
      roles: [
        {
          id: 'role1',
          name: 'company_admin',
          displayName: 'Company Administrator',
          description: 'Full access to company resources',
          companyId: 'company1',
          permissions: [],
          isSystem: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockCompany = {
      id: 'company1',
      name: 'Demo Company',
      domain: companyDomain || 'demo.com',
      isActive: true,
      subscription: {
        plan: 'premium',
        status: 'active',
        startDate: new Date(),
        maxUsers: 100,
        maxForms: 1000,
        maxStorage: 10,
        features: ['formBuilder', 'pdfGeneration', 'emailIntegration']
      },
      settings: {
        allowSelfRegistration: true,
        requireEmailVerification: false,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false,
          passwordHistory: 5,
          maxAge: 90
        },
        sessionTimeout: 1440,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        defaultUserRole: 'user',
        timezone: 'UTC',
        dateFormat: 'DD/MM/YYYY',
        language: 'en'
      },
      branding: {
        primaryColor: '#1976d2',
        secondaryColor: '#dc004e',
        loginBackgroundImage: ''
      },
      features: {
        formBuilder: true,
        pdfGeneration: true,
        emailIntegration: true,
        offlineSync: true,
        advancedReporting: false,
        apiAccess: true,
        customBranding: false,
        multiLanguage: false,
        digitalSignature: true,
        geoLocation: true
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      adminUserId: '1',
      maxUsers: 100,
      currentUserCount: 1
    };

    const mockPermissions = [
      'users:manage',
      'forms:manage',
      'forms:create',
      'forms:read',
      'forms:update',
      'forms:delete',
      'templates:manage',
      'reports:read'
    ];

    res.json({
      success: true,
      data: {
        token: `mock_jwt_token_${Date.now()}`,
        refreshToken: `mock_refresh_token_${Date.now()}`,
        user: mockUser,
        company: mockCompany,
        permissions: mockPermissions,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  console.log('📝 Registration attempt:', req.body.email);

  // Mock registration success
  res.json({
    success: true,
    data: {
      token: `mock_jwt_token_${Date.now()}`,
      refreshToken: `mock_refresh_token_${Date.now()}`,
      user: {
        id: '2',
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        companyId: 'company1',
        roles: [{
          id: 'role2',
          name: 'user',
          displayName: 'User',
          description: 'Standard user access',
          companyId: 'company1',
          permissions: [],
          isSystem: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      company: {
        id: 'company1',
        name: 'Demo Company',
        domain: 'demo.com',
        isActive: true
      },
      permissions: ['forms:create', 'forms:read'],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  console.log('👋 Logout request');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/api/auth/refresh', (req, res) => {
  console.log('🔄 Token refresh request');
  res.json({
    success: true,
    data: {
      token: `mock_jwt_token_${Date.now()}`,
      refreshToken: `mock_refresh_token_${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });
});

app.get('/api/auth/permissions', (req, res) => {
  res.json({
    success: true,
    data: [
      'users:manage',
      'forms:manage',
      'forms:create',
      'forms:read',
      'forms:update',
      'forms:delete',
      'templates:manage',
      'reports:read'
    ]
  });
});

// Companies endpoints
app.get('/api/companies/active', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'company1',
        name: 'Demo Company',
        domain: 'demo.com',
        isActive: true
      },
      {
        id: 'company2',
        name: 'Test Corp',
        domain: 'testcorp.com',
        isActive: true
      }
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.path}`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock API server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📝 Ready to handle form submissions at http://localhost:${PORT}/api/submissions`);
});

module.exports = app;
