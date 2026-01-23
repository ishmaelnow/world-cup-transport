export interface FareConfig {
  baseFare: number;
  perMile: number;
  perMinute: number;
  minimumFare: number;
  surgeMultiplier: number;
}

const DEFAULT_FARE_CONFIG: FareConfig = {
  baseFare: 2.5,
  perMile: 1.75,
  perMinute: 0.35,
  minimumFare: 5.0,
  surgeMultiplier: 1.0,
};

export function calculateFare(
  distanceMiles: number,
  durationMinutes: number,
  config: Partial<FareConfig> = {}
): number {
  const fullConfig = { ...DEFAULT_FARE_CONFIG, ...config };

  const distanceCost = distanceMiles * fullConfig.perMile;
  const timeCost = durationMinutes * fullConfig.perMinute;
  const subtotal = fullConfig.baseFare + distanceCost + timeCost;

  const withSurge = subtotal * fullConfig.surgeMultiplier;

  return Math.max(withSurge, fullConfig.minimumFare);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function calculateDistance(
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
