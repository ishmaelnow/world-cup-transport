# Deploy Supabase Edge Functions - Step by Step Guide

## 🚨 Problem
The error "Payment service unavailable. Edge functions need to be deployed to Supabase" occurs because the Edge Functions haven't been deployed to your Supabase project yet.

## ✅ Solution: Deploy Edge Functions

### Option 1: Using Supabase CLI (Recommended)

#### Step 1: Install Supabase CLI

**Windows (PowerShell):**
```powershell
# Using Scoop (if you have it)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# OR using npm
npm install -g supabase
```

**Or download directly:**
- Visit: https://github.com/supabase/cli/releases
- Download the Windows executable
- Add to PATH

#### Step 2: Login to Supabase
```bash
supabase login
```
This will open your browser to authenticate.

#### Step 3: Link Your Project
```bash
cd C:\Users\koshi\apps-deve
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your Project Ref:**
1. Go to your Supabase Dashboard
2. Go to Settings → General
3. Copy the "Reference ID" (looks like: `abcdefghijklmnop`)

#### Step 4: Set Environment Variables

Edge Functions need these secrets:
- `STRIPE_SECRET_KEY` - Your Stripe secret key (starts with `sk_test_...` or `sk_live_...`)

Set the secret:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key_here
```

**Note:** Supabase automatically provides:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

#### Step 5: Deploy All Functions

Deploy each function:
```bash
# Deploy add-payment-method
supabase functions deploy add-payment-method

# Deploy create-payment-intent
supabase functions deploy create-payment-intent

# Deploy capture-payment
supabase functions deploy capture-payment

# Deploy match-driver
supabase functions deploy match-driver

# Deploy webhook-stripe (if using webhooks)
supabase functions deploy webhook-stripe

# Deploy create-checkout-session (if using)
supabase functions deploy create-checkout-session
```

#### Step 6: Verify Deployment

Check functions in Supabase Dashboard:
1. Go to Edge Functions section
2. You should see all deployed functions
3. Check logs for any errors

---

### Option 2: Manual Deployment via Supabase Dashboard

If CLI doesn't work, you can deploy manually:

#### Step 1: Prepare Function Files

Each function needs to be in a zip file with:
- `index.ts` (the function code)
- `deno.json` (optional, for Deno config)

#### Step 2: Upload via Dashboard

1. Go to Supabase Dashboard → Edge Functions
2. Click "Create a new function"
3. Name it (e.g., `add-payment-method`)
4. Copy the code from `supabase/functions/add-payment-method/index.ts`
5. Paste into the editor
6. Click "Deploy"

#### Step 3: Set Secrets

1. Go to Settings → Edge Functions → Secrets
2. Add `STRIPE_SECRET_KEY` with your Stripe secret key

Repeat for all functions:
- `add-payment-method`
- `create-payment-intent`
- `capture-payment`
- `match-driver`
- `webhook-stripe`
- `create-checkout-session`

---

### Option 3: Quick Fix - Deploy via Supabase Dashboard (Easiest)

#### For Each Function:

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project

2. **Open Edge Functions**
   - Click "Edge Functions" in left sidebar
   - Click "Create a new function"

3. **Create `add-payment-method` function:**
   - Name: `add-payment-method`
   - Copy code from: `supabase/functions/add-payment-method/index.ts`
   - Paste and click "Deploy"

4. **Create `create-payment-intent` function:**
   - Name: `create-payment-intent`
   - Copy code from: `supabase/functions/create-payment-intent/index.ts`
   - Paste and click "Deploy"

5. **Create `capture-payment` function:**
   - Name: `capture-payment`
   - Copy code from: `supabase/functions/capture-payment/index.ts`
   - Paste and click "Deploy"

6. **Create `match-driver` function:**
   - Name: `match-driver`
   - Copy code from: `supabase/functions/match-driver/index.ts`
   - Paste and click "Deploy"

7. **Set Stripe Secret Key:**
   - Go to Settings → Edge Functions → Secrets
   - Add secret:
     - Name: `STRIPE_SECRET_KEY`
     - Value: Your Stripe secret key (from Stripe Dashboard)

---

## 🔍 Verify Deployment

### Test the Functions

After deployment, test in browser console:

```javascript
// Get your Supabase URL and anon key from .env
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_ANON_KEY';

// Test add-payment-method
fetch(`${supabaseUrl}/functions/v1/add-payment-method`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer YOUR_ACCESS_TOKEN`,
    'apikey': supabaseAnonKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ userId: 'test-user-id' }),
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### Check Function Logs

1. Go to Edge Functions in Dashboard
2. Click on a function name
3. View "Logs" tab
4. Check for errors

---

## 🐛 Troubleshooting

### Error: "Function not found"
- Verify function name matches exactly
- Check function is deployed (green status)
- Verify URL is correct: `${SUPABASE_URL}/functions/v1/FUNCTION_NAME`

### Error: "Stripe is not configured"
- Check `STRIPE_SECRET_KEY` secret is set in Supabase
- Verify secret name is exactly `STRIPE_SECRET_KEY`
- Restart function after setting secret

### Error: "Unauthorized"
- Check you're sending `Authorization` header with valid token
- Verify `apikey` header matches your anon key
- Check RLS policies if accessing database

### Function Deploys but Returns 500
- Check function logs in Dashboard
- Verify Stripe key is correct
- Check Supabase URL and service role key are set

---

## 📝 Required Functions Summary

| Function | Purpose | Required Secrets |
|----------|---------|-----------------|
| `add-payment-method` | Create Stripe SetupIntent | `STRIPE_SECRET_KEY` |
| `create-payment-intent` | Authorize payment for ride | `STRIPE_SECRET_KEY` |
| `capture-payment` | Charge rider on ride completion | `STRIPE_SECRET_KEY` |
| `match-driver` | Auto-match driver to ride | None |
| `webhook-stripe` | Handle Stripe webhooks | `STRIPE_SECRET_KEY` |

---

## ✅ Success Checklist

After deployment, verify:
- [ ] All functions show "Active" status in Dashboard
- [ ] `STRIPE_SECRET_KEY` secret is set
- [ ] Function logs show no errors
- [ ] Test adding payment method in app works
- [ ] No "Edge functions need to be deployed" error

---

## 🚀 Quick Deploy Script

If you have Supabase CLI installed, run this:

```bash
cd C:\Users\koshi\apps-deve

# Set Stripe secret (replace with your key)
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key_here

# Deploy all functions
supabase functions deploy add-payment-method
supabase functions deploy create-payment-intent
supabase functions deploy capture-payment
supabase functions deploy match-driver
```

---

**After deployment, refresh your app and try adding a payment method again!**

