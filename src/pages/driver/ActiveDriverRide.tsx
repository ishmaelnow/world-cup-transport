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
import { MapPin, Navigation, CheckCircle, MessageSquare } from 'lucide-react';
import { RideMap } from '../../components/RideMap';
import { Chat } from '../../components/Chat';

type Ride = Database['public']['Tables']['rides']['Row'];

export function ActiveDriverRide() {
  const { rideId } = useParams<{ rideId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!rideId) return;

    loadRide();

    const channel = supabase
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
          setRide(payload.new as Ride);
        }
      )
      .subscribe();

    let locationInterval: number;
    if (navigator.geolocation) {
      const updateLocation = () => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await supabase
              .from('rides')
              .update({
                driver_current_lat: latitude,
                driver_current_lng: longitude,
                last_location_update: new Date().toISOString(),
              })
              .eq('id', rideId);
          },
          (error) => {
            console.error('Error getting location:', error);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      };

      updateLocation();
      locationInterval = window.setInterval(updateLocation, 10000);
    }

    return () => {
      supabase.removeChannel(channel);
      if (locationInterval) {
        clearInterval(locationInterval);
      }
    };
  }, [rideId]);

  const loadRide = async () => {
    if (!rideId) return;

    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .maybeSingle();

    if (error || !data) {
      alert('Ride not found');
      navigate('/driver');
      return;
    }

    setRide(data);
    setLoading(false);
  };

  const updateRideStatus = async (newStatus: string) => {
    if (!ride) return;

    setUpdating(true);
    try {
      const updates: any = { status: newStatus };

      if (newStatus === 'arriving') {
        updates.accepted_at = new Date().toISOString();
      } else if (newStatus === 'in_progress') {
        updates.started_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
        updates.fare_final = ride.fare_estimate;
      } else if (newStatus === 'canceled') {
        updates.canceled_at = new Date().toISOString();
        updates.canceled_by = 'driver';
        updates.driver_id = null;  // Remove driver assignment
        updates.status = 'matching';  // Put back in queue for other drivers
      }

      const { error } = await supabase
        .from('rides')
        .update(updates)
        .eq('id', ride.id);

      if (error) throw error;

      if (newStatus === 'completed') {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          console.error('Missing Supabase configuration. Cannot capture payment.');
          return;
        }

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const paymentResponse = await fetch(`${supabaseUrl}/functions/v1/capture-payment`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
              'apikey': supabaseAnonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rideId: ride.id }),
          });

          if (!paymentResponse.ok) {
            if (paymentResponse.status === 404) {
              console.error('Edge Function not found. Deploy capture-payment function.');
            } else {
              const errorData = await paymentResponse.json().catch(() => ({ error: 'Unknown error' }));
              console.error('Failed to capture payment:', errorData.error || `Status ${paymentResponse.status}`);
            }
          }
        } catch (err: any) {
          console.error('Connection error capturing payment:', err.message || err);
          console.error('Check internet connection and Edge Functions deployment.');
        }

        const { data: profile } = await supabase
          .from('driver_profiles')
          .select('total_trips')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (profile) {
          await supabase
            .from('driver_profiles')
            .update({ total_trips: (profile.total_trips || 0) + 1 })
            .eq('user_id', user?.id);
        }

        setShowRatingModal(true);
      } else if (newStatus === 'canceled') {
        // Navigate back to driver dashboard after canceling
        navigate('/driver');
      }
    } catch (error) {
      console.error('Error updating ride status:', error);
      alert('Failed to update ride status: ' + (error as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRatingSubmit = async (rating: number, comment: string) => {
    if (!ride || !user) return;

    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('ride_id', ride.id)
      .maybeSingle();

    if (existingRating) {
      await supabase
        .from('ratings')
        .update({ driver_rating: rating, driver_comment: comment })
        .eq('id', existingRating.id);
    } else {
      await supabase.from('ratings').insert({
        ride_id: ride.id,
        rider_id: ride.rider_id,
        driver_id: user.id,
        driver_rating: rating,
        driver_comment: comment,
      });
    }

    setShowRatingModal(false);
    navigate('/driver');
  };

  const handleRatingSkip = () => {
    setShowRatingModal(false);
    navigate('/driver');
  };

  if (loading || !ride) {
    return (
      <Layout title="Loading...">
        <div className="text-center py-12">Loading ride details...</div>
      </Layout>
    );
  }

  const getNextAction = () => {
    switch (ride.status) {
      case 'accepted':
        return {
          label: 'Arriving at Pickup',
          action: () => updateRideStatus('arriving'),
          variant: 'primary' as const,
        };
      case 'arriving':
        return {
          label: 'Start Trip',
          action: () => updateRideStatus('in_progress'),
          variant: 'success' as const,
        };
      case 'in_progress':
        return {
          label: 'Complete Trip',
          action: () => updateRideStatus('completed'),
          variant: 'success' as const,
        };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  const statusDisplay = {
    accepted: 'Drive to Pickup Location',
    arriving: 'Arriving at Pickup',
    in_progress: 'Trip in Progress',
  }[ride.status] || ride.status;

  return (
    <Layout title={statusDisplay}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="text-center py-4">
            <div className={`inline-flex items-center px-4 py-2 rounded-full ${
              ride.status === 'in_progress'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              <Navigation className="mr-2" size={18} />
              <span className="font-semibold">{statusDisplay}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4">Trip Details</h3>
          
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
                height="300px"
              />
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <MapPin className="text-green-600 mt-1" size={20} />
              <div className="flex-1">
                <div className="text-sm text-gray-600 font-medium">Pickup Location</div>
                <div className="text-gray-900">{ride.pickup_address}</div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${ride.pickup_lat},${ride.pickup_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm hover:underline inline-flex items-center mt-1"
                >
                  <Navigation size={14} className="mr-1" />
                  Navigate
                </a>
              </div>
            </div>

            <div className="border-l-2 border-gray-300 ml-2 h-6"></div>

            <div className="flex items-start space-x-3">
              <MapPin className="text-red-600 mt-1" size={20} />
              <div className="flex-1">
                <div className="text-sm text-gray-600 font-medium">Dropoff Location</div>
                <div className="text-gray-900">{ride.dropoff_address}</div>
                {ride.status === 'in_progress' && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${ride.dropoff_lat},${ride.dropoff_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline inline-flex items-center mt-1"
                  >
                    <Navigation size={14} className="mr-1" />
                    Navigate
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="text-sm text-gray-600">Trip Fare</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(ride.fare_estimate)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Distance</div>
              <div className="text-xl font-semibold text-gray-700">
                {ride.distance_miles.toFixed(1)} mi
              </div>
            </div>
          </div>
        </Card>

        {/* Chat Section - Show when rider is assigned */}
        {ride.rider_id && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-lg">Chat with Rider</h4>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowChat(!showChat)}
              >
                <MessageSquare size={18} className="mr-2" />
                {showChat ? 'Hide Chat' : 'Show Chat'}
              </Button>
            </div>
            {showChat && (
              <div className="h-96">
                <Chat
                  rideId={ride.id}
                  recipientId={ride.rider_id}
                  recipientType="rider"
                  title="Chat with Rider"
                />
              </div>
            )}
          </Card>
        )}

        {nextAction && (
          <Button
            variant={nextAction.variant}
            onClick={nextAction.action}
            disabled={updating}
            fullWidth
            size="lg"
          >
            {updating ? 'Updating...' : nextAction.label}
          </Button>
        )}

        {/* Cancel Trip Button - Available at any stage */}
        {ride.status !== 'completed' && ride.status !== 'canceled' && (
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Are you sure you want to cancel this trip? It will be returned to the queue for other drivers.')) {
                updateRideStatus('canceled');
              }
            }}
            disabled={updating}
            fullWidth
            size="sm"
            className="mt-2"
          >
            Cancel Trip
          </Button>
        )}

        {ride.status === 'in_progress' && (
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <CheckCircle className="text-blue-600 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-blue-900">Drive Safely</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Follow traffic rules and ensure passenger comfort throughout the journey.
                </p>
              </div>
            </div>
          </Card>
        )}

        {showRatingModal && (
          <RatingModal
            title="Rate Your Rider"
            subtitle="How was your experience with this rider?"
            onSubmit={handleRatingSubmit}
            onSkip={handleRatingSkip}
          />
        )}
      </div>
    </Layout>
  );
}
