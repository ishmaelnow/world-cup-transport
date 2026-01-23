/*
  # Add Advanced Features Schema

  ## New Tables
  
  1. **ratings**
    - `id` (uuid, primary key)
    - `ride_id` (uuid, references rides)
    - `rider_id` (uuid, references profiles)
    - `driver_id` (uuid, references profiles)
    - `rider_rating` (integer, 1-5, rating given by rider to driver)
    - `driver_rating` (integer, 1-5, rating given by driver to rider)
    - `rider_comment` (text, optional comment from rider)
    - `driver_comment` (text, optional comment from driver)
    - `created_at` (timestamptz)
  
  2. **notifications**
    - `id` (uuid, primary key)
    - `user_id` (uuid, references profiles)
    - `title` (text)
    - `message` (text)
    - `type` (text - 'ride_update', 'payment', 'verification', 'system')
    - `read` (boolean, default false)
    - `ride_id` (uuid, optional, references rides)
    - `created_at` (timestamptz)
  
  3. **earnings**
    - `id` (uuid, primary key)
    - `driver_id` (uuid, references profiles)
    - `ride_id` (uuid, references rides)
    - `amount` (decimal, driver earnings for this ride)
    - `platform_fee` (decimal, platform commission)
    - `status` (text - 'pending', 'paid', 'processing')
    - `payout_id` (text, optional, for tracking payouts)
    - `created_at` (timestamptz)
    - `paid_at` (timestamptz, optional)
  
  ## Table Modifications
  
  1. **driver_profiles**
    - Add `verification_status` (text - 'pending', 'approved', 'rejected')
    - Add `verification_notes` (text, admin notes)
    - Add `verified_at` (timestamptz)
    - Add `verified_by` (uuid, references profiles)
    - Add `average_rating` (decimal)
    - Add `total_rides` (integer, default 0)
    - Add `total_earnings` (decimal, default 0)
  
  2. **rides**
    - Add `driver_current_lat` (decimal, for real-time tracking)
    - Add `driver_current_lng` (decimal, for real-time tracking)
    - Add `last_location_update` (timestamptz)
    - Add `started_at` (timestamptz, when driver starts trip)
    - Add `completed_at` (timestamptz, when trip ends)
  
  3. **profiles**
    - Add `average_rating` (decimal)
    - Add `total_rides` (integer, default 0)

  ## Security
    - Enable RLS on all new tables
    - Add policies for secure access
*/

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid REFERENCES rides(id) ON DELETE CASCADE NOT NULL,
  rider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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
  USING (auth.uid() = rider_id OR auth.uid() = driver_id);

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
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('ride_update', 'payment', 'verification', 'system')),
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

-- Create earnings table
CREATE TABLE IF NOT EXISTS earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
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
  USING (auth.uid() = driver_id);

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
    WHERE table_name = 'driver_profiles' AND column_name = 'verification_notes'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN verification_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN verified_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'verified_by'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN verified_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN average_rating decimal(3, 2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'total_rides'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN total_rides integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'total_earnings'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN total_earnings decimal(10, 2) DEFAULT 0;
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

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE rides ADD COLUMN started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rides' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE rides ADD COLUMN completed_at timestamptz;
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ratings_ride_id ON ratings(ride_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rider_id ON ratings(rider_id);
CREATE INDEX IF NOT EXISTS idx_ratings_driver_id ON ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_earnings_driver_id ON earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings(status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_verification ON driver_profiles(verification_status);