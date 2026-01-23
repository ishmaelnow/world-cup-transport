# 🔧 Fix 401 Unauthorized Error

## Progress! ✅
- CORS error is **FIXED** ✅
- Function is deployed and accessible ✅
- New issue: **401 Unauthorized** ❌

## The Problem

The function is returning `401 Unauthorized`, which means:
- Function is working
- But authentication is failing
- The JWT token isn't being accepted

---

## 🔍 Possible Causes

### Cause 1: JWT Verification Toggle
In Supabase Dashboard → Function Details:
- "Verify JWT with legacy secret" toggle is **ON**
- This requires a valid JWT token
- If the token format is wrong, it fails

### Cause 2: Missing/Invalid Auth Token
- Frontend might not be sending token correctly
- Token might be expired
- Token format might be wrong

---

## ✅ Solution Options

### Option 1: Turn Off JWT Verification (Easier for Testing)

1. Go to Supabase Dashboard → Edge Functions
2. Click on `add-payment-method` function
3. Go to **"Details"** tab
4. Find **"Verify JWT with legacy secret"** toggle
5. Turn it **OFF**
6. Click **"Save changes"**
7. Test again

**Note:** This is fine for testing. For production, you should keep it ON and fix the auth.

---

### Option 2: Fix Authentication (Better for Production)

The function needs to handle auth properly. Update the function code to verify the JWT token.

**Update the function code:**

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      timeout: 20000,
    });

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: userId does not match authenticated user' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const setupIntent = await stripe.setupIntents.create({
      metadata: {
        user_id: userId,
      },
    });

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

## 🎯 Quick Fix (Recommended for Now)

**Turn off JWT verification:**

1. Supabase Dashboard → Edge Functions → `add-payment-method`
2. **Details** tab
3. **"Verify JWT with legacy secret"** → Turn **OFF**
4. Click **"Save changes"**
5. Test again in your app

This will let the function work without strict JWT verification for now.

---

## 🧪 Test After Fix

1. Refresh your app
2. Go to Payment Methods
3. Try adding a card
4. Should work now! ✅

---

**Try turning off JWT verification first - it's the quickest fix!**

