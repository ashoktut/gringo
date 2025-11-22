# Quick Supabase Setup Guide

## ⚡ Setup Your Credentials (1 Minute)

### Step 1: Get Your Supabase Credentials

1. Go to <https://supabase.com/dashboard>
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon / public key**: `eyJhbGc...` (long string starting with eyJ)

### Step 2: Add Credentials to Your Environment File

Open `src/environments/environment.ts` and replace the placeholder values:

```typescript
supabase: {
  url: 'https://your-project-id.supabase.co', // ← Paste your Project URL here
  anonKey: 'eyJhbGc...your-anon-key...', // ← Paste your anon key here
  enabled: true,
}
```

### Step 3: Start the App

```powershell
npm start
```

Navigate to `http://localhost:4200` - you should now be able to log in!

---

## 🔒 Security Notes

**Is it safe to put credentials in the code?**

YES for the anon key - it's designed to be public and used in client-side applications. Here's why:

✅ **The anon key is public by design** - It's meant for browser/client use
✅ **Real security comes from RLS** - Row-Level Security policies in Supabase protect your data
✅ **No sensitive data exposed** - The anon key only allows operations permitted by your RLS policies

**What about production?**

For production deployment (Netlify, Railway, etc.):

1. Copy your `environment.ts` values to `environment.prod.ts`
2. Or use your platform's environment variable feature
3. Netlify: Site Settings → Environment Variables
4. Railway: Variables tab

---

## 📋 Complete Setup Checklist

- [ ] Created Supabase project
- [ ] Copied Project URL and anon key
- [ ] Updated `src/environments/environment.ts`
- [ ] Ran `npm start` successfully
- [ ] Can access `http://localhost:4200`
- [ ] Login page appears (not the dashboard)
- [ ] Created user account or logged in
- [ ] Dashboard appears after login

---

## 🆘 Troubleshooting

### "Cannot find module 'process'"

Fixed! The environment files now use simple string values, not process.env.

### "Failed to initialize Supabase"

- Check that you've replaced BOTH `url` and `anonKey` in `environment.ts`
- Verify the URL starts with `https://`
- Verify the anon key is the full string (it's quite long)

### "Auth state changed: SIGNED_OUT" on login

- Check your Supabase project hasn't been paused
- Verify email confirmation settings in Supabase → Authentication → Settings

### Still seeing placeholder values

- Make sure you're editing `src/environments/environment.ts`
- Save the file after editing
- Restart the dev server (`npm start`)

---

## 🎯 Next Steps

Once you have Supabase connected:

1. **Test Authentication** - Create an account, logout, login
2. **Test Offline Mode** - Disconnect internet, create a submission
3. **Test Sync** - Reconnect internet, watch the data sync
4. **Check Supabase Dashboard** - See your data in Table Editor

Need to create the database tables? See `SUPABASE_SETUP_GUIDE.md` for the SQL schema.
