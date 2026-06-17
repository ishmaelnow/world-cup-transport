# 🔧 Fix: Payment Method Not Saving to Database

## The Problem

✅ Setup intent created successfully  
✅ Frontend shows "Payment method added successfully!"  
❌ But payment method isn't saved to database  
❌ Shows "No payment methods added yet"

## Root Cause

The payment method should be saved via:
1. **Webhook** (when Stripe sends `setup_intent.succeeded` event) - NOT deployed yet
2. **OR** directly in the frontend after setup intent succeeds

## ✅ Solution: Update Function to Save Payment Method

We need to update the `add-payment-method` function to save the payment method to the database after creating the setup intent.

### Updated Function Code

Go to Supabase → Edge Functions → `add-payment-method` → Edit, and replace with:

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      timeout: 20000,
    });

    const { userId, paymentMethodId } = await req.json();

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

    // If paymentMethodId is provided, save it directly
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

## 🔄 Alternative: Update Frontend to Save After Setup Intent

**OR** update the frontend to save the payment method after setup intent succeeds:

Update `PaymentMethods.tsx` after line 75:

```typescript
if (setupIntent?.status === 'succeeded') {
  // Save payment method to database
  const paymentMethodId = setupIntent.payment_method;
  
  if (paymentMethodId) {
    // Call function to save payment method
    const saveResponse = await fetch(`${supabaseUrl}/functions/v1/add-payment-method`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userId: user.id,
        paymentMethodId: paymentMethodId 
      }),
    });
    
    if (saveResponse.ok) {
      onSuccess();
    } else {
      throw new Error('Failed to save payment method');
    }
  } else {
    onSuccess();
  }
}
```

---

## 🎯 Recommended Approach

**Update the function** (first option) - it's cleaner and handles both cases:
- Creating setup intent (when paymentMethodId not provided)
- Saving payment method (when paymentMethodId is provided)

Then update frontend to call it twice:
1. First call: Get setup intent
2. After confirming: Call again with paymentMethodId to save

---

**Update the function code above, then test again!**


