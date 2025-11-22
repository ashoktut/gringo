# Gringo - Quick Start Guide

## Hybrid Offline-First + Supabase Cloud Sync

## 🎯 What You Have Now

Your Gringo application now supports:

### ✅ Offline-First Architecture

- All data saved to IndexedDB first (works without internet)
- Fast, instant writes
- No waiting for server responses

### ✅ Automatic Cloud Sync

- Syncs to Supabase when you're online
- Background sync every 30 seconds
- Retry failed syncs automatically
- Real-time updates from other devices

### ✅ Smart Sync Queue

- Changes queued when offline
- Auto-syncs when connection restored
- Conflict resolution built-in

## 🚀 How to Use

### For Development (No Setup Required)

Your app works RIGHT NOW in offline mode:

```powershell
npm start
```

Everything works locally with IndexedDB!

### To Enable Cloud Sync (Optional - 100% Free)

Follow these 3 simple steps:

#### Step 1: Create Free Supabase Account (2 minutes)

1. Go to <https://supabase.com>
2. Sign up with GitHub (free forever)
3. Create new project called "gringo"
4. Wait 2 minutes for database provisioning

#### Step 2: Copy Credentials (1 minute)

1. In Supabase dashboard → Settings → API
2. Copy "Project URL" and "anon public" key
3. Paste into `src/environments/environment.ts`:

```typescript
supabase: {
  url: 'YOUR_PROJECT_URL_HERE',
  anonKey: 'YOUR_ANON_KEY_HERE',
  enabled: true,
}
```

#### Step 3: Create Database Schema (2 minutes)

1. In Supabase → SQL Editor
2. Copy SQL from `SUPABASE_SETUP_GUIDE.md` (Step 3)
3. Run it
4. Done!

## 📱 How It Works

### Offline Mode (Default)

``
You → Create RFQ → IndexedDB ✅
                  (Instant save)
``

### Online Mode (With Supabase)

``
You → Create RFQ → IndexedDB ✅ → Supabase Cloud ✅
                  (Instant)      (Background sync)
``

### Real-time Sync

``
Device 1: Create RFQ → Supabase
                          ↓
Device 2: Receives update automatically
``

## 🔍 Check Sync Status

In browser console, you'll see:

- ✅ `Submission saved to IndexedDB` - Offline save works
- 🔄 `Syncing pending changes...` - Cloud sync in progress
- ✅ `Synced to server` - Cloud backup complete
- ⏸️ `Will sync later` - Queued for when online

## 🧪 Test It Out

### Test 1: Works Offline

``

1. Turn off WiFi
2. Create an RFQ
3. It saves locally ✅
4. Turn WiFi back on
5. Auto-syncs to cloud ✅
``

### Test 2: Real-time Updates

``

1. Open app in Chrome
2. Open app in Edge (same account)
3. Create RFQ in Chrome
4. See it appear in Edge automatically ✅
``

## 💰 Cost: $0/month

Free tier includes:

- 500MB database (you'll use ~50MB)
- 1GB file storage (you'll use ~200MB)
- 50,000 users/month (you'll have ~100)
- Unlimited API requests
- Real-time updates
- Authentication

## 🎨 Current Features

### Forms

- ✅ RFQ (Request for Quote)
- ✅ Templates
- ✅ Submissions tracking
- ✅ PDF generation
- ✅ Picture upload
- ✅ Digital signature
- ✅ Map location picker

### Data

- ✅ Offline-first storage
- ✅ Cloud backup (optional)
- ✅ Real-time sync
- ✅ Conflict resolution
- ✅ Search & filter

### User Experience

- ✅ Works without internet
- ✅ Instant saves
- ✅ Background sync
- ✅ Multi-device support
- ✅ Professional UI

## 📚 Files Created

New services added:

- `src/app/services/supabase.service.ts` - Supabase client wrapper
- `src/app/services/supabase-sync.service.ts` - Sync engine with queue
- `src/app/services/form-submission-hybrid.service.ts` - Hybrid submission service
- `src/environments/environment.ts` - Configuration
- `SUPABASE_SETUP_GUIDE.md` - Detailed setup instructions

## 🔄 Migration Path

### Option 1: Keep Current Setup (Offline Only)

No changes needed! Everything works as before.

### Option 2: Add Cloud Sync (5 minutes)

1. Create Supabase account
2. Add credentials
3. Run SQL schema
4. Enjoy cloud backup!

### Option 3: Full Migration (Later)

When you want to move everything to cloud:

1. Pull data from IndexedDB
2. Push to Supabase
3. Continue using hybrid mode

## 🆘 Need Help?

Common scenarios:

### "I want offline-only"

✅ Already working! Just use the app.

### "I want cloud backup"

→ Follow 3 steps above (5 minutes total)

### "I want both"

→ That's what this hybrid system does!

### "Will my data be safe?"

✅ Yes! Data saved locally first, then backed up to cloud.

## 🎯 Next Steps

### Ready to Deploy?

1. **Development**: `npm start` (works now!)
2. **Production**: Follow deployment guide below

### Deployment (Free Options)

#### Frontend: Netlify (Free)

```powershell
# Build for production
npm run build

# Deploy to Netlify
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Deploy
netlify deploy --prod --dir=dist/gringo/browser
```

#### Database: Supabase (Free)

Already hosted! Nothing to deploy.

### Environment Variables (For Netlify)

Add in Netlify dashboard → Site settings → Environment variables:

``
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
``

## 🎉 You're Done

Your Gringo app now has:

- ✅ Offline-first architecture
- ✅ Optional cloud sync
- ✅ Real-time updates
- ✅ Free hosting options
- ✅ Production-ready setup
- ✅ 100% open source stack

**Total setup time: 5 minutes**
**Total cost: $0/month**

Start building! 🚀
