# 🚀 Quick Fix: Deploy Edge Functions (5 Minutes)

## The Problem
Error: "Payment service unavailable. Edge functions need to be deployed to Supabase."

## The Solution
Deploy the Edge Functions via Supabase Dashboard (no CLI needed!)

---

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Sign in and select your project

### Step 2: Set Stripe Secret Key
1. Click **Settings** (gear icon) in left sidebar
2. Click **Edge Functions** → **Secrets**
3. Click **Add a new secret**
4. Enter:
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** Your Stripe secret key (starts with `sk_test_...` or `sk_live_...`)
5. Click **Save**

**To get your Stripe secret key:**
- Go to https://dashboard.stripe.com
- Click **Developers** → **API keys**
- Copy the **Secret key** (click "Reveal" if hidden)

---

### Step 3: Deploy Function 1 - `add-payment-method`

1. In Supabase Dashboard, click **Edge Functions** in left sidebar
2. Click **Create a new function**
3. **Function name:** `add-payment-method`
4. **Copy and paste this code:**

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

5. Click **Deploy**

---

### Step 4: Deploy Function 2 - `create-payment-intent`

1. Click **Create a new function** again
2. **Function name:** `create-payment-intent`
3. **Copy and paste this code:**

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const PLATFORM_FEE_PERCENTAGE = 0.20;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe is not configured. Please add your Stripe Secret Key.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const { rideId, paymentMethodId } = await req.json();

    if (!rideId || !paymentMethodId) {
      return new Response(
        JSON.stringify({ error: 'rideId and paymentMethodId are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (rideError || !ride) {
      return new Response(
        JSON.stringify({ error: 'Ride not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: rider, error: riderError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', ride.rider_id)
      .single();

    if (riderError || !rider) {
      return new Response(
        JSON.stringify({ error: 'Rider not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const amountInCents = Math.round(ride.fare_estimate * 100);
    const platformFee = Math.round(ride.fare_estimate * PLATFORM_FEE_PERCENTAGE * 100);
    const driverEarnings = amountInCents - platformFee;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method: paymentMethodId,
      customer: rider.stripe_customer_id || undefined,
      capture_method: 'manual',
      description: `FairFare Ride ${rideId}`,
      metadata: {
        ride_id: rideId,
        rider_id: ride.rider_id,
        driver_id: ride.driver_id || 'unassigned',
      },
    });

    await supabase
      .from('rides')
      .update({
        payment_intent_id: paymentIntent.id,
        payment_method_id: paymentMethodId,
        payment_status: 'authorized',
        platform_fee: platformFee / 100,
        driver_earnings: driverEarnings / 100,
      })
      .eq('id', rideId);

    await supabase.from('transactions').insert({
      ride_id: rideId,
      user_id: ride.rider_id,
      transaction_type: 'charge',
      amount: ride.fare_estimate,
      currency: 'usd',
      stripe_transaction_id: paymentIntent.id,
      status: 'pending',
      metadata: { platform_fee: platformFee / 100, driver_earnings: driverEarnings / 100 },
    });

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in create-payment-intent:', error);
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

4. Click **Deploy**

---

### Step 5: Deploy Function 3 - `capture-payment`

1. Click **Create a new function**
2. **Function name:** `capture-payment`
3. **Copy code from:** `C:\Users\koshi\apps-deve\supabase\functions\capture-payment\index.ts`
   - Open that file and copy all contents
4. Paste and click **Deploy**

---

### Step 6: Deploy Function 4 - `match-driver`

1. Click **Create a new function**
2. **Function name:** `match-driver`
3. **Copy code from:** `C:\Users\koshi\apps-deve\supabase\functions\match-driver\index.ts`
   - Open that file and copy all contents
4. Paste and click **Deploy**

---

## ✅ Verify Deployment

1. Go back to **Edge Functions** in Supabase Dashboard
2. You should see all 4 functions listed:
   - ✅ `add-payment-method` (Active)
   - ✅ `create-payment-intent` (Active)
   - ✅ `capture-payment` (Active)
   - ✅ `match-driver` (Active)

---

## 🧪 Test It

1. Refresh your app (http://localhost:5173)
2. Go to Payment Methods page
3. Try adding a card
4. The error should be gone! ✅

---

## 🐛 If It Still Doesn't Work

1. **Check function logs:**
   - Click on a function name in Dashboard
   - Check "Logs" tab for errors

2. **Verify Stripe secret:**
   - Go to Settings → Edge Functions → Secrets
   - Make sure `STRIPE_SECRET_KEY` is set correctly

3. **Check function URL:**
   - Function URL should be: `https://YOUR_PROJECT.supabase.co/functions/v1/FUNCTION_NAME`
   - Verify this matches your `.env` `VITE_SUPABASE_URL`

---

**That's it! Your payment functions should now work! 🎉**


