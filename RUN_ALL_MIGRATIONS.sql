-- =====================================================
-- FairFare Database Migrations - Run All At Once
-- =====================================================
-- Copy and paste this entire file into Supabase SQL Editor
-- Then click "Run" to execute all migrations
-- =====================================================

-- Migration 1: Core Schema
-- FairFare Rideshare Platform - Core Schema
-- 
-- Overview: Complete database schema for FairFare MVP rideshare platform
-- Includes: profiles, driver_profiles, rides, trip_locations tables
-- Security: Row Level Security enabled on all tables

-- =====================================================
-- 1. CREATE ALL TABLES FIRST
-- =====================================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('rider', 'driver', 'admin')),
  full_name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Driver profiles table
CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  vehicle_make text NOT NULL DEFAULT '',
  vehicle_model text NOT NULL DEFAULT '',
  vehicle_year integer,
  vehicle_color text NOT NULL DEFAULT '',
  vehicle_plate text NOT NULL DEFAULT '',
  license_number text NOT NULL DEFAULT '',
  is_available boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_location_lat numeric,
  last_location_lng numeric,
  last_location_updated_at timestamptz,
  rating_avg numeric DEFAULT 5.0,
  total_trips integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES driver_profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'requested' 
    CHECK (status IN ('requested', 'matching', 'accepted', 'arriving', 'in_progress', 'completed', 'canceled')),
  pickup_address text NOT NULL,
  pickup_lat numeric NOT NULL,
  pickup_lng numeric NOT NULL,
  dropoff_address text NOT NULL,
  dropoff_lat numeric NOT NULL,
  dropoff_lng numeric NOT NULL,
  fare_estimate numeric NOT NULL DEFAULT 0,
  fare_final numeric,
  distance_miles numeric DEFAULT 0,
  duration_minutes integer DEFAULT 0,
  requested_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  canceled_at timestamptz,
  canceled_by text CHECK (canceled_by IN ('rider', 'driver', 'admin'))
);

-- Trip locations table
CREATE TABLE IF NOT EXISTS trip_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Driver profiles policies
CREATE POLICY "Drivers can view own profile"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Drivers can update own profile"
  ON driver_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Drivers can insert own profile"
  ON driver_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Rides policies
CREATE POLICY "Riders can view own rides"
  ON rides FOR SELECT
  TO authenticated
  USING (rider_id = auth.uid());

CREATE POLICY "Riders can insert own rides"
  ON rides FOR INSERT
  TO authenticated
  WITH CHECK (rider_id = auth.uid());

CREATE POLICY "Riders can update own rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (rider_id = auth.uid())
  WITH CHECK (rider_id = auth.uid());

-- Trip locations policies
CREATE POLICY "Riders can view locations for own rides"
  ON trip_locations FOR SELECT
  TO authenticated
  USING (
    ride_id IN (SELECT id FROM rides WHERE rider_id = auth.uid())
  );

CREATE POLICY "Drivers can insert locations for assigned rides"
  ON trip_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    ride_id IN (
      SELECT r.id FROM rides r
      JOIN driver_profiles dp ON r.driver_id = dp.id
      WHERE dp.user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view locations for assigned rides"
  ON trip_locations FOR SELECT
  TO authenticated
  USING (
    ride_id IN (
      SELECT r.id FROM rides r
      JOIN driver_profiles dp ON r.driver_id = dp.id
      WHERE dp.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_rides_rider_id ON rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_requested_at ON rides(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_availability ON driver_profiles(is_available, is_active);
CREATE INDEX IF NOT EXISTS idx_trip_locations_ride_id ON trip_locations(ride_id);
CREATE INDEX IF NOT EXISTS idx_trip_locations_recorded_at ON trip_locations(recorded_at DESC);

-- =====================================================
-- 5. CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_driver_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_driver_profiles_updated_at
      BEFORE UPDATE ON driver_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- Migration 2: Payment System
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

-- Payment methods table
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

-- Transactions table
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

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ride_id ON transactions(ride_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Driver earnings table
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

CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_profile_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_ride_id ON driver_earnings(ride_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_status ON driver_earnings(payout_status);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_created_at ON driver_earnings(created_at DESC);

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

-- =====================================================
-- Migration 3-5: Fix RLS Policies (Combined)
-- =====================================================

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    'rider'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to sync role to auth metadata
CREATE OR REPLACE FUNCTION sync_role_to_auth_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = 
    COALESCE(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_profile_role_to_auth ON profiles;
CREATE TRIGGER sync_profile_role_to_auth
  AFTER INSERT OR UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_role_to_auth_metadata();

-- Drop and recreate admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all driver profiles" ON driver_profiles;
CREATE POLICY "Admins can view all driver profiles"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update driver profiles" ON driver_profiles;
CREATE POLICY "Admins can update driver profiles"
  ON driver_profiles FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Drivers can view available rides for matching" ON rides;
CREATE POLICY "Drivers can view available rides for matching"
  ON rides FOR SELECT
  TO authenticated
  USING (
    status IN ('requested', 'matching')
    AND get_user_role() = 'driver'
  );

DROP POLICY IF EXISTS "Admins can view all rides" ON rides;
CREATE POLICY "Admins can view all rides"
  ON rides FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update all rides" ON rides;
CREATE POLICY "Admins can update all rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can view all trip locations" ON trip_locations;
CREATE POLICY "Admins can view all trip locations"
  ON trip_locations FOR SELECT
  TO authenticated
  USING (get_user_role() = 'admin');

-- Helper functions for driver/ride relationships
DROP FUNCTION IF EXISTS is_driver_for_ride(uuid) CASCADE;
CREATE OR REPLACE FUNCTION is_driver_for_ride(ride_driver_id uuid)
RETURNS boolean 
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = ride_driver_id
    AND user_id = auth.uid()
  );
$$;

DROP FUNCTION IF EXISTS can_view_driver_profile(uuid) CASCADE;
CREATE OR REPLACE FUNCTION can_view_driver_profile(check_driver_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM rides
    WHERE driver_id = check_driver_id
    AND rider_id = auth.uid()
    AND status IN ('accepted', 'arriving', 'in_progress')
  );
$$;

GRANT EXECUTE ON FUNCTION is_driver_for_ride(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_driver_profile(uuid) TO authenticated;

-- Driver ride policies
DROP POLICY IF EXISTS "Drivers can view assigned rides" ON rides;
CREATE POLICY "Drivers can view assigned rides"
  ON rides FOR SELECT
  TO authenticated
  USING (is_driver_for_ride(driver_id));

DROP POLICY IF EXISTS "Drivers can update assigned rides" ON rides;
CREATE POLICY "Drivers can update assigned rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (is_driver_for_ride(driver_id));

DROP POLICY IF EXISTS "Riders can view assigned driver details" ON driver_profiles;
CREATE POLICY "Riders can view assigned driver details"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (can_view_driver_profile(id));

-- Sync existing roles
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT id, role FROM profiles
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', profile_record.role)
    WHERE id = profile_record.id;
  END LOOP;
END $$;

-- =====================================================
-- Migration 6: Advanced Features
-- =====================================================

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  rider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES driver_profiles(id) ON DELETE CASCADE NOT NULL,
  rider_rating integer CHECK (rider_rating >= 1 AND rider_rating <= 5),
  driver_rating integer CHECK (driver_rating >= 1 AND driver_rating <= 5),
  rider_comment text,
  driver_comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ratings"
  ON ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = rider_id OR auth.uid() IN (SELECT user_id FROM driver_profiles WHERE id = driver_id));

CREATE POLICY "Riders can rate their completed rides"
  ON ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = rider_id 
    AND EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_id 
      AND rides.rider_id = auth.uid() 
      AND rides.status = 'completed'
    )
  );

CREATE POLICY "Riders can update their ratings"
  ON ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = rider_id)
  WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Drivers can update their ratings"
  ON ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM driver_profiles WHERE id = driver_id))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM driver_profiles WHERE id = driver_id));

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('ride_update', 'payment', 'verification', 'system', 'ride_request', 'ride_accepted', 'ride_completed', 'ride_cancelled', 'driver_application_submitted', 'driver_application_approved', 'driver_application_rejected', 'admin_alert')),
  read boolean DEFAULT false,
  ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Earnings table (if not exists from payment migration)
CREATE TABLE IF NOT EXISTS earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES driver_profiles(id) ON DELETE CASCADE NOT NULL,
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10, 2) NOT NULL,
  platform_fee decimal(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing')),
  payout_id text,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own earnings"
  ON earnings FOR SELECT
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM driver_profiles WHERE id = driver_id));

-- Add columns to driver_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'driver_name'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN driver_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN average_rating decimal(3, 2) DEFAULT 0;
  END IF;
END $$;

-- Add columns to rides
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'driver_current_lat'
  ) THEN
    ALTER TABLE rides ADD COLUMN driver_current_lat decimal(10, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'driver_current_lng'
  ) THEN
    ALTER TABLE rides ADD COLUMN driver_current_lng decimal(11, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'last_location_update'
  ) THEN
    ALTER TABLE rides ADD COLUMN last_location_update timestamptz;
  END IF;
END $$;

-- Add columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE profiles ADD COLUMN average_rating decimal(3, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'total_rides'
  ) THEN
    ALTER TABLE profiles ADD COLUMN total_rides integer DEFAULT 0;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ratings_ride_id ON ratings(ride_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rider_id ON ratings(rider_id);
CREATE INDEX IF NOT EXISTS idx_ratings_driver_id ON ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_earnings_driver_id ON earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);

-- =====================================================
-- Migration 7: Ride Notification Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION notify_ride_status_change()
RETURNS TRIGGER AS $$
DECLARE
  rider_user_id uuid;
  driver_user_id uuid;
  admin_id uuid;
BEGIN
  rider_user_id := NEW.rider_id;
  
  IF NEW.driver_id IS NOT NULL THEN
    SELECT user_id INTO driver_user_id 
    FROM driver_profiles 
    WHERE id = NEW.driver_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    FOR admin_id IN SELECT id FROM profiles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, ride_id)
      VALUES (
        admin_id,
        'New Ride Request',
        'A new ride has been requested from ' || SPLIT_PART(NEW.pickup_address, ',', 1) || ' to ' || SPLIT_PART(NEW.dropoff_address, ',', 1) || '.',
        'admin_alert',
        NEW.id
      );
    END LOOP;
    
    RETURN NEW;
  END IF;

  IF NEW.status = 'matching' AND (OLD.status IS NULL OR OLD.status != 'matching') THEN
    INSERT INTO notifications (user_id, title, message, type, ride_id)
    VALUES (
      rider_user_id,
      'Finding Your Driver',
      'We are searching for a nearby driver for your ride.',
      'ride_update',
      NEW.id
    );
  
  ELSIF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    INSERT INTO notifications (user_id, title, message, type, ride_id)
    VALUES (
      rider_user_id,
      'Driver Found!',
      'A driver has accepted your ride request and is on the way.',
      'ride_update',
      NEW.id
    );
  
  ELSIF NEW.status = 'arriving' AND (OLD.status IS NULL OR OLD.status != 'arriving') THEN
    INSERT INTO notifications (user_id, title, message, type, ride_id)
    VALUES (
      rider_user_id,
      'Driver Arriving',
      'Your driver is arriving at the pickup location.',
      'ride_update',
      NEW.id
    );
  
  ELSIF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
    INSERT INTO notifications (user_id, title, message, type, ride_id)
    VALUES (
      rider_user_id,
      'Trip Started',
      'Your trip has started. Enjoy your ride!',
      'ride_update',
      NEW.id
    );
  
  ELSIF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO notifications (user_id, title, message, type, ride_id)
    VALUES (
      rider_user_id,
      'Trip Completed',
      'Your trip has been completed. Thank you for using FairFare!',
      'ride_update',
      NEW.id
    );
    
    IF driver_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, ride_id)
      VALUES (
        driver_user_id,
        'Trip Completed',
        'You have successfully completed a trip.',
        'ride_update',
        NEW.id
      );
    END IF;
  
  ELSIF NEW.status = 'canceled' AND (OLD.status IS NULL OR OLD.status != 'canceled') THEN
    INSERT INTO notifications (user_id, title, message, type, ride_id)
    VALUES (
      rider_user_id,
      'Ride Canceled',
      'Your ride has been canceled.',
      'ride_update',
      NEW.id
    );
    
    IF driver_user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, ride_id)
      VALUES (
        driver_user_id,
        'Ride Canceled',
        'The ride has been canceled.',
        'ride_update',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_ride_status_notifications ON rides;
CREATE TRIGGER trigger_ride_status_notifications
  AFTER INSERT OR UPDATE OF status ON rides
  FOR EACH ROW
  EXECUTE FUNCTION notify_ride_status_change();

-- =====================================================
-- Migration 8: Earnings Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION create_earnings_on_ride_complete()
RETURNS TRIGGER AS $$
DECLARE
  driver_amount decimal(10, 2);
  platform_commission decimal(10, 2);
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') AND NEW.driver_id IS NOT NULL AND NEW.fare_final IS NOT NULL THEN
    platform_commission := (NEW.fare_final * 0.20);
    driver_amount := (NEW.fare_final - platform_commission);
    
    INSERT INTO earnings (
      driver_id,
      ride_id,
      amount,
      platform_fee,
      status
    ) VALUES (
      NEW.driver_id,
      NEW.id,
      driver_amount,
      platform_commission,
      'pending'
    )
    ON CONFLICT DO NOTHING;
    
    UPDATE driver_profiles
    SET 
      total_earnings = COALESCE(total_earnings, 0) + driver_amount,
      total_trips = COALESCE(total_trips, 0) + 1
    WHERE id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_earnings ON rides;
CREATE TRIGGER trigger_create_earnings
  AFTER UPDATE OF status ON rides
  FOR EACH ROW
  EXECUTE FUNCTION create_earnings_on_ride_complete();

-- =====================================================
-- Migration 9: Driver Applications (Simplified)
-- =====================================================

CREATE TABLE IF NOT EXISTS driver_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  vehicle_make text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_year integer NOT NULL CHECK (vehicle_year >= 1900 AND vehicle_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
  vehicle_color text NOT NULL,
  license_plate text NOT NULL,
  drivers_license text NOT NULL,
  insurance_policy text,
  
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON driver_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own application"
  ON driver_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- DONE! All migrations complete.
-- =====================================================






