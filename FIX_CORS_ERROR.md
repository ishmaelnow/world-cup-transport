# 🔧 Fix CORS Error - Edge Function Not Responding to OPTIONS

## The Problem

**Error:** "Response to preflight request doesn't pass access control check: It does not have HTTP ok status."

This means:
- Browser sends OPTIONS request (CORS preflight)
- Function doesn't return 200 OK
- Request is blocked

## Root Cause

The function either:
1. **Not deployed** (returns 404)
2. **OPTIONS handler not working** (returns error status)

---

## ✅ Solution: Verify & Fix Function

### Step 1: Check Function is Deployed

1. Go to Supabase Dashboard → Edge Functions
2. **Verify:**
   - `add-payment-method` is listed
   - Status is "Active" (green)
   - You can click on it and see the code

**If NOT listed:** Function isn't deployed. Deploy it first.

---

### Step 2: Verify OPTIONS Handler

The function MUST handle OPTIONS requests. Check your function code has this:

```typescript
Deno.serve(async (req: Request) => {
  // THIS MUST BE FIRST!
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,  // ← Must return 200!
      headers: corsHeaders,
    });
  }
  
  // Rest of your code...
});
```

**Important:** OPTIONS handler must:
- ✅ Return status 200
- ✅ Include CORS headers
- ✅ Return BEFORE any other code runs

---

### Step 3: Test Function Directly

Open browser console and run:

```javascript
// Test OPTIONS request
fetch('https://zademtsktedahwgehttw.supabase.co/functions/v1/add-payment-method', {
  method: 'OPTIONS',
})
.then(r => {
  console.log('Status:', r.status);
  console.log('Headers:', [...r.headers.entries()]);
  if (r.status === 200) {
    console.log('✅ OPTIONS works!');
  } else {
    console.log('❌ OPTIONS failed - status:', r.status);
  }
})
.catch(e => {
  console.error('❌ Error:', e);
});
```

**Expected:** Status 200
**If 404:** Function not deployed
**If other status:** Function has error

---

## 🔧 Fix Options

### Fix 1: Function Not Deployed

**Symptoms:** OPTIONS returns 404

**Solution:**
1. Go to Supabase → Edge Functions
2. Click "Create a new function"
3. Name: `add-payment-method` (exact, lowercase)
4. Copy the COMPLETE code (see below)
5. Click "Deploy"
6. Wait for "Active" status

---

### Fix 2: OPTIONS Handler Missing/Wrong

**Symptoms:** OPTIONS returns non-200 status

**Solution:** Make sure function code starts with:

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // OPTIONS HANDLER MUST BE FIRST!
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,  // ← CRITICAL: Must be 200
      headers: corsHeaders,
    });
  }

  // Rest of your code here...
  try {
    // Your function logic
  } catch (error) {
    // Error handling
  }
});
```

---

### Fix 3: Update Existing Function

If function exists but OPTIONS doesn't work:

1. Go to Supabase → Edge Functions
2. Click on `add-payment-method`
3. Click "Edit" or edit the code
4. Make sure OPTIONS handler is FIRST in the function
5. Make sure it returns status 200
6. Click "Deploy" or "Save"
7. Wait for deployment

---

## 📋 Complete Function Code (Copy This)

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  // OPTIONS handler - MUST BE FIRST!
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Starting add-payment-method function');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      console.error('Stripe secret key not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Initializing clients');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      timeout: 20000,
    });

    console.log('Parsing request body');
    const { userId } = await req.json();
    console.log('Request params:', { userId });

    if (!userId) {
      console.error('Missing required parameter: userId');
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Creating SetupIntent...');
    const setupIntent = await stripe.setupIntents.create({
      metadata: {
        user_id: userId,
      },
    });
    console.log('SetupIntent created:', setupIntent.id);

    return new Response(
      JSON.stringify({
        clientSecret: setupIntent.client_secret,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in add-payment-method:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

---

## ✅ Verification Steps

After deploying/updating:

1. **Test OPTIONS:**
   ```javascript
   fetch('https://zademtsktedahwgehttw.supabase.co/functions/v1/add-payment-method', {
     method: 'OPTIONS'
   })
   .then(r => console.log('Status:', r.status)); // Should be 200
   ```

2. **Check Function Logs:**
   - Supabase Dashboard → Edge Functions → `add-payment-method` → Logs
   - Look for any errors

3. **Test in App:**
   - Refresh app
   - Try adding payment method
   - Check console - CORS error should be gone

---

## 🎯 Most Likely Fix

**The function probably isn't deployed or OPTIONS handler is wrong.**

**Do this:**
1. Go to Supabase → Edge Functions
2. Check if `add-payment-method` exists and is Active
3. If not, deploy it with the code above
4. If yes, edit it and make sure OPTIONS handler returns 200
5. Redeploy

**Then test again!**


