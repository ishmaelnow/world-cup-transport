# 🔧 Fix Edge Function Error - Step by Step

## The Problem
Still seeing "Payment service unavailable" even after deploying.

## 🔍 Let's Debug This

### Step 1: Check Browser Console (IMPORTANT!)

1. Open your app: http://localhost:5173
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Go to Payment Methods page
5. Try adding a card
6. **Look for the actual error** - it will show more details than the UI

**What to look for:**
- Network errors
- CORS errors
- 404 Not Found
- 500 Internal Server Error
- The exact URL being called

---

### Step 2: Check Network Tab

1. In Developer Tools, go to **Network** tab
2. Try adding a card again
3. Look for a request to `add-payment-method`
4. Click on it
5. Check:
   - **Status code** (200 = good, 404 = not found, 500 = error)
   - **Request URL** (should be: `https://zademtsktedahwgehttw.supabase.co/functions/v1/add-payment-method`)
   - **Response** (what error message?)

---

### Step 3: Verify Function in Supabase

1. Go to Supabase Dashboard
2. Click **Edge Functions**
3. **Check:**
   - Is `add-payment-method` listed?
   - Status should be **"Active"** (green dot)
   - Click on the function name
   - Go to **"Logs"** tab
   - **Any errors there?**

---

### Step 4: Test Function Directly

Open browser console (F12) on your app page and run:

```javascript
// Get your Supabase URL and key
const supabaseUrl = 'https://zademtsktedahwgehttw.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY_FROM_ENV'; // Check your .env file

// Test OPTIONS request (CORS preflight)
fetch(`${supabaseUrl}/functions/v1/add-payment-method`, {
  method: 'OPTIONS',
})
.then(r => {
  console.log('✅ Function exists! Status:', r.status);
  return r.text();
})
.then(text => console.log('Response:', text))
.catch(e => {
  console.error('❌ Function not found:', e);
  console.error('Error details:', e.message);
});
```

**What this tells us:**
- If it works → Function exists, might be auth issue
- If 404 → Function not deployed or wrong name
- If CORS error → Function code issue

---

## 🔧 Common Issues & Fixes

### Issue 1: Function Name Mismatch

**Check:** Function name must be EXACTLY `add-payment-method`
- ✅ `add-payment-method` (correct)
- ❌ `add_payment_method` (wrong - uses underscore)
- ❌ `addPaymentMethod` (wrong - camelCase)
- ❌ `Add-Payment-Method` (wrong - capital letters)

**Fix:** Delete and recreate with exact name: `add-payment-method`

---

### Issue 2: Function Not Actually Deployed

**Check:** In Supabase Dashboard → Edge Functions
- Is the function listed?
- Does it show "Active" status?
- Can you click on it and see the code?

**Fix:** 
1. Make sure you clicked "Deploy" after pasting code
2. Wait a few seconds for deployment
3. Refresh the Edge Functions page
4. Function should appear in the list

---

### Issue 3: CORS Error

**Check:** Browser console shows CORS error

**Fix:** Make sure function code includes CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
```

And handles OPTIONS:

```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}
```

---

### Issue 4: Wrong URL

**Check:** Network tab shows wrong URL

**Current URL should be:**
```
https://zademtsktedahwgehttw.supabase.co/functions/v1/add-payment-method
```

**If different:** Check your `.env` file:
- `VITE_SUPABASE_URL=https://zademtsktedahwgehttw.supabase.co`

---

### Issue 5: Function Code Error

**Check:** Function logs in Supabase Dashboard

1. Click on `add-payment-method` function
2. Go to "Logs" tab
3. Look for red error messages

**Common errors:**
- "Stripe is not configured" → Secret not set correctly
- "Cannot find module" → Missing imports
- Syntax errors → Code not copied correctly

---

## 🧪 Quick Diagnostic Test

Run this in browser console (on your app page):

```javascript
// Test 1: Check if function endpoint exists
fetch('https://zademtsktedahwgehttw.supabase.co/functions/v1/add-payment-method', {
  method: 'OPTIONS'
})
.then(r => console.log('Test 1 - Function exists:', r.status === 200))
.catch(e => console.error('Test 1 - Function NOT found:', e));

// Test 2: Check your env variables
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

---

## 📋 What I Need From You

To help debug, please share:

1. **Browser Console Error:**
   - Open F12 → Console tab
   - Copy the exact error message

2. **Network Tab:**
   - F12 → Network tab
   - Find `add-payment-method` request
   - What's the status code?
   - What's the response?

3. **Supabase Dashboard:**
   - Is `add-payment-method` function listed?
   - What's its status?
   - Any errors in Logs tab?

4. **Function Name:**
   - What exact name did you use? (case-sensitive!)

---

## 🚀 Most Likely Fixes

### Fix A: Function Not Deployed
1. Go to Supabase → Edge Functions
2. Make sure function is listed and "Active"
3. If not, create it again with exact name: `add-payment-method`

### Fix B: Wrong Function Name
- Delete the function
- Create new one with exact name: `add-payment-method` (lowercase, hyphens)

### Fix C: Code Issue
- Make sure you copied ALL the code
- Check function logs for errors
- Verify CORS headers are in the code

---

**Please check browser console (F12) and share what error you see there!**


