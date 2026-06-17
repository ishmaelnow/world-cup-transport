export interface GeocodingResult {
  address: string;
  lat: number;
  lng: number;
}

interface NominatimSearchResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id?: number;
}

interface NominatimReverseResult {
  display_name?: string;
}

const GEOCODING_API = 'https://nominatim.openstreetmap.org';

export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 5) return [];

  try {
    const params = new URLSearchParams({
      format: 'json',
      q: trimmedQuery,
      limit: '8',
      addressdetails: '1',
      countrycodes: 'us',
    });

    const response = await fetch(`${GEOCODING_API}/search?${params.toString()}`, { signal });

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = (await response.json()) as NominatimSearchResult[];

    const seen = new Set<string>();

    return data
      .map((item) => ({
        address: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }))
      .filter((item) => {
        const key = `${item.address}|${item.lat}|${item.lng}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return Number.isFinite(item.lat) && Number.isFinite(item.lng);
      });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return [];
    }
    console.error('Geocoding error:', error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const params = new URLSearchParams({
      format: 'json',
      lat: String(lat),
      lon: String(lng),
    });

    const response = await fetch(`${GEOCODING_API}/reverse?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Reverse geocoding request failed');
    }

    const data = (await response.json()) as NominatimReverseResult;
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
