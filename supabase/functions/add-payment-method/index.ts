import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

async function getOrCreateStripeCustomer(
  stripe: Stripe,
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Profile not found for payment setup: ${profileError?.message || userId}`);
  }

  if (profile.stripe_customer_id) {
    try {
      const existingCustomer = await stripe.customers.retrieve(profile.stripe_customer_id);
      if (!('deleted' in existingCustomer && existingCustomer.deleted)) {
        return existingCustomer;
      }
    } catch (error) {
      console.warn('Stored Stripe customer could not be retrieved; creating a new one', {
        userId,
        stripeCustomerId: profile.stripe_customer_id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  const customer = await stripe.customers.create({
    name: profile.full_name || undefined,
    metadata: {
      user_id: userId,
    },
  });

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Failed to save Stripe customer: ${updateError.message}`);
  }

  return customer;
}

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

    const customer = await getOrCreateStripeCustomer(stripe, supabase, userId);

    // If paymentMethodId is provided, save it to database
    if (paymentMethodId) {
      console.log('Saving payment method:', paymentMethodId);
      
      // Get payment method details from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      const paymentMethodCustomerId = typeof paymentMethod.customer === 'string'
        ? paymentMethod.customer
        : paymentMethod.customer?.id;

      if (paymentMethodCustomerId && paymentMethodCustomerId !== customer.id) {
        throw new Error('Payment method belongs to a different Stripe customer.');
      }

      if (!paymentMethodCustomerId) {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customer.id,
        });
      }

      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
      
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
      customer: customer.id,
      usage: 'off_session',
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
  } catch (error) {
    console.error('Error in add-payment-method:', error);
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
