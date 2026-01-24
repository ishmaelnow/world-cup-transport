# 🔴 FIX CONNECTION ERRORS - Complete Guide

## What's Happening

You're getting connection errors because one or more of these issues:

1. **Missing `.env` file** - App can't connect to Supabase
2. **Edge Functions not deployed** - Functions return 404
3. **CORS errors** - Browser blocking requests
4. **Network errors** - Can't reach Supabase servers
5. **Wrong credentials** - Invalid Supabase URL or key

---

## ✅ STEP 1: Check if .env File Exists

**Location:** Project root (`C:\Users\koshi\apps-deve\.env`)

**If file doesn't exist:**
1. Create a new file named `.env` (no extension!)
2. Add these lines:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-key-here
```

**To get your Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

**After creating/updating .env:**
- **RESTART your dev server** (stop with Ctrl+C, then `npm run dev`)

---

## ✅ STEP 2: Test Supabase Connection

Open browser console (F12) on your app and run:

```javascript
// Test 1: Check if env variables are loaded
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Test 2: Test basic Supabase connection
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Test connection
const { data, error } = await supabase.from('profiles').select('count').limit(1);
if (error) {
  console.error('❌ Supabase connection failed:', error.message);
} else {
  console.log('✅ Supabase connection works!');
}
```

**Expected:**
- ✅ Both env variables should show values (not `undefined`)
- ✅ Connection test should succeed

**If env variables are `undefined`:**
- `.env` file doesn't exist or is in wrong location
- Dev server wasn't restarted after creating `.env`
- Variable names are wrong (must start with `VITE_`)

---

## ✅ STEP 3: Test Edge Functions Connection

Run this in browser console:

```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!');
  console.error('Create .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
} else {
  // Test OPTIONS request (CORS preflight)
  fetch(`${supabaseUrl}/functions/v1/add-payment-method`, {
    method: 'OPTIONS',
  })
  .then(r => {
    console.log('Status:', r.status);
    if (r.status === 200) {
      console.log('✅ Edge Function exists and CORS works!');
    } else if (r.status === 404) {
      console.error('❌ Edge Function NOT DEPLOYED (404)');
      console.error('Go to Supabase Dashboard → Edge Functions → Deploy functions');
    } else {
      console.error('❌ Edge Function error - Status:', r.status);
    }
  })
  .catch(e => {
    console.error('❌ Network error:', e.message);
    console.error('Possible causes:');
    console.error('1. No internet connection');
    console.error('2. Wrong Supabase URL');
    console.error('3. Firewall blocking requests');
    console.error('4. Supabase project paused/deleted');
  });
}
```

**Expected Results:**

| Status | Meaning | Fix |
|--------|---------|-----|
| ✅ 200 | Function exists and CORS works | Everything OK! |
| ❌ 404 | Function not deployed | Deploy Edge Functions (see Step 4) |
| ❌ CORS error | Function not handling OPTIONS | Update function code |
| ❌ Network error | Can't reach Supabase | Check internet/URL |

---

## ✅ STEP 4: Deploy Edge Functions (If 404 Error)

If Step 3 shows 404, you need to deploy Edge Functions:

### Option A: Via Supabase Dashboard (Easiest)

1. Go to **Supabase Dashboard** → Your Project
2. Click **Edge Functions** in left sidebar
3. For each function in `supabase/functions/`:
   - Click **"Create a new function"** or **"New Function"**
   - Name: `add-payment-method` (exact, lowercase, hyphens)
   - Copy code from `supabase/functions/add-payment-method/index.ts`
   - Click **"Deploy"**
   - Wait for "Active" status

**Functions to deploy:**
- `add-payment-method`
- `create-payment-intent`
- `capture-payment`
- `match-driver`
- `webhook-stripe` (optional)

### Option B: Via Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy
```

---

## ✅ STEP 5: Fix CORS Errors

If you see CORS errors in console:

**Check:** Edge Functions must handle OPTIONS requests

**Verify:** Open function code in Supabase Dashboard, make sure it starts with:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // THIS MUST BE FIRST!
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,  // ← Must be 200!
      headers: corsHeaders,
    });
  }
  
  // Rest of function code...
});
```

**If missing:** Update function code and redeploy

---

## ✅ STEP 6: Improve Error Messages in Code

The current code catches errors but doesn't show helpful messages. I'll update the code to show better error diagnostics.

---

## 🔍 Diagnostic Checklist

Run through this checklist:

- [ ] `.env` file exists in project root
- [ ] `.env` has `VITE_SUPABASE_URL` (not `undefined`)
- [ ] `.env` has `VITE_SUPABASE_ANON_KEY` (not `undefined`)
- [ ] Dev server was restarted after creating/updating `.env`
- [ ] Supabase connection test passes (Step 2)
- [ ] Edge Functions test shows 200 (not 404)
- [ ] No CORS errors in browser console
- [ ] Internet connection is working
- [ ] Supabase project is active (not paused)

---

## 🚨 Common Error Messages & Fixes

### "Missing Supabase environment variables"
**Fix:** Create `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### "Payment service unavailable. Edge functions need to be deployed"
**Fix:** Deploy Edge Functions (Step 4)

### "Failed to fetch" or "Network error"
**Fix:** 
- Check internet connection
- Verify Supabase URL is correct
- Check if Supabase project is paused

### "CORS policy blocked"
**Fix:** Update Edge Function code to handle OPTIONS (Step 5)

### "404 Not Found" on Edge Function
**Fix:** Function not deployed - deploy it (Step 4)

### "401 Unauthorized"
**Fix:** 
- Check `VITE_SUPABASE_ANON_KEY` is correct
- Verify user is logged in
- Check auth token in request headers

---

## 📞 Still Having Issues?

**Share these details:**

1. **Browser Console Output:**
   - Run Step 2 and Step 3 tests
   - Copy all console output

2. **Network Tab:**
   - F12 → Network tab
   - Try the action that fails
   - Find the failed request
   - Share: Status code, Request URL, Response

3. **.env File (remove sensitive values):**
   - `VITE_SUPABASE_URL` exists? (yes/no)
   - `VITE_SUPABASE_ANON_KEY` exists? (yes/no)
   - Supabase URL format: `https://xxx.supabase.co` (yes/no)

4. **Supabase Dashboard:**
   - Project status: Active/Paused?
   - Edge Functions listed? (which ones?)
   - Any errors in function logs?

---

## 🎯 Quick Fix Summary

**Most common issue:** Missing `.env` file

**Quick fix:**
1. Create `.env` in project root
2. Add Supabase credentials
3. Restart dev server
4. Test connection

**Second most common:** Edge Functions not deployed

**Quick fix:**
1. Go to Supabase Dashboard → Edge Functions
2. Deploy all functions from `supabase/functions/`
3. Wait for "Active" status
4. Test again

