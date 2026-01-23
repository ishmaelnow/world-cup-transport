/*
  # Add Ride Notification Triggers

  ## Overview
  Automatically send notifications to riders and drivers when ride status changes.
  
  ## Changes
  1. Create function to handle ride status notifications
  2. Add trigger on rides table to call notification function on status updates
  
  ## Security
  - Function executes with security definer privileges to insert notifications
  - All existing RLS policies remain intact
*/

CREATE OR REPLACE FUNCTION notify_ride_status_change()
RETURNS TRIGGER AS $$
DECLARE
  rider_user_id uuid;
  driver_user_id uuid;
BEGIN
  rider_user_id := NEW.rider_id;
  
  IF NEW.driver_id IS NOT NULL THEN
    SELECT user_id INTO driver_user_id 
    FROM driver_profiles 
    WHERE id = NEW.driver_id;
  END IF;

  IF NEW.status = 'matching' AND OLD.status IS DISTINCT FROM 'matching' THEN
    INSERT INTO notifications (user_id, title, message, type, ride_id)
    VALUES (
      rider_user_id,
      'Finding Your Driver',
      'We are searching for a nearby driver for your ride.',
      'ride_update',
      NEW.id
    );
  
  ELSIF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    INSERT INTO notifications (user_id, title, message, type, ride_id)
    VALUES (
      rider_user_id,
      'Driver Found!',
      'A driver has accepted your ride request and is on the way.',
      'ride_update',
      NEW.id
    );
  
  ELSIF NEW.status = 'arriving' AND OLD.status IS DISTINCT FROM 'arriving' THEN
    INSERT INTO notifications (user_id, title, message, type, ride_id)
    VALUES (
      rider_user_id,
      'Driver Arriving',
      'Your driver is arriving at the pickup location.',
      'ride_update',
      NEW.id
    );
  
  ELSIF NEW.status = 'in_progress' AND OLD.status IS DISTINCT FROM 'in_progress' THEN
    INSERT INTO notifications (user_id, title, message, type, ride_id)
    VALUES (
      rider_user_id,
      'Trip Started',
      'Your trip has started. Enjoy your ride!',
      'ride_update',
      NEW.id
    );
  
  ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
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
  
  ELSIF NEW.status = 'canceled' AND OLD.status IS DISTINCT FROM 'canceled' THEN
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

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_ride_status_notifications'
  ) THEN
    CREATE TRIGGER trigger_ride_status_notifications
      AFTER INSERT OR UPDATE OF status ON rides
      FOR EACH ROW
      EXECUTE FUNCTION notify_ride_status_change();
  END IF;
END $$;