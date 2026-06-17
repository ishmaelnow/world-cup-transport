-- Fix notification type drift between app code, constraints, and ride triggers.
-- The previous admin ride notification trigger inserted `admin_alert`, but the
-- current notifications_type_check constraint did not allow that value, causing
-- ride inserts to fail inside the trigger.

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'ride_request',
    'ride_accepted',
    'ride_completed',
    'ride_cancelled',
    'ride_update',
    'payment',
    'verification',
    'system',
    'driver_application_submitted',
    'driver_application_approved',
    'driver_application_rejected'
  ));

CREATE OR REPLACE FUNCTION notify_ride_status_change()
RETURNS TRIGGER AS $$
DECLARE
  rider_user_id uuid;
  driver_user_id uuid;
  admin_id uuid;
  admin_payload jsonb;
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
      admin_payload := jsonb_build_object(
        'table', 'notifications',
        'user_id', admin_id,
        'title', 'New Ride Request',
        'type', 'ride_request',
        'ride_id', NEW.id
      );
      RAISE LOG 'notify_ride_status_change insert payload: %', admin_payload;

      INSERT INTO notifications (user_id, title, message, type, ride_id)
      VALUES (
        admin_id,
        'New Ride Request',
        'A new ride has been requested from ' || SPLIT_PART(NEW.pickup_address, ',', 1) || ' to ' || SPLIT_PART(NEW.dropoff_address, ',', 1) || '.',
        'ride_request',
        NEW.id
      );
    END LOOP;

    RETURN NEW;
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
