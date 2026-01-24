# 🔴 Fix CORS Error - create-payment-intent Edge Function

## The Problem

**Error:** CORS policy blocking `create-payment-intent` Edge Function
```
Access to fetch at 'https://zademtsktedahwgehttw.supabase.co/functions/v1/create-payment-intent' 
from origin 'https://worldcuptransport.app' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
It does not have HTTP ok status.
```

## Root Cause

The Edge Function `create-payment-intent` either:
1. **Not deployed** to Supabase (returns 404 on OPTIONS)
2. **OPTIONS handler not working** (returns non-200 status)
3. **Function needs redeployment** after code changes

## ✅ Solution: Deploy/Redeploy Edge Function

### Step 1: Verify Function Exists in Supabase

1. Go to **Supabase Dashboard** → Your Project
2. Click **Edge Functions** in left sidebar
3. Check if `create-payment-intent` is listed
4. Status should be **"Active"** (green)

**If NOT listed:** Function needs to be deployed (see Step 2)

**If listed but inactive:** Function needs to be redeployed

---

### Step 2: Deploy/Redeploy the Function

#### Option A: Via Supabase Dashboard (Easiest)

1. **If function doesn't exist:**
   - Click **"Create a new function"** or **"New Function"**
   - Name: `create-payment-intent` (exact, lowercase, hyphens)

2. **If function exists:**
   - Click on `create-payment-intent`
   - Click **"Edit"** or edit the code

3. **Copy the complete code** from:
   - File: `supabase/functions/create-payment-intent/index.ts`
   - Copy ALL code (lines 1-145)

4. **Paste into Supabase Dashboard**

5. **Click "Deploy"** or **"Save"**

6. **Wait for "Active" status** (green dot)

#### Option B: Via Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy create-payment-intent
```

---

### Step 3: Verify OPTIONS Handler Works

The function code already has the OPTIONS handler:

```typescript
Deno.serve(async (req: Request) => {
  // THIS MUST BE FIRST!
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,  // ← Must return 200!
      headers: corsHeaders,
    });
  }
  
  // Rest of function code...
});
```

**Verify it's deployed correctly:**
- The OPTIONS handler is at the top of the function
- It returns status 200
- It includes CORS headers

---

### Step 4: Test Function Directly

Open browser console on your app and run:

```javascript
const supabaseUrl = 'https://zademtsktedahwgehttw.supabase.co';

// Test OPTIONS request (CORS preflight)
fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
  method: 'OPTIONS',
})
.then(r => {
  console.log('Status:', r.status);
  if (r.status === 200) {
    console.log('✅ OPTIONS works! CORS is configured correctly.');
  } else {
    console.error('❌ OPTIONS failed - status:', r.status);
    console.error('Function needs to be deployed or OPTIONS handler is broken.');
  }
})
.catch(e => {
  console.error('❌ Network error:', e.message);
  console.error('Function might not be deployed.');
});
```

**Expected:** Status 200
**If 404:** Function not deployed
**If other status:** Function has error or OPTIONS handler broken

---

### Step 5: Check Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on `create-payment-intent`
3. Go to **"Logs"** tab
4. Look for:
   - ✅ Recent requests (means function is being called)
   - ❌ Error messages (red text)
   - ⚠️ Warnings

**Common errors in logs:**
- "Stripe is not configured" → Set `STRIPE_SECRET_KEY` in Edge Functions secrets
- "Cannot find module" → Function code has syntax errors
- "Function timeout" → Function taking too long

---

## 🔧 Common Issues & Fixes

### Issue 1: Function Not Deployed

**Symptom:** OPTIONS returns 404

**Fix:**
1. Deploy function via Supabase Dashboard (Step 2)
2. Wait for "Active" status
3. Test again

---

### Issue 2: OPTIONS Handler Not Working

**Symptom:** OPTIONS returns non-200 status

**Fix:**
1. Check function code has OPTIONS handler at the top
2. Verify it returns status 200
3. Redeploy function

---

### Issue 3: Stripe Secret Key Not Set

**Symptom:** Function returns 500 error

**Fix:**
1. Go to **Supabase Dashboard** → **Edge Functions** → **Secrets**
2. Add/Update: `STRIPE_SECRET_KEY` = `sk_test_...` (or `sk_live_...`)
3. Redeploy function

---

### Issue 4: Function Code Has Errors

**Symptom:** Function logs show errors

**Fix:**
1. Check function logs for specific error
2. Fix the error in function code
3. Redeploy function

---

## 📋 Verification Checklist

After deploying:

- [ ] Function `create-payment-intent` is listed in Edge Functions
- [ ] Function status is "Active" (green)
- [ ] OPTIONS request returns 200 status
- [ ] Function logs show no errors
- [ ] `STRIPE_SECRET_KEY` is set in Edge Functions secrets
- [ ] CORS error is gone in browser console

---

## 🎯 Quick Fix Summary

**Most likely issue:** Function not deployed or needs redeployment

**Quick fix:**
1. Go to Supabase Dashboard → Edge Functions
2. Deploy/redeploy `create-payment-intent` function
3. Copy code from `supabase/functions/create-payment-intent/index.ts`
4. Wait for "Active" status
5. Test again

---

## 📞 Still Having Issues?

**Check these:**

1. **Function exists?** Supabase Dashboard → Edge Functions → Is it listed?
2. **Function active?** Status should be "Active" (green)
3. **OPTIONS test?** Run test in Step 4 - what status code?
4. **Function logs?** Any errors in logs tab?
5. **Stripe key set?** Edge Functions → Secrets → `STRIPE_SECRET_KEY` exists?

**Share these details for further help:**
- OPTIONS test result (status code)
- Function logs (any errors?)
- Function status (Active/Inactive?)

---

**The function code is correct - it just needs to be deployed to Supabase!**

