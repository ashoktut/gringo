# Environment Variables & Security Setup

## 🔒 Secure Credential Management

Your Supabase credentials are now stored in `.env` file (NOT committed to Git).

## Quick Setup (2 minutes)

### Step 1: Copy Template

``powershell
Copy-Item .env.example .env
``

### Step 2: Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

### Step 3: Edit `.env` File

Open `.env` and replace placeholder values:

```env
SUPABASE_URL=https://your-actual-project.supabase.co
SUPABASE_ANON_KEY=...
```

### Step 4: Verify

``powershell
npm start
``

You should see:
``
✅ Environment variables loaded successfully
   SUPABASE_URL: https://your-project.supabase...
   SUPABASE_ANON_KEY: ...
``

## 🛡️ Security Features

### ✅ What's Protected

- `.env` file is in `.gitignore` (never committed)
- Credentials stay on your local machine
- `.env.example` shows required format (no real values)
- Environment variables used instead of hardcoded values

### ✅ Safe to Commit

- `.env.example` (template only)
- `environment.ts` (uses process.env, no hardcoded values)
- `environment.prod.ts` (uses process.env)

### ❌ Never Commit

- `.env` (contains real credentials)
- `.env.local`
- Any file with real API keys

## 🚀 Production Deployment

### Netlify

Set environment variables in Netlify dashboard:

1. Go to **Site Settings** → **Environment Variables**
2. Add:
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_ANON_KEY` = your anon key
3. Deploy:
``powershell
npm run build
netlify deploy --prod
``

### Railway

Set environment variables in Railway dashboard:

1. Go to **Variables** tab
2. Add same variables as above
3. Railway auto-deploys on git push

## 📋 File Structure

``
gringo/
├── .env                    # ❌ Your real credentials (git ignored)
├── .env.example            # ✅ Template (safe to commit)
├── .gitignore              # ✅ Excludes .env files
├── load-env.js             # ✅ Validates env vars
├── src/
│   └── environments/
│       ├── environment.ts       # ✅ Uses process.env
│       └── environment.prod.ts  # ✅ Uses process.env
``

## 🔍 Troubleshooting

### "Warning: .env file not found"

``powershell
Copy-Item .env.example .env

## Then edit .env with your credentials

``

### "Missing required environment variables"

``powershell

## Check .env file has both variables

Get-Content .env
``

### "Using placeholder values"

Your `.env` still has example values. Replace with real Supabase credentials.

### Environment variables not loading

``powershell

## Verify dotenv is installed

npm list dotenv

## Reinstall if needed

npm install --save-dev dotenv
``

## 🎯 Benefits

1. **Security**: Credentials never in source control
2. **Team Work**: Each developer uses their own `.env`
3. **Different Environments**: Dev vs prod credentials separated
4. **CI/CD Ready**: Easy to set env vars in deployment platforms
5. **Best Practice**: Industry-standard approach

## ⚠️ Important Notes

- The `anon key` from Supabase is **safe to use client-side** (it's public)
- Real security comes from Row-Level Security (RLS) policies in Supabase
- Never commit `.env` file - it's already in `.gitignore`
- Each team member should have their own `.env` file

## 🆘 Need Help?

If you see errors, check:

1. `.env` file exists (copy from `.env.example`)
2. No quotes around values in `.env` file
3. No spaces around `=` sign in `.env` file
4. Values are on same line (no line breaks)

Correct format:
``env
SUPABASE_URL=https://abc123.supabase.co
SUPABASE_ANON_KEY=...
``

Wrong format:
``env
SUPABASE_URL = "https://abc123.supabase.co"  # ❌ Extra quotes/spaces
``
