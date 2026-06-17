import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/Card';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/fare';
import type { Database } from '../../lib/database.types';
import { MapPin, Car, Star } from 'lucide-react';

type Ride = Database['public']['Tables']['rides']['Row'];
type DriverProfile = Database['public']['Tables']['driver_profiles']['Row'];
type Rating = Database['public']['Tables']['ratings']['Row'];

interface RideWithDetails extends Ride {
  driver_profile?: DriverProfile;
  rating?: Rating;
}

export function RideHistory() {
  const { user } = useAuth();
  const [rides, setRides] = useState<RideWithDetails[]>([]);
  const [selectedRide, setSelectedRide] = useState<RideWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRides();
    }
  }, [user]);

  const loadRides = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('rider_id', user.id)
      .in('status', ['completed', 'canceled'])
      .order('requested_at', { ascending: false });

    if (data) {
      const ridesWithDetails = await Promise.all(
        data.map(async (ride) => {
          let driverProfile = null;
          let rating = null;

          if (ride.driver_id) {
            const { data: driverData } = await supabase
              .from('driver_profiles')
              .select('*')
              .eq('id', ride.driver_id)
              .maybeSingle();
            driverProfile = driverData;

            const { data: ratingData } = await supabase
              .from('ratings')
              .select('*')
              .eq('ride_id', ride.id)
              .maybeSingle();
            rating = ratingData;
          }

          return {
            ...ride,
            driver_profile: driverProfile,
            rating: rating,
          } as RideWithDetails;
        })
      );

      setRides(ridesWithDetails);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <Layout title="Ride History">
        <div className="text-center py-12">Loading ride history...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Ride History">
      <div className="space-y-6">
        {rides.length === 0 ? (
          <Card>
            <div className="text-center py-8 text-gray-500">
              <Car size={48} className="mx-auto mb-4 text-gray-400" />
              <p>No ride history yet</p>
              <p className="text-sm mt-2">Your completed rides will appear here</p>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-4">
              {rides.map((ride) => (
                <Card
                  key={ride.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedRide(ride)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            ride.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {ride.status.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {ride.requested_at ? new Date(ride.requested_at).toLocaleDateString() : ''}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <MapPin className="text-green-600 mt-1 flex-shrink-0" size={16} />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {ride.pickup_address.split(',').slice(0, 2).join(',')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2">
                          <MapPin className="text-red-600 mt-1 flex-shrink-0" size={16} />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {ride.dropoff_address.split(',').slice(0, 2).join(',')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {ride.driver_profile && (
                        <div className="mt-3 text-sm text-gray-600">
                          <Car size={14} className="inline mr-1" />
                          {ride.driver_profile.vehicle_color} {ride.driver_profile.vehicle_make}{' '}
                          {ride.driver_profile.vehicle_model}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(ride.fare_final || ride.fare_estimate)}
                      </div>
                      {ride.rating?.rider_rating && (
                        <div className="flex items-center justify-end space-x-1 mt-1 text-yellow-500">
                          <Star size={14} fill="currentColor" />
                          <span className="text-sm font-medium">{ride.rating.rider_rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {selectedRide && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRide(null)}
          >
            <Card
              className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Trip Receipt</h3>
                    <p className="text-gray-600">
                      {selectedRide.requested_at
                        ? `${new Date(selectedRide.requested_at).toLocaleDateString()} ${new Date(selectedRide.requested_at).toLocaleTimeString()}`
                        : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRide(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="border-t border-b border-gray-200 py-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <MapPin className="text-green-600 mt-1" size={20} />
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 font-medium">Pickup</div>
                        <div className="text-gray-900">{selectedRide.pickup_address}</div>
                      </div>
                    </div>

                    <div className="border-l-2 border-gray-200 ml-2 h-6"></div>

                    <div className="flex items-start space-x-3">
                      <MapPin className="text-red-600 mt-1" size={20} />
                      <div className="flex-1">
                        <div className="text-sm text-gray-600 font-medium">Dropoff</div>
                        <div className="text-gray-900">{selectedRide.dropoff_address}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedRide.driver_profile && (
                  <div>
                    <h4 className="font-semibold mb-3">Driver Information</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Car size={18} className="text-gray-600" />
                        <span className="font-medium">
                          {selectedRide.driver_profile.vehicle_color}{' '}
                          {selectedRide.driver_profile.vehicle_make}{' '}
                          {selectedRide.driver_profile.vehicle_model}
                          {selectedRide.driver_profile.vehicle_year &&
                            ` (${selectedRide.driver_profile.vehicle_year})`}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        License Plate:{' '}
                        <span className="font-mono font-bold">
                          {selectedRide.driver_profile.vehicle_plate}
                        </span>
                      </div>
                      {(selectedRide.driver_profile.average_rating || 0) > 0 && (
                        <div className="flex items-center space-x-1 mt-2 text-yellow-500">
                          <Star size={16} fill="currentColor" />
                          <span className="font-medium">
                            {(selectedRide.driver_profile.average_rating || 0).toFixed(1)}
                          </span>
                          <span className="text-gray-500 text-sm">
                            ({selectedRide.driver_profile.total_trips} trips)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-3">Fare Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-gray-700">
                      <span>Base Fare</span>
                      <span>{formatCurrency(2.5)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Distance ({(selectedRide.distance_miles || 0).toFixed(2)} mi)</span>
                      <span>
                        {formatCurrency(
                          (selectedRide.distance_miles || 0) * 1.5
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Time ({selectedRide.duration_minutes || 0} min)</span>
                      <span>
                        {formatCurrency((selectedRide.duration_minutes || 0) * 0.25)}
                      </span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <div className="flex justify-between text-lg font-bold text-gray-900">
                        <span>Total</span>
                        <span>
                          {formatCurrency(selectedRide.fare_final || selectedRide.fare_estimate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedRide.rating && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Your Rating</h4>
                    <div className="flex items-center space-x-2 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={20}
                          className={
                            star <= (selectedRide.rating?.rider_rating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>
                    {selectedRide.rating.rider_comment && (
                      <p className="text-sm text-gray-700 italic">
                        "{selectedRide.rating.rider_comment}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
