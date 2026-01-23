import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const pickupIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const dropoffIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const driverIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3"></circle>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface MapBoundsUpdaterProps {
  bounds: L.LatLngBounds | null;
}

function MapBoundsUpdater({ bounds }: MapBoundsUpdaterProps) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [bounds, map]);

  return null;
}

interface RideMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  driverLat?: number | null;
  driverLng?: number | null;
  pickupAddress?: string;
  dropoffAddress?: string;
  height?: string;
  className?: string;
}

export function RideMap({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  driverLat,
  driverLng,
  pickupAddress,
  dropoffAddress,
  height = '400px',
  className = '',
}: RideMapProps) {
  const boundsRef = useRef<L.LatLngBounds | null>(null);

  // Calculate bounds
  useEffect(() => {
    const points: [number, number][] = [];
    
    if (pickupLat && pickupLng) {
      points.push([pickupLat, pickupLng]);
    }
    if (dropoffLat && dropoffLng) {
      points.push([dropoffLat, dropoffLng]);
    }
    if (driverLat && driverLng) {
      points.push([driverLat, driverLng]);
    }

    if (points.length > 0) {
      boundsRef.current = L.latLngBounds(points);
    } else {
      boundsRef.current = null;
    }
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, driverLat, driverLng]);

  // Default center (can be overridden)
  const defaultCenter: [number, number] = pickupLat && pickupLng 
    ? [pickupLat, pickupLng]
    : [40.7128, -74.0060]; // Default to NYC

  if (!pickupLat || !pickupLng) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center text-gray-500">
          <MapPin size={48} className="mx-auto mb-2 opacity-50" />
          <p>Map will appear when locations are available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-200 ${className}`} style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsUpdater bounds={boundsRef.current} />

        {/* Pickup Marker */}
        {pickupLat && pickupLng && (
          <Marker position={[pickupLat, pickupLng]} icon={pickupIcon}>
            <Popup>
              <div className="text-center">
                <div className="font-semibold text-green-600 mb-1">📍 Pickup</div>
                {pickupAddress && <div className="text-sm text-gray-600">{pickupAddress}</div>}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Dropoff Marker */}
        {dropoffLat && dropoffLng && (
          <Marker position={[dropoffLat, dropoffLng]} icon={dropoffIcon}>
            <Popup>
              <div className="text-center">
                <div className="font-semibold text-red-600 mb-1">📍 Dropoff</div>
                {dropoffAddress && <div className="text-sm text-gray-600">{dropoffAddress}</div>}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Driver Marker */}
        {driverLat && driverLng && (
          <Marker position={[driverLat, driverLng]} icon={driverIcon}>
            <Popup>
              <div className="text-center">
                <div className="font-semibold text-blue-600 mb-1">🚗 Driver</div>
                <div className="text-sm text-gray-600">Current location</div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

