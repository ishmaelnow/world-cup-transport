# 📝 How to Update Edge Function - Step by Step

## Step 1: Open the Function in Supabase

1. Go to **Supabase Dashboard**
2. Click **Edge Functions** in left sidebar
3. Click on **`add-payment-method`** function name
4. Click the **"Code"** tab (at the top, next to "Overview", "Invocations", "Logs", etc.)

---

## Step 2: Get the Updated Code

The updated code is in this file on your computer:
```
C:\Users\koshi\apps-deve\supabase\functions\add-payment-method\index.ts
```

**OR** copy the code below (complete updated function):

---

## Step 3: Copy the Complete Code

Copy this ENTIRE code block:

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
    const { userId, paymentMethodId } = await req.json();
    console.log('Request params:', { userId, paymentMethodId });

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

    // If paymentMethodId is provided, save it to database
    if (paymentMethodId) {
      console.log('Saving payment method:', paymentMethodId);
      
      // Get payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
      
      // Check if payment method already exists
      const { data: existingMethods } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', userId)
        .eq('stripe_payment_method_id', paymentMethodId);

      if (existingMethods && existingMethods.length > 0) {
        console.log('Payment method already exists');
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Payment method already saved',
            paymentMethodId: paymentMethodId
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check if this is the first payment method
      const { data: allMethods } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', userId);

      const isFirstPaymentMethod = !allMethods || allMethods.length === 0;

      // Save to database
      const { error: dbError } = await supabase
        .from('payment_methods')
        .insert({
          user_id: userId,
          stripe_payment_method_id: paymentMethodId,
          card_brand: paymentMethod.card?.brand || 'unknown',
          card_last4: paymentMethod.card?.last4 || '0000',
          card_exp_month: paymentMethod.card?.exp_month || 1,
          card_exp_year: paymentMethod.card?.exp_year || 2099,
          is_default: isFirstPaymentMethod,
        });

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(
          JSON.stringify({ error: 'Failed to save payment method: ' + dbError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('Payment method saved successfully');
      return new Response(
        JSON.stringify({ 
          success: true,
          paymentMethodId: paymentMethodId
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Otherwise, create setup intent (original behavior)
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
        setupIntentId: setupIntent.id,
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

## Step 4: Replace the Code in Supabase

1. In the **Code** tab, **select all** the existing code (Ctrl+A or Cmd+A)
2. **Delete** it
3. **Paste** the new code above
4. Click **"Deploy"** or **"Save"** button (usually at bottom right)
5. Wait for deployment to complete

---

## Step 5: Verify

1. Check that deployment succeeded (should show "Active" status)
2. Go back to your app
3. Refresh the page
4. Try adding a payment method again
5. It should now save to the database! ✅

---

## 📍 File Location

The updated code file is located at:
```
C:\Users\koshi\apps-deve\supabase\functions\add-payment-method\index.ts
```

You can open this file in any text editor to view/copy the code.

---

## 🎯 Quick Summary

1. Supabase Dashboard → Edge Functions → `add-payment-method` → **Code** tab
2. Select all → Delete → Paste new code
3. Click **Deploy**
4. Test in your app!

---

**That's it! The function will now save payment methods to the database.**


