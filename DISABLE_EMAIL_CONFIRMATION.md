# Disable Email Confirmation in Supabase

## Steps:

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/zademtsktedahwgehttw

2. **Navigate to Authentication Settings:**
   - Click **"Authentication"** in the left sidebar
   - Click **"Providers"** tab
   - Or go directly to: https://supabase.com/dashboard/project/zademtsktedahwgehttw/auth/providers

3. **Disable Email Confirmation:**
   - Scroll down to **"Email"** provider settings
   - Find **"Confirm email"** toggle
   - **Turn it OFF** (disable it)
   - Click **"Save"**

4. **Alternative: Auto-confirm emails (for development):**
   - Go to **Authentication** → **Settings**
   - Under **"User Management"**
   - Enable **"Enable email confirmations"** should be OFF
   - Or set **"Enable email confirmations"** to OFF

## After disabling:

- Users can sign up and immediately log in without email confirmation
- Perfect for local development and testing
- Remember to enable it back for production!

## Test:

1. Refresh your browser
2. Try signing up with a new email
3. Immediately try logging in with the same credentials
4. It should work without email confirmation!





