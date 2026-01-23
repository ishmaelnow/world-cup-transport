-- Payment System Schema for FairFare
-- 
-- Overview: Stripe-based payment system with Connect for driver payouts
-- Architecture: Platform (FairFare) collects from riders, pays drivers via Connect
-- 
-- New Tables:
--   1. payment_methods - Tokenized payment methods for riders
--   2. transactions - All payment transactions (charges, refunds, payouts)
--   3. driver_earnings - Driver payout tracking and history
-- 
-- Updates:
--   - driver_profiles: Add stripe_connect_account_id
--   - rides: Add payment status fields

-- =====================================================
-- 1. UPDATE EXISTING TABLES
-- =====================================================

-- Add Stripe Connect account to driver profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'driver_profiles' AND column_name = 'stripe_connect_account_id'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN stripe_connect_account_id text;
    ALTER TABLE driver_profiles ADD COLUMN connect_onboarding_completed boolean DEFAULT false;
    ALTER TABLE driver_profiles ADD COLUMN total_earnings numeric DEFAULT 0;
  END IF;
END $$;

-- Add payment fields to rides
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rides' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE rides ADD COLUMN payment_status text DEFAULT 'pending' 
      CHECK (payment_status IN ('pending', 'authorized', 'captured', 'failed', 'refunded'));
    ALTER TABLE rides ADD COLUMN payment_intent_id text;
    ALTER TABLE rides ADD COLUMN payment_method_id text;
    ALTER TABLE rides ADD COLUMN platform_fee numeric DEFAULT 0;
    ALTER TABLE rides ADD COLUMN driver_earnings numeric DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- 2. PAYMENT METHODS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_method_id text NOT NULL,
  card_brand text,
  card_last4 text,
  card_exp_month integer,
  card_exp_year integer,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own payment methods"
  ON payment_methods FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id, is_default) WHERE is_default = true;

-- =====================================================
-- 3. TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('charge', 'refund', 'payout', 'platform_fee')),
  amount numeric NOT NULL,
  currency text DEFAULT 'usd',
  stripe_transaction_id text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  failure_reason text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ride_id ON transactions(ride_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- =====================================================
-- 4. DRIVER EARNINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_profile_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
  gross_amount numeric NOT NULL,
  platform_fee numeric NOT NULL,
  net_amount numeric NOT NULL,
  payout_status text DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
  payout_id text,
  payout_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own earnings"
  ON driver_earnings FOR SELECT
  TO authenticated
  USING (
    driver_profile_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all earnings"
  ON driver_earnings FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_ride_id ON driver_earnings(ride_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_status ON driver_earnings(payout_status);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_created_at ON driver_earnings(created_at DESC);

-- =====================================================
-- 5. FUNCTIONS AND TRIGGERS
-- =====================================================

-- Trigger to update driver total earnings
CREATE OR REPLACE FUNCTION update_driver_total_earnings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payout_status = 'paid' AND (OLD.payout_status IS NULL OR OLD.payout_status != 'paid') THEN
    UPDATE driver_profiles
    SET total_earnings = total_earnings + NEW.net_amount
    WHERE id = NEW.driver_profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_driver_earnings_trigger'
  ) THEN
    CREATE TRIGGER update_driver_earnings_trigger
      AFTER UPDATE ON driver_earnings
      FOR EACH ROW
      EXECUTE FUNCTION update_driver_total_earnings();
  END IF;
END $$;

-- Trigger to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION ensure_single_default_payment_method()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE payment_methods
    SET is_default = false
    WHERE user_id = NEW.user_id AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_default_payment_method_trigger'
  ) THEN
    CREATE TRIGGER ensure_default_payment_method_trigger
      BEFORE INSERT OR UPDATE ON payment_methods
      FOR EACH ROW
      WHEN (NEW.is_default = true)
      EXECUTE FUNCTION ensure_single_default_payment_method();
  END IF;
END $$;