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

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

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

CREATE POLICY "Admins can view all driver profiles"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update driver profiles"
  ON driver_profiles FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Riders can view assigned driver details"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT driver_id FROM rides 
      WHERE rider_id = auth.uid() 
      AND status IN ('accepted', 'arriving', 'in_progress')
    )
  );

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

CREATE POLICY "Drivers can view assigned rides"
  ON rides FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view available rides for matching"
  ON rides FOR SELECT
  TO authenticated
  USING (
    status IN ('requested', 'matching')
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'driver'
  );

CREATE POLICY "Drivers can update assigned rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all rides"
  ON rides FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update all rides"
  ON rides FOR UPDATE
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

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

CREATE POLICY "Admins can view all trip locations"
  ON trip_locations FOR SELECT
  TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

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