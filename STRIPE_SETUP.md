# Stripe Payment Integration - Complete Setup Guide

## Overview

FairFare uses Stripe for secure payment processing with a marketplace model:
- **Riders** pay for rides via credit/debit cards
- **Platform** (FairFare) collects payment and takes 20% fee
- **Drivers** receive 80% of the fare (automated payouts via Stripe Connect)

---

## Step 1: Create Stripe Account

### 1.1 Sign Up
1. Go to https://dashboard.stripe.com/register
2. Create account with your email
3. Verify your email address
4. Complete business information (can skip for testing)

### 1.2 Activate Test Mode
- In Stripe Dashboard, ensure **Test Mode** toggle (top-right) is ON
- Test mode allows you to test payments without real money
- You'll switch to Live Mode after thorough testing

---

## Step 2: Get Your API Keys

### 2.1 Access API Keys
1. Log into Stripe Dashboard
2. Click **Developers** in left sidebar
3. Click **API keys**
4. You'll see two keys:
   - **Publishable key** (pk_test_...) - Safe to expose publicly
   - **Secret key** (sk_test_...) - Must be kept secret

### 2.2 Copy Your Keys
```
Publishable Key: pk_test_51ABC...
Secret Key: sk_test_51XYZ... (click "Reveal" to see it)
```

---

## Step 3: Configure FairFare Application

### 3.1 Add Frontend Key (Publishable Key)

Add to your `.env` file:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC123...
```

### 3.2 Add Backend Key (Secret Key)

**IMPORTANT:** The secret key is automatically configured in Supabase Edge Functions. You DO NOT need to manually add it anywhere. Supabase securely manages this for you.

However, if you need to update it:
1. Go to your Supabase Project Dashboard
2. Navigate to Edge Functions settings
3. The STRIPE_SECRET_KEY environment variable is auto-configured

---

## Step 4: Test Credit Cards

Stripe provides test card numbers for development:

### Valid Test Cards
```
Card Number: 4242 4242 4242 4242
Brand: Visa
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)

Card Number: 5555 5555 5555 4444
Brand: Mastercard

Card Number: 3782 822463 10005
Brand: American Express (use 4 digit CVC)
```

###Declined Card
```
Card Number: 4000 0000 0000 0002
Result: Card will be declined
```

### 3D Secure Test Card
```
Card Number: 4000 0025 0000 3155
Result: Requires 3D Secure authentication
```

---

## Step 5: Test Payment Flow

### 5.1 Add Payment Method (Rider)
1. Sign up as a Rider
2. Navigate to `/rider/payment-methods`
3. Click "Add Payment Method"
4. Enter test card: `4242 4242 4242 4242`
5. Expiry: `12/25`, CVC: `123`, ZIP: `12345`
6. Click "Add Payment Method"
7. Card should appear in saved cards list

### 5.2 Request a Ride
1. Go to Rider Dashboard
2. Enter pickup and dropoff locations
3. Review fare estimate (e.g., $12.50)
4. Click "Request Ride"

### 5.3 Payment Authorization
When you request a ride:
- Payment is **authorized** (held) but NOT charged yet
- Rider sees "Payment Authorized" status
- Funds are reserved on the card
- You have 7 days to capture or cancel

### 5.4 Complete Ride & Capture Payment
1. Sign in as Driver (or admin)
2. Accept the ride
3. Complete the trip
4. When status → "Completed":
   - Payment is automatically **captured** (charged)
   - Platform fee (20%) is calculated
   - Driver earnings (80%) are recorded
   - Transaction appears in Stripe Dashboard

---

## Step 6: Verify in Stripe Dashboard

### 6.1 View Payments
1. Go to Stripe Dashboard
2. Click **Payments** in sidebar
3. You'll see all test transactions
4. Click any payment to see details:
   - Amount charged
   - Card used
   - Metadata (ride ID, rider ID, driver ID)
   - Timeline of events

### 6.2 Check Payment Intents
1. Click **Payments** → **Payment Intents**
2. See authorization and capture events
3. Verify metadata contains ride information

---

## Step 7: Understanding the Payment Flow

### Authorize → Capture Flow (Industry Best Practice)

**Why this flow?**
- Authorize when ride is requested/accepted
- Capture when ride completes
- If canceled, authorization is released (no charge)

**Timeline:**
```
1. Rider requests ride
   → Payment Intent created (not charged yet)

2. Driver accepts
   → Payment authorized (funds held)

3. Trip starts
   → Authorization still held

4. Trip completes
   → Payment captured (charged)
   → Driver earnings recorded
   → Platform fee deducted

5. Canceled ride
   → Authorization released
   → No charge to rider
```

---

## Step 8: Platform Fee & Driver Earnings

### Fee Structure
- **Gross Fare:** $12.50 (example)
- **Platform Fee:** $2.50 (20%)
- **Driver Earnings:** $10.00 (80%)

### How It Works
1. Rider is charged $12.50
2. FairFare keeps $2.50 platform fee
3. Driver receives $10.00 (via Stripe Connect payout)

### Database Records
After ride completion:
- `rides` table: `platform_fee = 2.50`, `driver_earnings = 10.00`
- `transactions` table: Records the charge
- `driver_earnings` table: Records driver's payout (pending)

---

## Step 9: Stripe Connect (Driver Payouts)

### Overview
Stripe Connect allows you to pay drivers automatically.

### Setup (Future Phase)
1. Drivers complete Stripe Connect onboarding
2. They provide bank account information
3. Platform automatically transfers earnings to driver accounts
4. Stripe handles compliance, tax forms (1099), etc.

### Current MVP Status
- Payment capture: ✅ Implemented
- Driver earnings tracking: ✅ Implemented
- Automated payouts: ⏳ Phase 2 (requires Connect setup)

**For MVP:** Track earnings in database, pay drivers manually.

---

## Step 10: Going Live (Production)

### Prerequisites
1. **Business Verification**
   - Legal business name
   - Business address
   - Tax ID (EIN or SSN)
   - Bank account for payouts

2. **Identity Verification**
   - Government-issued ID
   - Proof of address (sometimes required)

3. **Compliance**
   - Terms of Service
   - Privacy Policy
   - Refund Policy

### Activation Process
1. In Stripe Dashboard, click **Activate Account**
2. Complete onboarding form
3. Submit required documents
4. Wait for approval (1-2 business days)

### Switch to Live Mode
1. Once approved, toggle **Test Mode OFF**
2. Get your **Live API Keys**:
   - `pk_live_...` (Publishable)
   - `sk_live_...` (Secret)
3. Update `.env` file with live keys
4. Test with real (small) transaction
5. Launch!

---

## Pricing & Fees

### Stripe Fees (Standard Pricing)
- **Per Transaction:** 2.9% + $0.30
- **International Cards:** +1.5%
- **Currency Conversion:** +1%
- **No monthly fee**
- **No setup fee**

### Example Calculation
```
Ride Fare: $12.50

Stripe Fee: (12.50 × 0.029) + 0.30 = $0.66
Net to Platform: $12.50 - $0.66 = $11.84

Platform Fee (20% of fare): $2.50
Driver Earnings: $12.50 - $2.50 = $10.00

Your Net Revenue: $2.50 - $0.66 = $1.84 per ride
Driver Receives: $10.00 (80% of fare)
```

---

## Security Best Practices

### ✅ Current Implementation
- Secret key stored securely in Supabase (not in frontend code)
- Card details never touch your servers (handled by Stripe)
- Payment methods tokenized (only save token, not card number)
- PCI DSS Level 1 compliant (via Stripe)
- HTTPS enforced

### ✅ Best Practices Followed
- Authorize → Capture flow (prevents overcharging)
- Payment Intent IDs stored (for reconciliation)
- Failed payments logged
- Refunds supported via Stripe Dashboard

---

## Troubleshooting

### "Stripe is not configured" Error
**Cause:** Missing `VITE_STRIPE_PUBLISHABLE_KEY` in `.env`
**Fix:** Add the key and restart dev server

### "Payment failed" Error
**Check:**
1. Card number is valid test card
2. Expiry is future date
3. Stripe is in Test Mode
4. Check browser console for detailed error

### Payment Authorized but Not Captured
**Cause:** Ride not marked as "completed"
**Fix:** Complete the ride through driver app

### Driver Not Receiving Earnings
**Current Status:** Earnings are tracked in database
**Phase 2:** Set up Stripe Connect for automatic payouts

---

## API Reference

### Edge Functions

#### 1. Create Payment Intent
```
POST /functions/v1/create-payment-intent
Body: {
  rideId: "uuid",
  paymentMethodId: "pm_..."
}
Response: {
  success: true,
  paymentIntentId: "pi_...",
  clientSecret: "pi_...secret..."
}
```

#### 2. Capture Payment
```
POST /functions/v1/capture-payment
Body: {
  rideId: "uuid"
}
Response: {
  success: true,
  amountCaptured: 12.50
}
```

#### 3. Add Payment Method
```
POST /functions/v1/add-payment-method
Body: {
  paymentMethodId: "pm_...",
  userId: "uuid",
  setAsDefault: true
}
Response: {
  success: true,
  paymentMethod: {...}
}
```

---

## Database Schema

### payment_methods Table
```sql
- id (uuid)
- user_id (uuid) → profiles.id
- stripe_payment_method_id (text)
- card_brand (text) - e.g., "visa"
- card_last4 (text) - e.g., "4242"
- card_exp_month (integer)
- card_exp_year (integer)
- is_default (boolean)
```

### transactions Table
```sql
- id (uuid)
- ride_id (uuid) → rides.id
- user_id (uuid) → profiles.id
- transaction_type (charge | refund | payout)
- amount (numeric)
- stripe_transaction_id (text)
- status (pending | succeeded | failed)
```

### driver_earnings Table
```sql
- id (uuid)
- driver_profile_id (uuid)
- ride_id (uuid)
- gross_amount (numeric) - Full fare
- platform_fee (numeric) - 20%
- net_amount (numeric) - 80% to driver
- payout_status (pending | paid)
```

---

## Support & Resources

### Stripe Documentation
- **Dashboard:** https://dashboard.stripe.com
- **Docs:** https://stripe.com/docs
- **API Reference:** https://stripe.com/docs/api
- **Testing:** https://stripe.com/docs/testing

### FairFare Support
- Check `IMPLEMENTATION.md` for system architecture
- Review Edge Function logs in Supabase Dashboard
- Test in Stripe Test Mode before going live

---

## Checklist

### Setup Checklist
- [ ] Created Stripe account
- [ ] Copied API keys (publishable & secret)
- [ ] Added `VITE_STRIPE_PUBLISHABLE_KEY` to `.env`
- [ ] Restarted development server
- [ ] Tested adding payment method
- [ ] Tested full ride flow with payment
- [ ] Verified payment in Stripe Dashboard
- [ ] Reviewed fee structure and earnings

### Pre-Launch Checklist (Production)
- [ ] Completed Stripe business verification
- [ ] Uploaded required documents
- [ ] Account activated by Stripe
- [ ] Switched to Live API keys
- [ ] Updated `.env` with live keys
- [ ] Tested with small real transaction
- [ ] Set up Stripe Connect for driver payouts
- [ ] Configured webhooks (future enhancement)
- [ ] Reviewed Stripe compliance requirements

---

**Document Version:** 1.0
**Last Updated:** December 2025
**Status:** Stripe Integration Complete
