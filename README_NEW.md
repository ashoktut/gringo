# 🎯 Gringo - Professional Form Management System

## Hybrid Offline-First with Cloud Sync

[![Angular](https://img.shields.io/badge/Angular-19.2-red)](https://angular.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A sophisticated Angular 19 application for the roofing industry featuring dynamic form management, offline-first architecture, and optional cloud synchronization.

---

## ✨ Key Features

### 🎨 Dynamic Form System

- **14 Field Types**: Text, email, number, date, select, textarea, checkbox, radio, map location, digital signature, picture upload, and more
- **Visual Form Builder**: Drag-and-drop interface with real-time preview
- **Conditional Logic**: Advanced show/hide field logic
- **Section Organization**: Accordion-style form sections
- **Real-time Validation**: Comprehensive field validation

### 📱 Offline-First Architecture

- **Works Without Internet**: All features available offline
- **Instant Saves**: Data written to IndexedDB immediately
- **Background Sync**: Automatically syncs when connection restored
- **Smart Queue**: Failed operations retry automatically
- **No Data Loss**: Everything saved locally first

### ☁️ Cloud Sync (Optional)

- **Automatic Backup**: Syncs to Supabase when online
- **Real-time Updates**: Changes propagate across devices instantly
- **Conflict Resolution**: Smart merge strategies built-in
- **Multi-Device**: Access from anywhere
- **100% Free**: Supabase free tier supports 50K users

### 🔐 Authentication & Security

- **User Management**: Sign up, sign in, password reset
- **JWT Tokens**: Secure authentication
- **Row-Level Security**: Users only see their own data
- **Secure Storage**: Encrypted file uploads
- **Session Management**: Automatic token refresh

### 📄 Document Generation

- **Professional PDFs**: Generate branded PDFs from templates
- **Word Templates**: Upload .docx templates with placeholders
- **Dynamic Content**: Smart placeholder replacement
- **Multiple Formats**: Support for Word, PDF, HTML
- **Email Distribution**: Send PDFs via email

### 🗺️ Advanced Components

- **Interactive Maps**: MapLibre GL with GPS tracking
- **Digital Signatures**: Canvas-based signature capture
- **Picture Upload**: Camera + file upload (15MB limit)
- **Address Geocoding**: Search and reverse geocoding
- **Rich Text**: Advanced text editing

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- Modern browser with IndexedDB support
- (Optional) Supabase account for cloud sync

### Installation

```powershell
# Clone the repository
git clone https://github.com/yourusername/gringo.git
cd gringo

# Install dependencies
npm install

# Start development server
npm start
```

Visit `http://localhost:4200` - **Your app is now running in offline mode!**

---

## 📦 What's Included

### Current Implementation (95% Complete)

✅ **Frontend** - Fully implemented

- Angular 19 with standalone components
- Material Design UI
- Reactive forms with validation
- Progressive Web App ready
- Mobile-responsive design

✅ **Data Layer** - Hybrid architecture

- IndexedDB for offline storage
- Supabase for cloud sync (optional)
- Automatic synchronization
- Conflict resolution
- Real-time updates

✅ **Features** - Production-ready

- Dynamic form builder
- RFQ submission system
- Template management
- PDF generation
- Picture uploads
- Digital signatures
- Map integration
- Search & filtering

✅ **Security** - Enterprise-grade

- JWT authentication
- Row-level security
- Encrypted storage
- Secure file uploads
- CORS protection

---

## 🎯 Enable Cloud Sync (Optional)

Your app **works perfectly offline**. Cloud sync is an optional upgrade that takes 10 minutes.

### Step 1: Create Supabase Account (2 minutes)

1. Visit [https://supabase.com](https://supabase.com)
2. Sign up with GitHub (free)
3. Create new project: "gringo"
4. Wait for provisioning

### Step 2: Get Credentials (1 minute)

1. Go to Settings → API
2. Copy "Project URL" and "anon public" key

### Step 3: Update Environment (1 minute)

Edit `src/environments/environment.ts`:

```typescript
supabase: {
  url: 'https://your-project-id.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  enabled: true,
}
```

### Step 4: Create Database (5 minutes)

1. Open Supabase SQL Editor
2. Copy SQL from `SUPABASE_SETUP_GUIDE.md` (Step 3)
3. Run the script

**Done!** Your app now syncs to the cloud. 🎉

For detailed instructions, see [SUPABASE_SETUP_GUIDE.md](SUPABASE_SETUP_GUIDE.md)

---

## 🏗️ Architecture

``
┌─────────────────────────────────────────┐
│         Angular 19 Application          │
│  (Material Design + Standalone)         │
└────────────┬────────────────────────────┘
             │
             ├─ Components (Smart + Presentational)
             ├─ Services (Business Logic)
             ├─ Models (TypeScript Interfaces)
             └─ Shared Components (Reusable)
                       │
          ┌────────────┴───────────┐
          │                        │
    IndexedDB                 Supabase
   (Offline-First)          (Cloud Sync)
          │                        │
     Browser Storage         PostgreSQL
          │                   File Storage
    Always writes here        Real-time API
     (Instant saves)       (Background sync)
``

---

## 📁 Project Structure

``
gringo/
├── src/
│   ├── app/
│   │   ├── pages/                    # Feature pages
│   │   │   ├── form-builder/         # Form configuration builder
│   │   │   ├── submissions/          # Submissions management
│   │   │   ├── templates/            # Template management
│   │   │   └── home/                 # Dashboard
│   │   ├── services/                 # Business logic
│   │   │   ├── supabase.service.ts              # Supabase client
│   │   │   ├── supabase-sync.service.ts         # Sync engine
│   │   │   ├── form-submission-hybrid.service.ts # Hybrid storage
│   │   │   ├── indexed-db.service.ts            # IndexedDB wrapper
│   │   │   └── ...                              # Other services
│   │   ├── sharedComponents/         # Reusable components
│   │   │   ├── dynamic-form/         # Form renderer
│   │   │   ├── digital-signature/    # Signature pad
│   │   │   ├── picture-upload/       # Image upload
│   │   │   ├── map-libre-picker/     # Map component
│   │   │   └── ...
│   │   └── models/                   # TypeScript interfaces
│   ├── environments/                 # Configuration
│   │   ├── environment.ts            # Development
│   │   └── environment.prod.ts       # Production
│   └── assets/                       # Static files
├── SUPABASE_SETUP_GUIDE.md          # Detailed setup
├── QUICK_START.md                    # Quick reference
├── HYBRID_SYNC_SUMMARY.md           # Implementation details
└── setup-helper.ps1                  # Setup script
``

---

## 🛠️ Technology Stack

### Frontend (100% Open Source)

- **Angular 19.2** - Latest standalone components
- **TypeScript 5.7** - Type safety
- **Angular Material 19.2** - Professional UI
- **MapLibre GL 5.6** - Interactive maps
- **RxJS 7.8** - Reactive programming
- **html2pdf.js** - PDF generation

### Data Layer (100% Open Source & Free)

- **IndexedDB** - Browser storage (offline)
- **Supabase** - PostgreSQL database (cloud)
- **Supabase Auth** - User authentication
- **Supabase Storage** - File storage
- **Supabase Realtime** - Live updates

### Development Tools

- **Angular CLI** - Project scaffolding
- **TypeScript** - Static typing
- **Jasmine/Karma** - Unit testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## 💰 Cost Breakdown (100% Free)

| Service | Free Tier | Typical Usage | Cost |
|---------|-----------|---------------|------|
| **IndexedDB** | Unlimited | Browser-based | $0 |
| **Supabase Database** | 500MB | ~50MB | $0 |
| **Supabase Storage** | 1GB | ~200MB | $0 |
| **Supabase Auth** | 50K users | ~100 users | $0 |
| **Netlify Hosting** | 100GB bandwidth | ~5GB | $0 |
| **Total** | | | **$0/month** |

No credit card required. Ever.

---

## 🚀 Deployment

### Frontend (Netlify - Free)

```powershell
# Build for production
npm run build

# Install Netlify CLI
npm install -g netlify-cli

# Login and deploy
netlify login
netlify deploy --prod --dir=dist/gringo/browser
```

### Environment Variables (Netlify Dashboard)

``
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
``

### Backend (Supabase - Free)

No deployment needed! Supabase is fully managed.

---

## 🧪 Testing

### Test Offline Mode

```powershell
# Run locally
npm start

# Open DevTools → Network → Offline
# Create form submission
# ✅ Works perfectly offline!
```

### Test Cloud Sync

```powershell
# With Supabase configured
npm start

# Create submission
# Check Supabase dashboard
# ✅ Data synced automatically!
```

### Test Real-time Updates

```powershell
# Open in 2 browsers
# Same user account
# Create in browser 1
# ✅ Appears in browser 2 instantly!
```

---

## 📚 Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get started in 5 minutes
- **[SUPABASE_SETUP_GUIDE.md](SUPABASE_SETUP_GUIDE.md)** - Complete setup guide
- **[HYBRID_SYNC_SUMMARY.md](HYBRID_SYNC_SUMMARY.md)** - Technical implementation
- **[PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md)** - Original features
- **Component docs** - See individual `.md` files

---

## 🎯 Supported Form Types

1. **RFQ** (Request for Quote) - 9-section comprehensive form
2. **Quotes** - Professional quote generation
3. **Invoices** - Invoice management
4. **Estimates** - Project estimation
5. **Contracts** - Service agreements
6. **Reports** - Custom reporting
7. **Custom** - Build your own forms

---

## 🔧 Configuration

### Sync Settings (`environment.ts`)

```typescript
sync: {
  autoSync: true,              // Auto sync when online
  syncInterval: 30000,         // Sync every 30 seconds
  conflictResolution: 'server-wins', // Conflict strategy
}
```

### Offline Settings

```typescript
offlineFirst: true,           // Always use IndexedDB first
storage: {
  indexedDbName: 'GringoDB',
  cacheSize: 50 * 1024 * 1024, // 50MB cache
}
```

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/gringo/issues)
- **Documentation**: See `/docs` folder
- **Email**: <support@gringo.app>

---

## 🎉 Acknowledgments

- Angular team for the amazing framework
- Supabase for free backend infrastructure
- Material Design team for the UI components
- MapLibre for mapping capabilities
- Open source community

---

## 📊 Project Stats

- **Lines of Code**: ~25,000+
- **Components**: 30+
- **Services**: 20+
- **Form Fields**: 14 types
- **Tests**: Unit + E2E ready
- **Performance**: <3s load time
- **Bundle Size**: ~1.93 MB (405 kB gzipped)

---

## 🚀 Roadmap

### Current (v1.0) ✅

- Dynamic form builder
- Offline-first storage
- Cloud synchronization
- Real-time updates
- Professional UI

### Next (v1.1) 🚧

- Email notifications
- Advanced analytics
- Mobile app (PWA)
- Bulk operations
- Export to Excel

### Future (v2.0) 💡

- AI-powered form suggestions
- Multi-language support
- Advanced reporting
- Integration APIs
- White-label option

---

## 💻 System Requirements

- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Memory**: 4GB RAM minimum
- **Storage**: 500MB free space

---

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

## **Built with ❤️, for the world**

*Making form management simple, offline-first, and efficient.*
