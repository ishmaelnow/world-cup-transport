# 🚀 Deploy Edge Functions Now - Step by Step

## ✅ Step 1: Secret Saved - Great!
You've saved `STRIPE_SECRET_KEY` in Edge Functions secrets. Perfect!

---

## 📝 Step 2: Deploy the Functions

You need to deploy **4 functions**. Here's how:

### Function 1: `add-payment-method`

1. In Edge Functions page, click **"Create a new function"** or **"New Function"**
2. **Function name:** `add-payment-method`
3. **Copy this code:**

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

4. Paste into the code editor
5. Click **"Deploy"** or **"Save"**

---

### Function 2: `create-payment-intent`

1. Click **"Create a new function"** again
2. **Function name:** `create-payment-intent`
3. **Copy this code:**

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

4. Paste and click **"Deploy"**

---

### Function 3: `capture-payment`

1. Click **"Create a new function"**
2. **Function name:** `capture-payment`
3. **Open this file on your computer:**
   - `C:\Users\koshi\apps-deve\supabase\functions\capture-payment\index.ts`
4. **Copy ALL the code** from that file
5. Paste into Supabase editor
6. Click **"Deploy"**

---

### Function 4: `match-driver`

1. Click **"Create a new function"**
2. **Function name:** `match-driver`
3. **Open this file on your computer:**
   - `C:\Users\koshi\apps-deve\supabase\functions\match-driver\index.ts`
4. **Copy ALL the code** from that file
5. Paste into Supabase editor
6. Click **"Deploy"**

---

## ✅ After Deploying All 4 Functions

You should see:
- ✅ `add-payment-method` (Active)
- ✅ `create-payment-intent` (Active)
- ✅ `capture-payment` (Active)
- ✅ `match-driver` (Active)

---

## 🧪 Test It

1. Go back to your app: http://localhost:5173
2. Refresh the page
3. Go to Payment Methods
4. Try adding a card
5. **The error should be gone!** ✅

---

## 📝 Quick Checklist

- [x] Secret saved (`STRIPE_SECRET_KEY`)
- [ ] Function 1: `add-payment-method` deployed
- [ ] Function 2: `create-payment-intent` deployed
- [ ] Function 3: `capture-payment` deployed
- [ ] Function 4: `match-driver` deployed
- [ ] Test adding payment method in app

---

**Start with Function 1 (`add-payment-method`) - that's the one causing the error!**


