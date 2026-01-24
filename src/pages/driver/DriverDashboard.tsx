import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/fare';
import type { Database } from '../../lib/database.types';
import { Power, MapPin, DollarSign, TrendingUp, Calendar, Clock, Car } from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';

type DriverProfile = Database['public']['Tables']['driver_profiles']['Row'];
type Ride = Database['public']['Tables']['rides']['Row'];

export function DriverDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!profile) return;

    checkActiveRide();
    if (profile.is_available) {
      loadAvailableRides();
      subscribeToNewRides();
    }
  }, [profile]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) {
      navigate('/driver/onboarding');
      return;
    }

    setProfile(data);
    setLoading(false);
  };

  const checkActiveRide = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', profile.id)
      .in('status', ['accepted', 'arriving', 'in_progress'])
      .maybeSingle();

    if (data) {
      setActiveRide(data);
      navigate(`/driver/ride/${data.id}`);
    }
  };

  const loadAvailableRides = async () => {
    if (!profile) return;

    let query = supabase
      .from('rides')
      .select('*')
      .in('status', ['matching', 'requested'])
      .is('driver_id', null); // CRITICAL: Only show rides without a driver

    // Filter by vehicle type if driver has one set and ride requests a specific type
    // If ride has no vehicle_type preference, show it to all drivers
    // If ride has vehicle_type preference, only show to matching drivers
    if (profile.vehicle_type) {
      query = query.or(`vehicle_type.is.null,vehicle_type.eq.${profile.vehicle_type}`);
    }

    const { data } = await query
      .order('requested_at', { ascending: true })
      .limit(20); // Get more to filter scheduled rides

    // Filter out scheduled rides that haven't reached their scheduled time
    const now = new Date();
    const availableRides = (data || []).filter((ride) => {
      if (ride.scheduled_at) {
        const scheduledTime = new Date(ride.scheduled_at);
        return scheduledTime <= now; // Only show if scheduled time has passed
      }
      return true; // Show immediate rides
    }).slice(0, 5); // Limit to 5 after filtering

    setAvailableRides(availableRides);
  };

  const subscribeToNewRides = () => {
    const channel: RealtimeChannel = supabase
      .channel('available-rides')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rides',
        },
        (payload) => {
          const newRide = payload.new as Ride;
          // Only add if status is matching/requested AND no driver assigned
          // AND vehicle type matches (if ride has vehicle_type preference)
          // AND scheduled time has passed (if ride is scheduled)
          if ((newRide.status === 'matching' || newRide.status === 'requested') && !newRide.driver_id) {
            if (!profile) return;
            
            // Check if scheduled ride time has passed
            if (newRide.scheduled_at) {
              const scheduledTime = new Date(newRide.scheduled_at);
              const now = new Date();
              if (scheduledTime > now) {
                return; // Don't show scheduled rides that haven't reached their time
              }
            }
            
            // If ride has no vehicle_type preference, show to all drivers
            // If ride has vehicle_type preference, only show to matching drivers
            if (!newRide.vehicle_type || !profile.vehicle_type || newRide.vehicle_type === profile.vehicle_type) {
              setAvailableRides((prev) => [newRide, ...prev].slice(0, 5));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
        },
        (payload) => {
          const updatedRide = payload.new as Ride;
          // Remove from list if: status changed OR driver assigned
          if (updatedRide.status !== 'matching' && updatedRide.status !== 'requested' || updatedRide.driver_id) {
            setAvailableRides((prev) => prev.filter((r) => r.id !== updatedRide.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleAvailability = async () => {
    if (!profile) return;

    setUpdatingAvailability(true);
    try {
      const newAvailability = !profile.is_available;
      const { error } = await supabase
        .from('driver_profiles')
        .update({
          is_available: newAvailability,
          last_location_updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, is_available: newAvailability });

      if (newAvailability) {
        await updateLocation();
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update availability');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const updateLocation = async () => {
    if (!profile) return;

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await supabase
            .from('driver_profiles')
            .update({
              last_location_lat: position.coords.latitude,
              last_location_lng: position.coords.longitude,
              last_location_updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    if (!profile) {
      console.error('❌ No profile loaded');
      alert('Driver profile not loaded. Please refresh the page.');
      return;
    }

    console.log('🚗 Attempting to accept ride:', {
      rideId,
      driverProfileId: profile.id,
      driverUserId: profile.user_id,
      isAvailable: profile.is_available,
      isActive: profile.is_active
    });

    try {
      // First, get the current ride state
      const { data: ride, error: fetchError } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Error fetching ride:', fetchError);
        alert('Error loading ride details. Please try again.');
        return;
      }

      if (!ride) {
        console.error('❌ Ride not found:', rideId);
        alert('This ride is no longer available');
        loadAvailableRides();
        return;
      }

      console.log('📋 Current ride state:', {
        id: ride.id,
        status: ride.status,
        driver_id: ride.driver_id,
        rider_id: ride.rider_id
      });

      if (ride.status !== 'matching' && ride.status !== 'requested') {
        console.error('❌ Ride status is not matching/requested:', ride.status);
        alert('This ride is no longer available');
        loadAvailableRides();
        return;
      }

      if (ride.driver_id && ride.driver_id !== profile.id) {
        console.error('❌ Ride already has driver:', ride.driver_id, 'vs', profile.id);
        alert('This ride has been accepted by another driver');
        loadAvailableRides();
        return;
      }

      // Attempt the update
      console.log('🔄 Updating ride with:', {
        driver_id: profile.id,
        status: 'accepted',
        rideId
      });

      const { data, error } = await supabase
        .from('rides')
        .update({
          driver_id: profile.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', rideId)
        .in('status', ['matching', 'requested'])
        .is('driver_id', null)
        .select();

      if (error) {
        console.error('❌ Supabase error accepting ride:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert(`Error accepting ride: ${error.message}`);
        loadAvailableRides();
        return;
      }

      if (!data || data.length === 0) {
        console.error('❌ No rows updated - conditions not met');
        console.error('This means either:');
        console.error('  1. Status changed between fetch and update');
        console.error('  2. driver_id was set between fetch and update');
        console.error('  3. RLS policy is blocking the update');
        
        // Try to fetch again to see what changed
        const { data: updatedRide } = await supabase
          .from('rides')
          .select('*')
          .eq('id', rideId)
          .maybeSingle();
        
        console.error('Current ride state:', updatedRide);
        
        alert('Failed to accept ride. The ride may have been accepted by another driver or is no longer available.');
        loadAvailableRides();
        return;
      }

      console.log('✅ Ride accepted successfully:', data[0]);
      navigate(`/driver/ride/${rideId}`);
    } catch (error: any) {
      console.error('❌ Exception accepting ride:', error);
      console.error('Error stack:', error.stack);
      alert(`Failed to accept ride: ${error.message || 'Unknown error'}`);
      loadAvailableRides();
    }
  };

  if (loading || !profile) {
    return (
      <Layout title="Loading...">
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Driver Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-2xl font-bold">
                  {profile.is_available ? (
                    <span className="text-green-600">Online</span>
                  ) : (
                    <span className="text-gray-400">Offline</span>
                  )}
                </p>
              </div>
              <Button
                variant={profile.is_available ? 'danger' : 'success'}
                onClick={toggleAvailability}
                disabled={updatingAvailability}
              >
                <Power size={18} />
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Trips</p>
                <p className="text-2xl font-bold">{profile.total_trips}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⭐</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Rating</p>
                <p className="text-2xl font-bold">{profile.rating_avg.toFixed(1)}</p>
              </div>
            </div>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/driver/earnings')}
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Earnings</p>
                <p className="text-2xl font-bold">{formatCurrency(profile.total_earnings || 0)}</p>
              </div>
            </div>
          </Card>
        </div>

        {!profile.is_available && (
          <Card>
            <div className="text-center py-8">
              <Power size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                You're Offline
              </h3>
              <p className="text-gray-600 mb-4">
                Toggle your availability to start receiving ride requests
              </p>
              <Button onClick={toggleAvailability} size="lg">
                Go Online
              </Button>
            </div>
          </Card>
        )}

        {profile.is_available && (
          <Card>
            <h3 className="text-xl font-semibold mb-4">Available Rides</h3>
            {availableRides.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin size={48} className="mx-auto mb-2 opacity-50" />
                <p>No rides available at the moment</p>
                <p className="text-sm mt-1">New requests will appear here automatically</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start space-x-2">
                          <MapPin size={16} className="text-green-600 mt-1" />
                          <div className="flex-1">
                            <div className="text-xs text-gray-500">Pickup</div>
                            <div className="font-medium text-sm">{ride.pickup_address}</div>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin size={16} className="text-red-600 mt-1" />
                          <div className="flex-1">
                            <div className="text-xs text-gray-500">Dropoff</div>
                            <div className="font-medium text-sm">{ride.dropoff_address}</div>
                          </div>
                        </div>
                        {/* Scheduled Time */}
                        {ride.scheduled_at && (
                          <div className="flex items-start space-x-2">
                            <Calendar size={16} className="text-blue-600 mt-1" />
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Scheduled</div>
                              <div className="font-medium text-sm">
                                {new Date(ride.scheduled_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Vehicle Type Request */}
                        {ride.vehicle_type && (
                          <div className="flex items-start space-x-2">
                            <Car size={16} className="text-purple-600 mt-1" />
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Vehicle Type</div>
                              <div className="font-medium text-sm capitalize">
                                {ride.vehicle_type}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(ride.fare_estimate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {ride.distance_miles.toFixed(1)} mi
                        </div>
                        {ride.scheduled_at && (
                          <div className="text-xs text-blue-600 mt-1 flex items-center justify-end gap-1">
                            <Clock size={12} />
                            Scheduled
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleAcceptRide(ride.id)}
                      variant="success"
                      fullWidth
                      size="sm"
                    >
                      Accept Ride
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  );
}
