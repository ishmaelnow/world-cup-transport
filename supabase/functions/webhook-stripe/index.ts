import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Stripe-Signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature provided");
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!stripeSecretKey || !webhookSecret) {
      throw new Error("Stripe keys not configured");
    }

    const body = await req.text();

    const verifyResponse = await fetch("https://api.stripe.com/v1/events", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Signature": signature,
      },
      body: `payload=${encodeURIComponent(body)}&secret=${webhookSecret}`,
    });

    if (!verifyResponse.ok) {
      throw new Error("Webhook signature verification failed");
    }

    const event = JSON.parse(body);
    console.log("Received Stripe event:", event.type);

    if (event.type === "setup_intent.succeeded") {
      const setupIntent = event.data.object;
      const userId = setupIntent.metadata?.user_id;

      if (!userId) {
        console.error("No user ID in setup intent metadata");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: corsHeaders
        });
      }

      const paymentMethodId = setupIntent.payment_method;

      const paymentMethodResponse = await fetch(
        `https://api.stripe.com/v1/payment_methods/${paymentMethodId}`,
        {
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
          },
        }
      );

      const paymentMethod = await paymentMethodResponse.json();

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: existingMethods } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', userId);

      const isFirstPaymentMethod = !existingMethods || existingMethods.length === 0;

      const { error: dbError } = await supabase
        .from("payment_methods")
        .insert({
          user_id: userId,
          stripe_payment_method_id: paymentMethodId,
          card_brand: paymentMethod.card?.brand || "unknown",
          card_last4: paymentMethod.card?.last4 || "0000",
          card_exp_month: paymentMethod.card?.exp_month || 1,
          card_exp_year: paymentMethod.card?.exp_year || 2099,
          is_default: isFirstPaymentMethod,
        });

      if (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }

      console.log("Payment method saved successfully");
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id;

      if (!userId) {
        console.error("No user ID in session");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: corsHeaders
        });
      }

      const setupIntentId = session.setup_intent;

      const setupIntentResponse = await fetch(
        `https://api.stripe.com/v1/setup_intents/${setupIntentId}`,
        {
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
          },
        }
      );

      const setupIntent = await setupIntentResponse.json();
      const paymentMethodId = setupIntent.payment_method;

      const paymentMethodResponse = await fetch(
        `https://api.stripe.com/v1/payment_methods/${paymentMethodId}`,
        {
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
          },
        }
      );

      const paymentMethod = await paymentMethodResponse.json();

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: existingMethods } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', userId);

      const isFirstPaymentMethod = !existingMethods || existingMethods.length === 0;

      const { error: dbError } = await supabase
        .from("payment_methods")
        .insert({
          user_id: userId,
          stripe_payment_method_id: paymentMethodId,
          card_brand: paymentMethod.card?.brand || "unknown",
          card_last4: paymentMethod.card?.last4 || "0000",
          card_exp_month: paymentMethod.card?.exp_month || 1,
          card_exp_year: paymentMethod.card?.exp_year || 2099,
          is_default: isFirstPaymentMethod,
        });

      if (dbError) {
        console.error("Database error:", dbError);
        throw dbError;
      }

      console.log("Payment method saved successfully");
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});