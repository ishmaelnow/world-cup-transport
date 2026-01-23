/*
  # Auto-create earnings records on ride completion

  ## Overview
  Automatically create earnings records when a ride is completed to track driver payments.
  
  ## Changes
  1. Create function to calculate and insert earnings when ride is completed
  2. Add trigger to call function on ride completion
  
  ## Security
  - Function executes with security definer privileges
  - All existing RLS policies remain intact
*/

CREATE OR REPLACE FUNCTION create_earnings_on_ride_complete()
RETURNS TRIGGER AS $$
DECLARE
  driver_amount decimal(10, 2);
  platform_commission decimal(10, 2);
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.driver_id IS NOT NULL THEN
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
    );
    
    UPDATE driver_profiles
    SET 
      total_earnings = COALESCE(total_earnings, 0) + driver_amount,
      total_trips = COALESCE(total_trips, 0) + 1
    WHERE id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_earnings'
  ) THEN
    CREATE TRIGGER trigger_create_earnings
      AFTER UPDATE OF status ON rides
      FOR EACH ROW
      EXECUTE FUNCTION create_earnings_on_ride_complete();
  END IF;
END $$;