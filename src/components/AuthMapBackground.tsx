import { CircleMarker, MapContainer, Polyline, TileLayer } from 'react-leaflet';

const dallasCenter: [number, number] = [32.7831, -96.8067];

const routes: [number, number][][] = [
  [
    [32.8975, -97.0404],
    [32.8688, -96.9398],
    [32.8173, -96.8496],
    [32.7767, -96.797],
  ],
  [
    [32.8471, -96.8518],
    [32.8212, -96.7982],
    [32.7816, -96.782],
    [32.7412, -96.8177],
  ],
  [
    [32.8459, -96.9957],
    [32.8125, -96.9027],
    [32.7858, -96.8081],
    [32.7555, -96.7507],
  ],
];

const stops: [number, number][] = [
  [32.8975, -97.0404],
  [32.7767, -96.797],
  [32.8471, -96.8518],
  [32.7412, -96.8177],
  [32.8459, -96.9957],
  [32.7555, -96.7507],
];

export function AuthMapBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-slate-100" aria-hidden="true">
      <MapContainer
        center={dallasCenter}
        zoom={11}
        minZoom={10}
        maxZoom={13}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        keyboard={false}
        className="relative z-0 h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {routes.map((route, index) => (
          <Polyline
            key={`route-${index}`}
            positions={route}
            pathOptions={{
              color: index === 0 ? '#2563eb' : '#059669',
              weight: 5,
              opacity: 0.68,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        ))}
        {stops.map((stop, index) => (
          <CircleMarker
            key={`stop-${index}`}
            center={stop}
            radius={index % 2 === 0 ? 7 : 5}
            pathOptions={{
              color: '#ffffff',
              fillColor: index % 2 === 0 ? '#2563eb' : '#dc2626',
              fillOpacity: 0.95,
              weight: 3,
            }}
          />
        ))}
      </MapContainer>
      <div className="absolute inset-0 z-[1] bg-white/58" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-br from-white/90 via-white/50 to-emerald-50/65" />
      <div className="absolute inset-x-0 top-0 z-[3] h-40 bg-gradient-to-b from-white/95 to-transparent" />
    </div>
  );
}
