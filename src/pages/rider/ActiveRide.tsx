import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { RatingModal } from '../../components/RatingModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/fare';
import type { Database } from '../../lib/database.types';
import { MapPin, User, Car, Clock, Phone, MessageSquare } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { RideMap } from '../../components/RideMap';
import { Chat } from '../../components/Chat';

type Ride = Database['public']['Tables']['rides']['Row'];
type DriverProfile = Database['public']['Tables']['driver_profiles']['Row'];

export function ActiveRide() {
  const { rideId } = useParams<{ rideId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showChat, setShowChat] = useState(true); // Show chat by default when driver is assigned

  useEffect(() => {
    if (!rideId) return;

    loadRide();

    const channel: RealtimeChannel = supabase
      .channel(`ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          const updatedRide = payload.new as Ride;
          const previousDriverId = ride?.driver_id;
          
          setRide(updatedRide);
          
          // If driver is assigned (new or changed), load driver info and show chat
          if (updatedRide.driver_id) {
            // Only reload if driver_id changed or driver isn't loaded yet
            if (updatedRide.driver_id !== previousDriverId || !driver) {
              loadDriver(updatedRide.driver_id).then(() => {
                setShowChat(true); // Show chat when driver is loaded
              });
            }
          } else {
            // Driver removed
            setDriver(null);
            setShowChat(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  // Ensure driver is loaded when driver_id changes
  useEffect(() => {
    if (ride?.driver_id && (!driver || driver.id !== ride.driver_id)) {
      loadDriver(ride.driver_id).then(() => {
        setShowChat(true);
      });
    }
  }, [ride?.driver_id]);

  const loadRide = async () => {
    if (!rideId) return;

    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .maybeSingle();

    if (error || !data) {
      alert('Ride not found');
      navigate('/rider');
      return;
    }

    setRide(data);
    if (data.driver_id) {
      // Load driver and show chat
      await loadDriver(data.driver_id);
      setShowChat(true); // Show chat when driver is loaded
    } else {
      // No driver assigned yet
      setShowChat(false);
      setDriver(null);
    }

    if (data.status === 'completed' && user) {
      const { data: existingRating } = await supabase
        .from('ratings')
        .select('rider_rating')
        .eq('ride_id', rideId)
        .maybeSingle();

      if (existingRating && existingRating.rider_rating !== null) {
        setHasRated(true);
      } else {
        setShowRatingModal(true);
      }
    }

    setLoading(false);
  };

  const loadDriver = async (driverId: string) => {
    const { data } = await supabase
      .from('driver_profiles')
      .select('*, user:profiles!driver_profiles_user_id_fkey(full_name)')
      .eq('id', driverId)
      .maybeSingle();

    if (data) {
      setDriver(data);
    }
  };

  const handleCancel = async () => {
    if (!ride || !user) return;

    if (ride.status !== 'matching' && ride.status !== 'requested') {
      alert('Ride cannot be canceled at this stage');
      return;
    }

    if (!confirm('Are you sure you want to cancel this ride?')) return;

    setCanceling(true);
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          canceled_by: 'rider',
        })
        .eq('id', ride.id);

      if (error) throw error;

      navigate('/rider');
    } catch (error) {
      console.error('Error canceling ride:', error);
      alert('Failed to cancel ride');
    } finally {
      setCanceling(false);
    }
  };

  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!ride || !user || !ride.driver_id) return;

    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('ride_id', ride.id)
      .maybeSingle();

    if (existingRating) {
      await supabase
        .from('ratings')
        .update({ rider_rating: rating, rider_comment: comment })
        .eq('id', existingRating.id);
    } else {
      await supabase.from('ratings').insert({
        ride_id: ride.id,
        rider_id: user.id,
        driver_id: ride.driver_id,
        rider_rating: rating,
        rider_comment: comment,
      });
    }

    const { data: allRatings } = await supabase
      .from('ratings')
      .select('rider_rating')
      .eq('driver_id', ride.driver_id)
      .not('rider_rating', 'is', null);

    if (allRatings && allRatings.length > 0) {
      const avgRating =
        allRatings.reduce((sum, r) => sum + (r.rider_rating || 0), 0) / allRatings.length;
      await supabase
        .from('driver_profiles')
        .update({ average_rating: avgRating })
        .eq('id', ride.driver_id);
    }

    setShowRatingModal(false);
    setHasRated(true);
  };

  const handleRatingSkip = () => {
    setShowRatingModal(false);
  };

  if (loading || !ride) {
    return (
      <Layout title="Loading...">
        <div className="text-center py-12">Loading ride details...</div>
      </Layout>
    );
  }

  if (ride.status === 'completed') {
    return (
      <Layout title="Ride Completed">
        <Card>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car className="text-green-600" size={32} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Trip Completed!</h3>
            <p className="text-gray-600 mb-6">Thank you for riding with World Cup Transport</p>

            <div className="max-w-md mx-auto space-y-3 text-left mb-6">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Total Fare</span>
                <span className="font-bold text-xl">
                  {formatCurrency(ride.fare_final || ride.fare_estimate)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Distance</span>
                <span className="font-medium">{ride.distance_miles.toFixed(1)} mi</span>
              </div>
            </div>

            <Button onClick={() => navigate('/rider')} size="lg">
              Request Another Ride
            </Button>
          </div>
        </Card>
      </Layout>
    );
  }

  if (ride.status === 'canceled') {
    return (
      <Layout title="Ride Canceled">
        <Card>
          <div className="text-center py-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ride Canceled</h3>
            <p className="text-gray-600 mb-6">
              This ride was canceled by {ride.canceled_by}
            </p>
            <Button onClick={() => navigate('/rider')} size="lg">
              Request a New Ride
            </Button>
          </div>
        </Card>
      </Layout>
    );
  }

  // Override status display if driver is assigned but status hasn't updated yet
  // Check driver_id first - if it exists, driver is assigned regardless of status
  const effectiveStatus = ride.driver_id 
    ? (ride.status === 'matching' || ride.status === 'requested' ? 'accepted' : ride.status)
    : ride.status;

  const statusInfo = {
    matching: {
      title: 'Finding Your Driver',
      description: 'Searching for nearby available drivers...',
      color: 'blue',
    },
    requested: {
      title: 'Finding Your Driver',
      description: 'Searching for nearby available drivers...',
      color: 'blue',
    },
    accepted: {
      title: 'Driver Assigned',
      description: 'Your driver is on the way to pick you up',
      color: 'green',
    },
    arriving: {
      title: 'Driver Arriving',
      description: 'Your driver is arriving at pickup location',
      color: 'green',
    },
    in_progress: {
      title: 'Trip in Progress',
      description: 'Enjoy your ride!',
      color: 'blue',
    },
  }[effectiveStatus] || { title: '', description: '', color: 'gray' };

  const getStatusBgClass = () => {
    if (statusInfo.color === 'blue') return 'bg-blue-100';
    if (statusInfo.color === 'green') return 'bg-green-100';
    return 'bg-gray-100';
  };

  const getStatusTextClass = () => {
    if (statusInfo.color === 'blue') return 'text-blue-600';
    if (statusInfo.color === 'green') return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    <Layout title={statusInfo.title}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="text-center py-6">
            <div className={`w-16 h-16 ${getStatusBgClass()} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {effectiveStatus === 'matching' || effectiveStatus === 'requested' ? (
                <Clock className={`${getStatusTextClass()} animate-pulse`} size={32} />
              ) : (
                <Car className={getStatusTextClass()} size={32} />
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{statusInfo.title}</h3>
            <p className="text-gray-600">{statusInfo.description}</p>
          </div>
        </Card>

        {/* Driver Card - Show when driver_id exists, even if profile is still loading */}
        {ride.driver_id && (
          <Card>
            <h4 className="font-semibold text-lg mb-4">Your Driver</h4>
            {driver ? (
              <>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <User size={32} className="text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-lg">
                      {driver.driver_name || (driver as any).user?.full_name || 'Driver'}
                    </h5>
                    <div className="flex items-center space-x-1 text-yellow-500">
                      <span>⭐</span>
                      <span className="font-medium">{(driver.rating_avg || 0).toFixed(1)}</span>
                      <span className="text-gray-500 text-sm">({driver.total_trips || 0} trips)</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Car size={18} className="text-gray-600" />
                    <span className="text-gray-900 font-medium">
                      {driver.vehicle_color} {driver.vehicle_make} {driver.vehicle_model}
                      {driver.vehicle_year && ` (${driver.vehicle_year})`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-sm text-gray-600">License Plate:</span>
                    <span className="font-mono font-bold text-gray-900">{driver.vehicle_plate}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading driver information...</p>
              </div>
            )}

            {ride.driver_current_lat && ride.driver_current_lng && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <MapPin className="text-blue-600" size={16} />
                    <span className="text-sm text-gray-600">Driver Location</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/${ride.driver_current_lat},${ride.driver_current_lng}/${ride.pickup_lat},${ride.pickup_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Open in Google Maps
                  </a>
                </div>
                {ride.last_location_update && (
                  <div className="text-xs text-gray-500 mb-3">
                    Updated {new Date(ride.last_location_update).toLocaleTimeString()}
                  </div>
                )}
                <RideMap
                  pickupLat={ride.pickup_lat}
                  pickupLng={ride.pickup_lng}
                  dropoffLat={ride.dropoff_lat}
                  dropoffLng={ride.dropoff_lng}
                  driverLat={ride.driver_current_lat}
                  driverLng={ride.driver_current_lng}
                  pickupAddress={ride.pickup_address}
                  dropoffAddress={ride.dropoff_address}
                  height="300px"
                />
              </div>
            )}
          </Card>
        )}

        <Card>
          <h4 className="font-semibold text-lg mb-4">Trip Details</h4>
          
          {/* Map Display */}
          {ride.pickup_lat && ride.pickup_lng && (
            <div className="mb-4">
              <RideMap
                pickupLat={ride.pickup_lat}
                pickupLng={ride.pickup_lng}
                dropoffLat={ride.dropoff_lat}
                dropoffLng={ride.dropoff_lng}
                driverLat={ride.driver_current_lat || undefined}
                driverLng={ride.driver_current_lng || undefined}
                pickupAddress={ride.pickup_address}
                dropoffAddress={ride.dropoff_address}
                height="250px"
              />
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <MapPin className="text-green-600 mt-1" size={18} />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Pickup</div>
                <div className="font-medium text-gray-900">{ride.pickup_address}</div>
              </div>
            </div>
            <div className="border-l-2 border-gray-200 ml-2 h-4"></div>
            <div className="flex items-start space-x-3">
              <MapPin className="text-red-600 mt-1" size={18} />
              <div className="flex-1">
                <div className="text-sm text-gray-600">Dropoff</div>
                <div className="font-medium text-gray-900">{ride.dropoff_address}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <span className="text-gray-600">Estimated Fare</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(ride.fare_estimate)}
            </span>
          </div>
        </Card>

        {/* Chat Section - Show when driver is assigned (driver_id exists) */}
        {ride.driver_id && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-lg">Chat with Driver</h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowChat(!showChat)}
              >
                <MessageSquare size={18} className="mr-2" />
                {showChat ? 'Hide Chat' : 'Show Chat'}
              </Button>
            </div>
            {showChat && driver ? (
              <div className="h-96">
                <Chat
                  rideId={ride.id}
                  recipientId={driver.user_id}
                  recipientType="driver"
                  title="Chat with Driver"
                />
              </div>
            ) : showChat ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm">Loading chat...</p>
              </div>
            ) : null}
          </Card>
        )}

        {(effectiveStatus === 'matching' || effectiveStatus === 'requested') && (
          <Button
            variant="danger"
            onClick={handleCancel}
            disabled={canceling}
            fullWidth
          >
            {canceling ? 'Canceling...' : 'Cancel Ride'}
          </Button>
        )}

        {showRatingModal && driver && (
          <RatingModal
            title="Rate Your Driver"
            subtitle={`How was your ride with ${driver.driver_name || (driver as any).user?.full_name || 'your driver'}?`}
            onSubmit={handleRatingSubmit}
            onSkip={handleRatingSkip}
          />
        )}
      </div>
    </Layout>
  );
}
