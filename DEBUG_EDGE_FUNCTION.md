# 🐛 Debug Edge Function Error

## Problem
Still getting "Payment service unavailable. Edge functions need to be deployed to Supabase."

## Possible Causes

### 1. Function Not Deployed Correctly
- Check if function shows as "Active" in Supabase Dashboard
- Check function logs for errors

### 2. Wrong Function URL
- Frontend might be calling wrong endpoint
- Check the exact URL being called

### 3. Function Name Mismatch
- Function name must be exactly: `add-payment-method`
- Case-sensitive!

### 4. CORS Issues
- Function might not be handling CORS correctly

---

## 🔍 Debug Steps

### Step 1: Verify Function is Deployed

1. Go to Supabase Dashboard → Edge Functions
2. Check if `add-payment-method` is listed
3. Status should be "Active" (green)
4. Click on the function name
5. Check "Logs" tab for any errors

### Step 2: Check Function URL

The function should be accessible at:
```
https://zademtsktedahwgehttw.supabase.co/functions/v1/add-payment-method
```

### Step 3: Test Function Directly

Open browser console (F12) and run:

```javascript
const supabaseUrl = 'https://zademtsktedahwgehttw.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY'; // Get from .env

// Get auth token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Test the function
fetch(`${supabaseUrl}/functions/v1/add-payment-method`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'apikey': supabaseAnonKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ userId: 'test-user-id' }),
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### Step 4: Check Browser Console

1. Open your app: http://localhost:5173
2. Open browser console (F12)
3. Go to Payment Methods page
4. Try adding a card
5. Check console for exact error message
6. Check Network tab → see what request is being made

---

## 🔧 Common Fixes

### Fix 1: Function Name Must Match Exactly

Make sure function name is exactly: `add-payment-method`
- ✅ Correct: `add-payment-method`
- ❌ Wrong: `add_payment_method`
- ❌ Wrong: `addPaymentMethod`
- ❌ Wrong: `add-payment-methods` (plural)

### Fix 2: Check Function Code

Make sure you copied the ENTIRE code, including:
- All imports
- CORS headers
- The Deno.serve wrapper
- All the try/catch blocks

### Fix 3: Verify Secret is Set

1. Go to Settings → Edge Functions → Secrets
2. Make sure `STRIPE_SECRET_KEY` exists
3. Value should start with `sk_test_...` or `sk_live_...`

### Fix 4: Check Function Logs

1. Click on `add-payment-method` function
2. Go to "Logs" tab
3. Look for errors
4. Common errors:
   - "Stripe is not configured" → Secret not set
   - "Function not found" → Wrong name or not deployed
   - CORS errors → Check CORS headers in function

---

## 🧪 Quick Test

Run this in browser console on your app:

```javascript
// Check if function exists
fetch('https://zademtsktedahwgehttw.supabase.co/functions/v1/add-payment-method', {
  method: 'OPTIONS',
})
.then(r => {
  console.log('Function exists:', r.status === 200);
  console.log('Response:', r);
})
.catch(e => {
  console.error('Function not found:', e);
});
```

If this fails, the function isn't deployed or URL is wrong.

---

## 📋 Checklist

- [ ] Function `add-payment-method` exists in Edge Functions list
- [ ] Function status is "Active" (green)
- [ ] Function name is exactly `add-payment-method` (lowercase, hyphens)
- [ ] Secret `STRIPE_SECRET_KEY` is set
- [ ] Function logs show no errors
- [ ] Test request works in browser console
- [ ] Frontend is calling correct URL

---

## 🆘 Still Not Working?

Share:
1. What you see in browser console (exact error)
2. Function status in Supabase Dashboard
3. Function logs (any errors?)
4. Network tab → what URL is being called?

