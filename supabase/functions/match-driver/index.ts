import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DriverWithDistance {
  id: string;
  distance: number;
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { rideId } = await req.json();

    if (!rideId) {
      return new Response(
        JSON.stringify({ error: 'rideId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: ride, error: rideError } = await supabase
      .from('rides')
      .select('*')
      .eq('id', rideId)
      .single();

    if (rideError || !ride) {
      return new Response(
        JSON.stringify({ error: 'Ride not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (ride.status !== 'matching' && ride.status !== 'requested') {
      return new Response(
        JSON.stringify({ message: 'Ride is not in matching status' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: availableDrivers, error: driversError } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('is_available', true)
      .eq('is_active', true)
      .not('last_location_lat', 'is', null)
      .not('last_location_lng', 'is', null);

    if (driversError || !availableDrivers || availableDrivers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No available drivers found' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const driversWithDistance: DriverWithDistance[] = availableDrivers
      .map((driver) => ({
        id: driver.id,
        distance: calculateDistance(
          ride.pickup_lat,
          ride.pickup_lng,
          driver.last_location_lat!,
          driver.last_location_lng!
        ),
      }))
      .filter((d) => d.distance <= 10)
      .sort((a, b) => a.distance - b.distance);

    if (driversWithDistance.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No drivers within range' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const nearestDriver = driversWithDistance[0];

    const { data: updatedRide, error: updateError } = await supabase
      .from('rides')
      .update({
        driver_id: nearestDriver.id,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', rideId)
      .in('status', ['matching', 'requested'])
      .is('driver_id', null)
      .select()
      .maybeSingle();

    if (updateError || !updatedRide) {
      return new Response(
        JSON.stringify({
          message: 'Ride already accepted by another driver',
          alreadyAssigned: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        driverId: nearestDriver.id,
        distance: nearestDriver.distance,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in match-driver function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});