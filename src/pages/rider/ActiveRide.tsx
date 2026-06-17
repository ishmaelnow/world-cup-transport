import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { RatingModal } from '../../components/RatingModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/fare';
import type { Database } from '../../lib/database.types';
import { MapPin, User, Car, Clock, MessageSquare } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { RideMap } from '../../components/RideMap';
import { Chat } from '../../components/Chat';

type Ride = Database['public']['Tables']['rides']['Row'];
type DriverProfile = Database['public']['Tables']['driver_profiles']['Row'];
type DriverProfileWithUser = DriverProfile & {
  user?: {
    full_name?: string | null;
  };
};

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
  const rideRef = useRef<Ride | null>(null); // Ref to always get latest ride state

  // Keep ref in sync with state
  useEffect(() => {
    rideRef.current = ride;
  }, [ride]);

  useEffect(() => {
    if (!rideId) return;

    loadRide();

    // AGGRESSIVE polling - check every 1 second if no driver yet
    // Use ref to avoid stale closure issues
    const pollInterval = setInterval(() => {
      const currentRide = rideRef.current;
      if (currentRide && !currentRide.driver_id && (currentRide.status === 'matching' || currentRide.status === 'requested')) {
        console.log('🔄 Polling for driver assignment...');
        loadRide(false); // Don't show loading spinner on poll
      }
    }, 1000); // Check every 1 second

    // Set up realtime subscription
    const channel: RealtimeChannel = supabase
      .channel(`ride:${rideId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${rideId}`,
        },
        (payload) => {
          console.log('📡 Realtime UPDATE received:', payload);
          const updatedRide = payload.new as Ride;
          
          // Use functional setState to ensure we get the latest ride state
          setRide((currentRide) => {
            const previousDriverId = currentRide?.driver_id;
            
            console.log('📡 Realtime ride update:', {
              previousDriverId,
              newDriverId: updatedRide.driver_id,
              previousStatus: currentRide?.status,
              newStatus: updatedRide.status,
              hasDriver: !!updatedRide.driver_id,
              driverChanged: updatedRide.driver_id !== previousDriverId
            });
            
            // Load driver if assigned
            if (updatedRide.driver_id && updatedRide.driver_id !== previousDriverId) {
              console.log('🚗 Driver assigned via realtime, loading profile:', updatedRide.driver_id);
              loadDriver(updatedRide.driver_id).then(() => {
                console.log('✅ Driver profile loaded, showing chat');
                setShowChat(true);
              }).catch(err => {
                console.error('❌ Error loading driver:', err);
              });
            } else if (!updatedRide.driver_id && previousDriverId) {
              console.log('⚠️ Driver removed from ride');
              setDriver(null);
              setShowChat(false);
            }
            
            return updatedRide;
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to ride updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error - falling back to polling');
        }
      });

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [rideId]);

  // Ensure driver is loaded when driver_id changes
  useEffect(() => {
    if (ride?.driver_id && (!driver || driver.id !== ride.driver_id)) {
      console.log('Driver ID detected, loading driver profile:', ride.driver_id);
      loadDriver(ride.driver_id).then(() => {
        console.log('Driver profile loaded successfully');
        setShowChat(true);
      }).catch(err => {
        console.error('Failed to load driver profile:', err);
      });
    } else if (ride && !ride.driver_id && driver) {
      // Driver was removed
      console.log('Driver removed from ride');
      setDriver(null);
      setShowChat(false);
    }
  }, [ride?.driver_id, ride?.id]);

  const loadRide = useCallback(async (showLoading = true) => {
    if (!rideId) return;

    if (showLoading) setLoading(true);

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

    const previousDriverId = rideRef.current?.driver_id;
    
    // Update both state and ref
    setRide(data);
    rideRef.current = data;
    
    console.log('🔄 Ride loaded:', { 
      rideId: data.id, 
      driver_id: data.driver_id, 
      status: data.status,
      previousDriverId,
      driverChanged: data.driver_id !== previousDriverId
    });
    
    if (data.driver_id) {
      // Load driver and show chat
      console.log('✅ Driver ID found, loading driver profile:', data.driver_id);
      try {
        await loadDriver(data.driver_id);
        setShowChat(true); // Show chat when driver is loaded
      } catch (err) {
        console.error('❌ Error loading driver:', err);
      }
    } else {
      // No driver assigned yet
      console.log('⏳ No driver assigned yet');
      setShowChat(false);
      if (previousDriverId) {
        setDriver(null);
      }
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

    if (showLoading) setLoading(false);
  }, [rideId, navigate, user]);

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
        .update({ rating_avg: avgRating })
        .eq('id', ride.driver_id);
    }

    setShowRatingModal(false);
    setHasRated(true);
  };

  const handleRatingSkip = () => {
    setShowRatingModal(false);
  };

  // CRITICAL: Use useMemo BEFORE any early returns
  // This ensures hooks are always called in the same order
  // Calculate status even if ride is null (will use defaults)
  const { hasDriver, effectiveStatus, statusInfo } = useMemo(() => {
    // Handle null ride case
    if (!ride) {
      return {
        hasDriver: false,
        effectiveStatus: 'matching',
        statusInfo: {
          title: 'Loading...',
          description: 'Loading ride details...',
          color: 'gray'
        }
      };
    }
    
    const hasDriverValue = ride.driver_id != null && ride.driver_id !== '';
    
    let effectiveStatusValue = ride.status;
    if (hasDriverValue && (ride.status === 'matching' || ride.status === 'requested')) {
      effectiveStatusValue = 'accepted';
    }
    
    const statusInfoMap: Record<string, { title: string; description: string; color: string }> = {
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
    };
    
    const statusInfoValue = statusInfoMap[effectiveStatusValue] || { 
      title: `Status: ${effectiveStatusValue}`, 
      description: 'Ride in progress', 
      color: 'gray' 
    };
    
    console.log('🎯 Status calculation:', {
      rideId: ride.id,
      driver_id: ride.driver_id,
      hasDriver: hasDriverValue,
      db_status: ride.status,
      effectiveStatus: effectiveStatusValue,
      statusInfo_title: statusInfoValue.title
    });
    
    return {
      hasDriver: hasDriverValue,
      effectiveStatus: effectiveStatusValue,
      statusInfo: statusInfoValue
    };
  }, [ride]); // Use ride object itself - React will handle null safely and compare by reference

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

  // Early returns AFTER all hooks
  if (loading || !ride) {
    return (
      <Layout title={statusInfo.title}>
        <div className="text-center py-12">Loading ride details...</div>
      </Layout>
    );
  }

  return (
    <Layout title={statusInfo.title}>
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <div className="text-center py-6">
            <div className="flex justify-end mb-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  console.log('Manual refresh triggered');
                  loadRide();
                }}
                title="Refresh ride status"
              >
                🔄 Refresh
              </Button>
            </div>
            <div className={`w-16 h-16 ${getStatusBgClass()} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {effectiveStatus === 'matching' || effectiveStatus === 'requested' ? (
                <Clock className={`${getStatusTextClass()} animate-pulse`} size={32} />
              ) : (
                <Car className={getStatusTextClass()} size={32} />
              )}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{statusInfo.title}</h3>
            <p className="text-gray-600">{statusInfo.description}</p>
            {/* Debug info - shows in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-3 text-xs text-gray-400 space-y-1">
                <div>DB Status: <strong>{ride.status}</strong></div>
                <div>Driver ID: <strong>{ride.driver_id || 'None'}</strong></div>
                <div>Effective Status: <strong>{effectiveStatus}</strong></div>
                <div>Has Driver: <strong>{hasDriver ? 'Yes' : 'No'}</strong></div>
              </div>
            )}
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
                      {(driver as DriverProfileWithUser).user?.full_name || 'Driver'}
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

        {showRatingModal && driver && !hasRated && (
          <RatingModal
            title="Rate Your Driver"
            subtitle={`How was your ride with ${(driver as DriverProfileWithUser).user?.full_name || 'your driver'}?`}
            onSubmit={handleRatingSubmit}
            onSkip={handleRatingSkip}
          />
        )}
      </div>
    </Layout>
  );
}
