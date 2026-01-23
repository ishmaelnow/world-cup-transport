import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error('❌ Stripe publishable key is not configured');
      console.error('Please check your .env file for VITE_STRIPE_PUBLISHABLE_KEY');
      return null;
    }

    if (!publishableKey.startsWith('pk_')) {
      console.error('❌ Invalid Stripe key format. Key should start with pk_');
      return null;
    }

    console.log('🔄 Initializing Stripe...');
    console.log('📝 Using key:', publishableKey.substring(0, 20) + '...');

    stripePromise = loadStripe(publishableKey).then(stripe => {
      if (stripe) {
        console.log('✅ Stripe loaded successfully');
        console.log('Stripe instance:', stripe);
      } else {
        console.error('❌ Failed to load Stripe - returned null');
      }
      return stripe;
    }).catch(error => {
      console.error('❌ Error loading Stripe:', error);
      console.error('This might be caused by:');
      console.error('1. Network connection issues');
      console.error('2. Ad blocker or browser extension');
      console.error('3. Invalid Stripe publishable key');
      console.error('4. Stripe.js script blocked by CSP');
      return null;
    });
  }
  return stripePromise;
};

export const PLATFORM_FEE_PERCENTAGE = 0.20;

export function calculatePlatformFee(fareAmount: number): number {
  return Number((fareAmount * PLATFORM_FEE_PERCENTAGE).toFixed(2));
}

export function calculateDriverEarnings(fareAmount: number): number {
  const platformFee = calculatePlatformFee(fareAmount);
  return Number((fareAmount - platformFee).toFixed(2));
}

export interface PaymentMethodDetails {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}
