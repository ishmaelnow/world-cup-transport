import { createNotification } from './notifications';
import type { Database } from './database.types';

type RideStatus = Database['public']['Tables']['rides']['Row']['status'];

export async function sendRideStatusNotification(
  riderId: string,
  driverId: string | null,
  rideId: string,
  status: RideStatus,
  pickupAddress?: string,
  dropoffAddress?: string
) {
  switch (status) {
    case 'matching':
      await createNotification(
        riderId,
        'Finding Your Driver',
        'We are searching for a nearby driver for your ride.',
        'ride_update',
        rideId
      );
      break;

    case 'accepted':
      if (driverId) {
        await createNotification(
          riderId,
          'Driver Found!',
          'A driver has accepted your ride request and is on the way to pick you up.',
          'ride_update',
          rideId
        );
      }
      break;

    case 'arriving':
      await createNotification(
        riderId,
        'Driver Arriving',
        'Your driver is arriving at the pickup location.',
        'ride_update',
        rideId
      );
      break;

    case 'in_progress':
      await createNotification(
        riderId,
        'Trip Started',
        'Your trip has started. Enjoy your ride!',
        'ride_update',
        rideId
      );
      break;

    case 'completed':
      await createNotification(
        riderId,
        'Trip Completed',
        'Your trip has been completed. Thank you for using World Cup Transport!',
        'ride_update',
        rideId
      );
      if (driverId) {
        await createNotification(
          driverId,
          'Trip Completed',
          'You have successfully completed a trip.',
          'ride_update',
          rideId
        );
      }
      break;

    case 'canceled':
      await createNotification(
        riderId,
        'Ride Canceled',
        'Your ride has been canceled.',
        'ride_update',
        rideId
      );
      if (driverId) {
        await createNotification(
          driverId,
          'Ride Canceled',
          'The ride has been canceled.',
          'ride_update',
          rideId
        );
      }
      break;
  }
}

export async function sendDriverNotification(
  driverId: string,
  title: string,
  message: string,
  rideId?: string
) {
  await createNotification(driverId, title, message, 'ride_update', rideId);
}

export async function sendPaymentNotification(
  userId: string,
  title: string,
  message: string,
  rideId?: string
) {
  await createNotification(userId, title, message, 'payment', rideId);
}
