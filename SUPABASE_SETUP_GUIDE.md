# Gringo Hybrid Sync Setup Guide

## 100% Free Stack: IndexedDB + Supabase

This guide will help you set up the hybrid offline-first sync system for your Gringo application.

## ✅ What's Implemented

Your application now has:

- **Offline-First Architecture**: All data writes to IndexedDB first
- **Automatic Cloud Sync**: Syncs to Supabase when online
- **Real-time Updates**: Receives server changes in real-time
- **Conflict Resolution**: Handles sync conflicts automatically
- **Background Sync Queue**: Retries failed syncs automatically
- **Connection Detection**: Adapts behavior based on online/offline status

## 🚀 Setup Steps

### Step 1: Create Free Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (free)
4. Create a new project:
   - **Project Name**: `gringo-production`
   - **Database Password**: (generate strong password)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free (includes 500MB database, 1GB storage, 50,000 monthly active users)

### Step 2: Get Your Supabase Credentials

Once your project is created:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `...` (long token)

3. **🔒 Secure Setup** - Add credentials to `.env` file:

```powershell
# Copy template (if not already done)
Copy-Item .env.example .env
```

Edit `.env` with your actual credentials:
``env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=...
``

> ⚠️ **Security**: Never commit `.env` file. It's git-ignored for safety.  
> See `ENVIRONMENT_SETUP.md` for complete security documentation.

### Step 3: Create Database Schema

In Supabase Dashboard → **SQL Editor**, run this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (already exists from Supabase Auth)
-- We'll just add company info

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Form submissions table
CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id VARCHAR(255) UNIQUE NOT NULL,
    form_type VARCHAR(50) NOT NULL,
    form_title VARCHAR(255) NOT NULL,
    form_data JSONB NOT NULL,
    form_structure JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_repeated_submission BOOLEAN DEFAULT FALSE,
    original_submission_id VARCHAR(255),
    email_status JSONB,
    configuration_id VARCHAR(255),
    configuration_name VARCHAR(255),
    company_id UUID REFERENCES public.companies(id),
    configuration_version VARCHAR(50),
    user_id UUID REFERENCES auth.users(id),
    sync_status VARCHAR(20) DEFAULT 'synced'
);

-- Templates table
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    form_type VARCHAR(50),
    template_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    placeholders TEXT[],
    is_universal BOOLEAN DEFAULT FALSE,
    company_id UUID REFERENCES public.companies(id),
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Form configurations table
CREATE TABLE IF NOT EXISTS public.form_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    form_type VARCHAR(50) NOT NULL,
    configuration JSONB NOT NULL,
    company_id UUID REFERENCES public.companies(id),
    is_default BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_user ON public.form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON public.form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.form_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_form_type ON public.templates(form_type);
CREATE INDEX IF NOT EXISTS idx_configurations_company ON public.form_configurations(company_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own submissions
CREATE POLICY "Users can view own submissions"
    ON public.form_submissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
    ON public.form_submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
    ON public.form_submissions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own submissions"
    ON public.form_submissions FOR DELETE
    USING (auth.uid() = user_id);

-- Similar policies for templates
CREATE POLICY "Users can view templates"
    ON public.templates FOR SELECT
    USING (is_universal = TRUE OR uploaded_by = auth.uid());

CREATE POLICY "Users can insert templates"
    ON public.templates FOR INSERT
    WITH CHECK (auth.uid() = uploaded_by);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configurations_updated_at BEFORE UPDATE ON public.form_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 4: Configure Storage Buckets

In Supabase Dashboard → **Storage**:

1. Create bucket: `templates`
   - Public: No
   - File size limit: 15MB
   - Allowed MIME types: `application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword, application/pdf, text/html`

2. Create bucket: `uploads`
   - Public: No
   - File size limit: 15MB
   - Allowed MIME types: `image/*, application/pdf`

3. Add storage policies:

```sql
-- Templates bucket policies
CREATE POLICY "Users can upload templates"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'templates' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view templates"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'templates' AND auth.role() = 'authenticated');

-- Uploads bucket policies
CREATE POLICY "Users can upload files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view own uploads"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Step 5: Enable Real-time

In Supabase Dashboard → **Database** → **Replication**:

1. Enable replication for these tables:
   - ✅ `form_submissions`
   - ✅ `templates`
   - ✅ `form_configurations`

### Step 6: Update Your Angular App

The hybrid services are already created. Now you need to use them in your components:

#### Option A: Update Existing Components (Recommended)

Update `src/app/pages/submissions/submissions.component.ts`:

```typescript
// Add to imports
import { FormSubmissionHybridService } from '../../services/form-submission-hybrid.service';
import { SupabaseSyncService } from '../../services/supabase-sync.service';

// In constructor, inject:
constructor(
  private formSubmissionService: FormSubmissionHybridService,  // Changed
  private syncService: SupabaseSyncService,  // Added
  // ... other services
) {}

// Add sync status observable
syncStatus$ = this.syncService.syncStatus$;
```

#### Option B: Create New Service Alias (Quick Migration)

Add to `app.config.ts`:

```typescript
import { FormSubmissionService } from './services/form-submission.service';
import { FormSubmissionHybridService } from './services/form-submission-hybrid.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... existing providers
    { provide: FormSubmissionService, useClass: FormSubmissionHybridService }
  ]
};
```

### Step 7: Add Sync Status Indicator to UI

Add to any component template:

```html
<!-- Sync Status Indicator -->
<div class="sync-status" *ngIf="syncStatus$ | async as status">
  <mat-icon *ngIf="status.isSyncing">sync</mat-icon>
  <mat-icon *ngIf="!status.isSyncing && status.pendingChanges === 0" 
            color="primary">cloud_done</mat-icon>
  <mat-icon *ngIf="status.pendingChanges > 0" 
            color="warn">cloud_queue</mat-icon>
  
  <span *ngIf="status.pendingChanges > 0">
    {{ status.pendingChanges }} pending
  </span>
  <span *ngIf="status.lastSync">
    Last sync: {{ status.lastSync | date:'short' }}
  </span>
</div>
``

## 🧪 Testing Your Setup

### Test 1: Offline Creation

``
1. Open DevTools → Application → Service Workers → Offline
2. Create a new RFQ submission
3. Verify it appears in the list (from IndexedDB)
4. Go back online
5. Wait 30 seconds or click manual sync
6. Check Supabase dashboard - submission should appear
``

### Test 2: Real-time Sync

``
1. Open app in two browser windows
2. Sign in as same user in both
3. Create submission in window 1
4. Verify it appears in window 2 automatically
``

### Test 3: Conflict Resolution

``
1. Create submission while offline
2. Edit same submission in Supabase dashboard
3. Go back online
4. Verify conflict is resolved (server-wins by default)
```

## 📊 Monitoring

View sync status in console:

- ✅ Green checkmarks = successful operations
- ⏸️ Pause icon = queued for later
- 🔄 Arrows = syncing
- ❌ Red X = errors

## 🚀 Deployment

### For Netlify (Frontend)

1. Build command: `npm run build`
2. Publish directory: `dist/gringo/browser`
3. Environment variables:

   ``
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ``

### For Railway (If you add backend later)

Railway is not needed for this setup! Supabase handles all backend functionality.

## 💰 Cost Breakdown (100% Free)

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| **Supabase Database** | 500MB | ~50MB | $0 |
| **Supabase Storage** | 1GB | ~200MB | $0 |
| **Supabase Auth** | 50K users | ~100 users | $0 |
| **Netlify Hosting** | 100GB bandwidth | ~5GB | $0 |
| **Total** | | | **$0/month** |

## 🔐 Security Best Practices

1. **Never commit credentials**: Add `.env` to `.gitignore`
2. **Use environment variables**: Set in Netlify dashboard
3. **Enable RLS**: Already done in schema above
4. **Row Level Security**: Users only see their own data
5. **Secure file uploads**: Policies restrict access

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

## 🆘 Troubleshooting

### Issue: "Supabase not initialized"

**Solution**: Check that credentials are set in `environment.ts`

### Issue: Data not syncing

**Solution**:

1. Check browser console for errors
2. Verify you're signed in
3. Check RLS policies in Supabase
4. Verify table replication is enabled

### Issue: "Row Level Security policy violation"

**Solution**: Run the RLS policies SQL above

### Issue: Real-time not working

**Solution**: Enable replication for tables in Supabase dashboard

## ✅ Next Steps

1. Create Supabase account
2. Copy credentials to environment.ts
3. Run SQL schema
4. Create storage buckets
5. Test offline/online sync
6. Deploy to Netlify

Your Gringo app is now production-ready with hybrid offline/online sync! 🎉
