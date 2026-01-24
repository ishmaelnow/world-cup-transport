import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/fare';
import type { Database } from '../../lib/database.types';
import { Power, MapPin, DollarSign, TrendingUp } from 'lucide-react';
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
    const { data } = await supabase
      .from('rides')
      .select('*')
      .in('status', ['matching', 'requested'])
      .order('requested_at', { ascending: true })
      .limit(5);

    setAvailableRides(data || []);
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
          if (newRide.status === 'matching' || newRide.status === 'requested') {
            setAvailableRides((prev) => [newRide, ...prev].slice(0, 5));
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
          if (updatedRide.status !== 'matching' && updatedRide.status !== 'requested') {
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
    if (!profile) return;

    try {
      const { data: ride } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .maybeSingle();

      if (!ride || (ride.status !== 'matching' && ride.status !== 'requested')) {
        alert('This ride is no longer available');
        loadAvailableRides();
        return;
      }

      if (ride.driver_id && ride.driver_id !== profile.id) {
        alert('This ride has been accepted by another driver');
        loadAvailableRides();
        return;
      }

      const { data, error } = await supabase
        .from('rides')
        .update({
          driver_id: profile.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', rideId)
        .eq('status', ride.status)
        .is('driver_id', null)
        .select(); // Return updated row to verify

      if (error) {
        console.error('❌ Error accepting ride:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('❌ No rows updated - ride may have been accepted by another driver or status changed');
        alert('Failed to accept ride. The ride may have been accepted by another driver or is no longer available.');
        loadAvailableRides();
        return;
      }

      console.log('✅ Ride accepted successfully:', data[0]);
      navigate(`/driver/ride/${rideId}`);
    } catch (error) {
      console.error('Error accepting ride:', error);
      alert('Failed to accept ride. The ride may have been accepted by another driver.');
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
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(ride.fare_estimate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {ride.distance_miles.toFixed(1)} mi
                        </div>
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
