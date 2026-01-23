# Quick Setup Guide

## Step 1: Get Supabase Credentials

1. Go to https://supabase.com and sign up (or log in)
2. Click "New Project"
3. Fill in:
   - Project name: `fairfare` (or any name)
   - Database password: (save this!)
   - Region: Choose closest to you
4. Wait for project to finish provisioning (~2 minutes)
5. Go to **Settings** → **API**
6. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

## Step 2: Update .env File

Open `.env` in the project root and replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Run Database Migrations

The project includes SQL migrations that need to be run in Supabase:

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Open each migration file from `supabase/migrations/` folder in order:
   - `20251217215439_create_fairfare_core_schema.sql`
   - `20251218050458_add_payment_system.sql`
   - `20251218070011_fix_infinite_recursion_policies.sql`
   - `20251218070407_fix_rides_driver_profiles_recursion.sql`
   - `20251218070537_fix_policy_recursion_complete.sql`
   - `20251218075421_add_advanced_features_schema.sql`
   - `20251218091720_fix_foreign_key_references.sql`
   - `20251218091951_add_ride_notification_triggers.sql`
   - `20251218092420_create_earnings_on_ride_complete.sql`
   - `20251218143251_add_driver_application_system.sql`
   - `20251218162939_add_admin_ride_notifications.sql`
4. Copy and paste each file's contents into the SQL Editor
5. Click "Run" for each migration

**OR** use Supabase CLI (if installed):
```bash
supabase db push
```

## Step 4: Restart Dev Server

After updating `.env`, restart the dev server:
1. Stop the current server (Ctrl+C in terminal)
2. Run: `npm run dev`
3. Open http://localhost:5173 in your browser

## Optional: Stripe Setup (for payments)

If you want to test payment features:

1. Sign up at https://stripe.com
2. Go to **Developers** → **API Keys**
3. Copy your **Publishable key** (starts with `pk_test_...`)
4. Add to `.env`:
   ```env
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   ```
5. Restart dev server

## Troubleshooting

**Error: "Invalid supabaseUrl"**
- Make sure your `.env` file has valid Supabase credentials
- Check that the URL starts with `https://` and ends with `.supabase.co`
- Restart the dev server after updating `.env`

**Error: "Missing Supabase environment variables"**
- Verify `.env` file exists in project root
- Check that variable names start with `VITE_`
- Make sure there are no spaces around the `=` sign





