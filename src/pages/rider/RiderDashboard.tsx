import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { LocationInput } from '../../components/LocationInput';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { calculateDistance, calculateFare, formatCurrency } from '../../lib/fare';
import type { GeocodingResult } from '../../lib/geocoding';
import type { Database, VehicleType } from '../../lib/database.types';
import { MapPin, Navigation, Car, CreditCard, AlertCircle, Calendar, Clock } from 'lucide-react';

type Ride = Database['public']['Tables']['rides']['Row'];
type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];

export function RiderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState<GeocodingResult | null>(null);
  const [dropoff, setDropoff] = useState<GeocodingResult | null>(null);
  const [fareEstimate, setFareEstimate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [canApplyDriver, setCanApplyDriver] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);

  useEffect(() => {
    checkActiveRide();
    checkDriverStatus();
    loadPaymentMethods();
  }, [user]);

  useEffect(() => {
    if (pickup && dropoff) {
      const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      const estimatedDuration = Math.ceil(distance * 2);
      const fare = calculateFare(distance, estimatedDuration);
      setFareEstimate(fare);
    } else {
      setFareEstimate(null);
    }
  }, [pickup, dropoff]);

  const checkActiveRide = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('rider_id', user.id)
      .in('status', ['requested', 'matching', 'accepted', 'arriving', 'in_progress'])
      .order('requested_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setActiveRide(data);
      navigate(`/rider/ride/${data.id}`);
    }
  };

  const checkDriverStatus = async () => {
    if (!user || user.role !== 'rider') return;

    const { data: applicationData } = await supabase
      .from('driver_applications')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    setCanApplyDriver(!applicationData);
  };

  const loadPaymentMethods = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setPaymentMethods(data);
      const defaultMethod = data.find(m => m.is_default) || data[0];
      setSelectedPaymentMethod(defaultMethod.stripe_payment_method_id);
    }
  };

  const handleRequestRide = async () => {
    if (!user || !pickup || !dropoff) return;

    // Validate scheduled ride if enabled
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        alert('Please select both date and time for scheduled ride');
        return;
      }
      
      // Combine date and time into ISO string
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const now = new Date();
      
      if (scheduledDateTime <= now) {
        alert('Scheduled time must be in the future');
        return;
      }
    }

    setLoading(true);
    try {
      // Step 1: Create the ride first (no payment check)
      const distance = calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
      const estimatedDuration = Math.ceil(distance * 2);
      const fare = calculateFare(distance, estimatedDuration);

      // Combine date and time if scheduled
      const scheduledAt = isScheduled && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      const { data, error } = await supabase
        .from('rides')
        .insert({
          rider_id: user.id,
          pickup_address: pickup.address,
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          dropoff_address: dropoff.address,
          dropoff_lat: dropoff.lat,
          dropoff_lng: dropoff.lng,
          fare_estimate: fare,
          distance_miles: distance,
          duration_minutes: estimatedDuration,
          status: 'matching',
          scheduled_at: scheduledAt,
          vehicle_type: vehicleType,
        })
        .select()
        .single();

      if (error) throw error;

      // Step 2: Check for payment method AFTER ride is created
      if (paymentMethods.length === 0 || !selectedPaymentMethod) {
        // Redirect to payment methods page with ride ID in state
        navigate('/rider/payment-methods', { 
          state: { 
            rideId: data.id,
            returnTo: `/rider/ride/${data.id}`
          } 
        });
        return;
      }

      // Step 3: Create payment intent if payment method exists
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Missing Supabase configuration. Check your .env file and restart dev server.'
        );
      }

      let paymentResponse: Response;
      try {
        paymentResponse = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rideId: data.id,
            paymentMethodId: selectedPaymentMethod
          }),
        });
      } catch (fetchError: any) {
        throw new Error(
          `Connection failed: ${fetchError.message || 'Cannot reach Supabase'}. ` +
          'Check internet connection and Edge Functions deployment. See CONNECTION_ERRORS_FIX.md'
        );
      }

      if (!paymentResponse.ok) {
        if (paymentResponse.status === 404) {
          throw new Error(
            'Edge Function not found. Deploy Edge Functions in Supabase Dashboard. ' +
            'See CONNECTION_ERRORS_FIX.md'
          );
        }
        const errorData = await paymentResponse.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          `Payment authorization failed (${paymentResponse.status}): ${errorData.error || 'Unknown error'}`
        );
      }

      // Step 4: Ride is now available for drivers to accept manually
      // Drivers will see it in their "Available Rides" section
      // No auto-assignment - drivers choose which rides to accept

      navigate(`/rider/ride/${data.id}`);
    } catch (error) {
      console.error('Error requesting ride:', error);
      alert('Failed to request ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Request a Ride">
      {canApplyDriver && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Car className="text-blue-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Earn Money as a Driver
              </h3>
              <p className="text-gray-700 mb-3">
                Turn your free time into earnings. Drive on your own schedule and be your own boss.
              </p>
              <Button onClick={() => navigate('/driver/onboarding')}>
                Apply to Become a Driver
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-fit">
          <h3 className="text-xl font-semibold mb-4">Where to?</h3>

          <div className="space-y-4">
            <LocationInput
              label="Pickup Location"
              value={pickup?.address || ''}
              onChange={setPickup}
              placeholder="Enter pickup address"
            />

            <LocationInput
              label="Dropoff Location"
              value={dropoff?.address || ''}
              onChange={setDropoff}
              placeholder="Enter destination"
            />

            {/* Vehicle Type Selection */}
            <Select
              label="Vehicle Type (Optional)"
              value={vehicleType || ''}
              onChange={(e) => setVehicleType(e.target.value as VehicleType || null)}
              options={[
                { value: '', label: 'Any Vehicle' },
                { value: 'sedan', label: 'Sedan' },
                { value: 'standard', label: 'Standard' },
                { value: 'suv', label: 'SUV' },
              ]}
            />

            {/* Scheduled Ride Toggle */}
            <>
              <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="scheduled-ride"
                    checked={isScheduled}
                    onChange={(e) => {
                      setIsScheduled(e.target.checked);
                      if (!e.target.checked) {
                        setScheduledDate('');
                        setScheduledTime('');
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="scheduled-ride" className="flex items-center space-x-2 cursor-pointer flex-1">
                    <Calendar size={18} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Schedule for later</span>
                  </label>
                </div>

                {/* Scheduled Date/Time Inputs */}
                {isScheduled && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        <Calendar size={14} className="inline mr-1" />
                        Date
                      </label>
                      <Input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required={isScheduled}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        <Clock size={14} className="inline mr-1" />
                        Time
                      </label>
                      <Input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        required={isScheduled}
                      />
                    </div>
                    {scheduledDate && scheduledTime && (
                      <div className="col-span-2 text-xs text-gray-600 mt-2">
                        Scheduled for: {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
            </>

            {fareEstimate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Estimated Fare</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(fareEstimate)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Based on distance and estimated travel time
                </p>
              </div>
            )}

            <Button
              onClick={handleRequestRide}
              disabled={!pickup || !dropoff || loading || (isScheduled && (!scheduledDate || !scheduledTime))}
              fullWidth
              size="lg"
            >
              {loading ? 'Requesting...' : isScheduled ? 'Schedule Ride' : 'Request Ride'}
            </Button>

            {paymentMethods.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-yellow-800 font-medium">Payment Method Required</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Add a payment method to complete your ride request
                    </p>
                    <Button
                      onClick={() => navigate('/rider/payment-methods')}
                      size="sm"
                      className="mt-2"
                    >
                      Add Payment Method
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-8 bg-gray-100 rounded flex items-center justify-center">
                      <CreditCard size={18} className="text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {paymentMethods.find(m => m.stripe_payment_method_id === selectedPaymentMethod)?.card_brand?.toUpperCase()} •••• {paymentMethods.find(m => m.stripe_payment_method_id === selectedPaymentMethod)?.card_last4}
                      </div>
                      <div className="text-xs text-gray-500">Payment method</div>
                    </div>
                  </div>
                  {paymentMethods.length > 1 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/rider/payment-methods')}
                    >
                      Change
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Your Recent Rides</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/rider/history')}
            >
              View All
            </Button>
          </div>
          <RideHistory userId={user?.id || ''} />
        </Card>
      </div>
    </Layout>
  );
}

function RideHistory({ userId }: { userId: string }) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRides();
  }, [userId]);

  const loadRides = async () => {
    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('rider_id', userId)
      .order('requested_at', { ascending: false })
      .limit(5);

    setRides(data || []);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-gray-500">Loading...</div>;
  }

  if (rides.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Navigation size={48} className="mx-auto mb-2 opacity-50" />
        <p>No rides yet. Request your first ride above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rides.map((ride) => (
        <div
          key={ride.id}
          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
          onClick={() => window.location.href = `/rider/ride/${ride.id}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-sm">
                <MapPin size={14} className="text-green-600" />
                <span className="text-gray-900 font-medium truncate">
                  {ride.pickup_address.split(',')[0]}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm mt-1">
                <MapPin size={14} className="text-red-600" />
                <span className="text-gray-900 font-medium truncate">
                  {ride.dropoff_address.split(',')[0]}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  ride.status === 'completed' ? 'bg-green-100 text-green-800' :
                  ride.status === 'canceled' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {ride.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(ride.requested_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-gray-900">
                {formatCurrency(ride.fare_final || ride.fare_estimate)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
