# Password Reset Configuration Guide

## Supabase Dashboard Setup

To enable the password reset flow, you need to configure the redirect URL in your Supabase project:

### Step 1: Configure Redirect URLs

1. Go to your Supabase Dashboard: <https://supabase.com/dashboard>
2. Select your project: `gringo-production`
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:
   ``
   http://localhost:4200/auth/reset-password
   ``
5. For production, also add:
   ``
   https://your-production-domain.com/auth/reset-password
   ``
6. Click **Save**

### Step 2: Configure Email Templates (Optional)

1. In Supabase Dashboard → **Authentication** → **Email Templates**
2. Select **Reset Password** template
3. Customize the email content if needed
4. The default template includes: `{{ .ConfirmationURL }}`
5. This URL will automatically point to your configured redirect URL

### Step 3: Test Email Delivery

1. Ensure SMTP is configured (Supabase uses built-in SMTP by default)
2. Check spam folder if email doesn't arrive
3. For production, consider using a custom SMTP provider (SendGrid, Mailgun, etc.)

## How It Works

### Password Reset Flow

``

1. User visits /auth/forgot-password
   └─> Enters registered email
   └─> Clicks "Reset Password"

2. Supabase sends email with magic link
   └─> Link format: <https://your-domain.com/auth/reset-password?access_token=>...
   └─> Token is valid for 1 hour (default)

3. User clicks link in email
   └─> Redirected to /auth/reset-password
   └─> Supabase automatically validates token
   └─> User enters new password (twice)

4. Password is updated
   └─> User redirected to login
   └─> Can login with new password
``

### Security Features

✅ **Token-based authentication**: Reset link contains secure token
✅ **Time-limited**: Token expires after 1 hour
✅ **Single-use**: Token is invalidated after password reset
✅ **Existing users only**: Only registered users receive reset emails
✅ **Password validation**: Minimum 6 characters required
✅ **Confirm password**: Must match new password

## Code Implementation

### Components Created

1. **ResetPasswordComponent** (`/auth/reset-password`)
   - Validates reset token from email link
   - Two password fields (new password + confirmation)
   - Calls `SupabaseService.updatePassword()`
   - Shows error if token expired/invalid

2. **ForgotPasswordComponent** (`/auth/forgot-password`)
   - Email input for existing users
   - Calls `SupabaseService.resetPassword()`
   - Sends reset email with redirect URL

### Service Methods

``typescript
// Send password reset email
await supabaseService.resetPassword(email);

// Update password (called from reset page)
await supabaseService.updatePassword(newPassword);

// Check if valid session exists
const session = await supabaseService.getSession();
``

## Testing

### Test the Complete Flow

1. **Register a test user:**
   ``
   http://localhost:4200/auth/register
   Email: test@example.com
   Password: test123
   ``

2. **Request password reset:**
   ``
   http://localhost:4200/auth/forgot-password
   Enter: test@example.com
   ``

3. **Check email:**
   - Look for email from Supabase
   - Click the reset link
   - Should open: <http://localhost:4200/auth/reset-password?access_token=>...

4. **Reset password:**
   - Enter new password (min 6 chars)
   - Confirm password (must match)
   - Click "Reset Password"
   - Redirected to login

5. **Login with new password:**
   ``
   http://localhost:4200/auth/login
   Email: test@example.com
   Password: [new password]
   ``

## Troubleshooting

### Issue: "Invalid or expired reset link"

**Causes:**

- Token expired (>1 hour old)
- Token already used
- Invalid token format

**Solution:**

- Request a new reset link
- Check URL hasn't been modified
- Ensure redirect URL is configured in Supabase

### Issue: "Email not received"

**Causes:**

- Email in spam folder
- SMTP not configured
- Email doesn't exist in database

**Solution:**

- Check spam/junk folder
- Verify SMTP settings in Supabase
- Confirm email is registered (only existing users get emails)

### Issue: "Password update failed"

**Causes:**

- Password too short (<6 characters)
- No active session
- Network error

**Solution:**

- Ensure password is at least 6 characters
- Click reset link again to refresh session
- Check browser console for errors

## Production Deployment

### Environment Variables

Already configured in `environment.ts`:
``typescript
export const environment = {
  supabase: {
    url: 'https://usfavsmrweagnrcomgvo.supabase.co',
    anonKey: 'your-anon-key',
    enabled: true
  }
};
``

### Deployment Checklist

- [ ] Add production domain to Supabase Redirect URLs
- [ ] Test email delivery in production
- [ ] Configure custom SMTP (optional, for better deliverability)
- [ ] Set up SPF/DKIM records for custom domain (optional)
- [ ] Test complete flow on production URL
- [ ] Monitor Supabase logs for errors

## Security Best Practices

✅ **Implemented:**

- Token-based authentication
- Password confirmation required
- Time-limited reset links
- HTTPS redirect URLs (production)
- Session validation
- Error message sanitization

✅ **Supabase Handles:**

- Rate limiting (prevents spam)
- Token encryption
- Secure token storage
- Automatic token invalidation
- Email verification (optional)

## API Reference

### SupabaseService Methods

``typescript
// Send reset email to existing user
async resetPassword(email: string): Promise<..void>

// Update password for authenticated session
async updatePassword(newPassword: string): Promise<..void>

// Get current session (for token validation)
async getSession(): Promise<Session | null>
``

### Form Validation

``typescript
// Password requirements

- Minimum length: 6 characters
- Must match confirmation field
- No special character requirements (customizable)

// Email validation

- Must be valid email format
- Must be registered in database
``

---

**Password reset is now fully configured!** 🎉

Users can securely reset their passwords through email verification, and only existing registered users will receive reset links.
