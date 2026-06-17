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

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    const { data: authData } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null } };

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
      description: `World Cup Transport Ride ${rideId}`,
      metadata: {
        ride_id: rideId,
        rider_id: ride.rider_id,
        driver_id: ride.driver_id || 'unassigned',
      },
    });

    const rideUpdatePayload = {
      payment_intent_id: paymentIntent.id,
      payment_method_id: paymentMethodId,
      payment_status: 'authorized',
      platform_fee: platformFee / 100,
      driver_earnings: driverEarnings / 100,
    };

    console.log('[create-payment-intent] update', {
      table: 'rides',
      authenticatedUserId: authData.user?.id ?? null,
      payload: rideUpdatePayload,
      rideId,
    });

    await supabase
      .from('rides')
      .update(rideUpdatePayload)
      .eq('id', rideId);

    const transactionPayload = {
      ride_id: rideId,
      user_id: ride.rider_id,
      transaction_type: 'charge',
      amount: ride.fare_estimate,
      currency: 'usd',
      stripe_transaction_id: paymentIntent.id,
      status: 'pending',
      metadata: { platform_fee: platformFee / 100, driver_earnings: driverEarnings / 100 },
    };

    console.log('[create-payment-intent] insert', {
      table: 'transactions',
      authenticatedUserId: authData.user?.id ?? null,
      payload: transactionPayload,
    });

    await supabase.from('transactions').insert(transactionPayload);

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
  } catch (error) {
    console.error('Error in create-payment-intent:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
