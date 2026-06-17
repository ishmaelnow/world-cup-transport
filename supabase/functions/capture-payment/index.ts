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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const { rideId } = await req.json();

    if (!rideId) {
      return new Response(
        JSON.stringify({ error: 'rideId is required' }),
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

    if (!ride.payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'No payment intent found for this ride' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (ride.payment_status === 'captured') {
      return new Response(
        JSON.stringify({ message: 'Payment already captured' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const paymentIntent = await stripe.paymentIntents.capture(ride.payment_intent_id);

    const finalAmount = ride.fare_final || ride.fare_estimate;

    await supabase
      .from('rides')
      .update({
        payment_status: 'captured',
        fare_final: finalAmount,
      })
      .eq('id', rideId);

    await supabase
      .from('transactions')
      .update({ status: 'succeeded' })
      .eq('stripe_transaction_id', ride.payment_intent_id);

    if (ride.driver_id) {
      await supabase.from('driver_earnings').insert({
        driver_profile_id: ride.driver_id,
        ride_id: rideId,
        gross_amount: finalAmount,
        platform_fee: ride.platform_fee,
        net_amount: ride.driver_earnings,
        payout_status: 'pending',
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        amountCaptured: paymentIntent.amount_received / 100,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in capture-payment:', error);
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
