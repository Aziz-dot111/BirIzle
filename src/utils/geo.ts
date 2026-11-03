import type { Coordinates, Store } from '@/types';

/**
 * Earth radius in kilometers (WGS84 spherical mean radius)
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Reference coordinates for regional centroids (manual fallback when GPS is unavailable)
 */
export const CITY_CENTROIDS: Record<string, Coordinates> = {
  // Qoraqalpog‘iston Respublikasi tuman va shaharlari
  Nukus: { lat: 42.4619, lng: 59.6166 },
  'Xo‘jayli': { lat: 42.4042, lng: 59.4583 },
  Taxiatosh: { lat: 42.3275, lng: 59.5539 },
  'Qo‘ng‘irot': { lat: 43.0417, lng: 58.8417 },
  Chimboy: { lat: 42.9333, lng: 59.7667 },
  Beruniy: { lat: 41.6917, lng: 60.7500 },
  'To‘rtko‘l': { lat: 41.5667, lng: 61.0000 },
  'Bo‘ston (Ellikqala)': { lat: 41.8333, lng: 60.9167 },
  'Mang‘it (Amudaryo)': { lat: 42.1167, lng: 60.0667 },
  'Mo‘ynoq': { lat: 43.7667, lng: 59.0333 },
  Kegeyli: { lat: 42.7833, lng: 59.6000 },
  'Qanliko‘l': { lat: 42.7833, lng: 59.1333 },
  Shumanay: { lat: 42.5000, lng: 58.9167 },
  'Taxtako‘pir': { lat: 43.0333, lng: 60.2833 },
  'Qorao‘zak': { lat: 42.5833, lng: 59.9000 },
  'Bo‘zatov': { lat: 43.0000, lng: 59.3500 },
  // Boshqa yirik markazlar
  Toshkent: { lat: 41.2995, lng: 69.2401 },
  Samarqand: { lat: 39.6542, lng: 66.9597 },
  Buxoro: { lat: 39.7681, lng: 64.4556 },
  Urganch: { lat: 41.5562, lng: 60.6317 },
  Andijon: { lat: 40.7821, lng: 72.3442 },
  'Farg‘ona': { lat: 40.3842, lng: 71.7843 },
  Namangan: { lat: 40.9983, lng: 71.6726 },
  Qarshi: { lat: 38.8606, lng: 65.7891 },
  Termiz: { lat: 37.2242, lng: 67.2783 },
  Jizzax: { lat: 40.1258, lng: 67.8422 },
  Navoiy: { lat: 40.0844, lng: 65.3792 },
  Guliston: { lat: 40.4897, lng: 68.7842 },
};

/**
 * Validates whether the given value contains valid real-world geographic coordinates.
 * Latitude must be within [-90, 90] and Longitude within [-180, 180].
 * Disallows (0, 0) "Null Island" placeholder coordinates as valid store locations.
 */
export function isValidCoordinates(coords?: unknown): coords is Coordinates {
  if (!coords || typeof coords !== 'object') return false;

  const c = coords as { lat?: unknown; lng?: unknown };
  if (typeof c.lat !== 'number' || typeof c.lng !== 'number') return false;
  if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return false;

  // Latitude must be -90 to +90
  if (c.lat < -90 || c.lat > 90) return false;
  // Longitude must be -180 to +180
  if (c.lng < -180 || c.lng > 180) return false;

  // Ignore 0,0 default / empty points
  if (Math.abs(c.lat) < 0.000001 && Math.abs(c.lng) < 0.000001) return false;

  return true;
}

/**
 * Safely extracts geographic coordinates from diverse Firestore schema formats:
 * - { coordinates: { lat, lng } }
 * - { coordinates: { latitude, longitude } }
 * - { location: { latitude, longitude } } or { location: { lat, lng } }
 * - Firestore GeoPoint instance with .latitude and .longitude
 * - Top-level lat/latitude and lng/longitude
 * 
 * Returns validated Coordinates object, or null if missing/invalid.
 */
export function normalizeStoreCoordinates(data: Record<string, unknown>): Coordinates | null {
  if (!data || typeof data !== 'object') return null;

  let rawLat: unknown = undefined;
  let rawLng: unknown = undefined;

  // 1. Check coordinates sub-object
  if (data.coordinates && typeof data.coordinates === 'object') {
    const c = data.coordinates as Record<string, unknown>;
    rawLat = c.lat ?? c.latitude;
    rawLng = c.lng ?? c.longitude;
  }

  // 2. Check location sub-object
  if ((rawLat === undefined || rawLng === undefined) && data.location && typeof data.location === 'object') {
    const loc = data.location as Record<string, unknown>;
    rawLat = loc.lat ?? loc.latitude;
    rawLng = loc.lng ?? loc.longitude;
  }

  // 3. Check direct properties
  if (rawLat === undefined || rawLng === undefined) {
    rawLat = data.lat ?? data.latitude;
    rawLng = data.lng ?? data.longitude;
  }

  const latNum = typeof rawLat === 'number' ? rawLat : parseFloat(String(rawLat));
  const lngNum = typeof rawLng === 'number' ? rawLng : parseFloat(String(rawLng));

  const candidate: Coordinates = { lat: latNum, lng: lngNum };
  if (isValidCoordinates(candidate)) {
    return candidate;
  }

  return null;
}

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 * Returns distance in kilometers rounded to 1 decimal place.
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  if (!isValidCoordinates(coord1) || !isValidCoordinates(coord2)) {
    return Infinity;
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.lat);
  const deltaLat = toRad(coord2.lat - coord1.lat);
  const deltaLng = toRad(coord2.lng - coord1.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  // Round to 1 decimal place (e.g. 1.4 km)
  return Math.round(distance * 10) / 10;
}

/**
 * Formats a distance in kilometers into a friendly localized string.
 * Examples:
 * - 0.45 km -> "450 m"
 * - 2.4 km -> "2.4 km"
 * - Infinity or null -> "Masofa noma’lum"
 */
export function formatDistance(distanceKm?: number | null, lang: 'uz' | 'ru' = 'uz'): string {
  if (distanceKm === undefined || distanceKm === null || !Number.isFinite(distanceKm)) {
    return lang === 'ru' ? 'Расстояние неизвестно' : 'Masofa noma’lum';
  }

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} ${lang === 'ru' ? 'м' : 'm'}`;
  }

  return `${distanceKm.toFixed(1)} ${lang === 'ru' ? 'км' : 'km'}`;
}

/**
 * Attaches calculated distance to each store based on reference coordinates.
 * Stores without valid coordinates have distanceKm = undefined.
 */
export function enrichStoresWithDistance(
  stores: Store[],
  userCoords?: Coordinates | null
): Store[] {
  if (!userCoords || !isValidCoordinates(userCoords)) {
    return stores;
  }

  return stores.map((store) => {
    if (!isValidCoordinates(store.coordinates)) {
      return { ...store, distanceKm: undefined };
    }
    const dist = calculateHaversineDistance(userCoords, store.coordinates);
    return { ...store, distanceKm: dist };
  });
}

/**
 * Filters stores by maximum distance radius in kilometers.
 * Stores with unknown coordinates are excluded if a radius is explicitly enforced.
 */
export function filterStoresByRadius(
  stores: Store[],
  userCoords: Coordinates | null,
  radiusKm?: number
): Store[] {
  if (!userCoords || !radiusKm || radiusKm <= 0 || !isValidCoordinates(userCoords)) {
    return stores;
  }

  return stores
    .map((store) => {
      if (!isValidCoordinates(store.coordinates)) {
        return { ...store, distanceKm: undefined };
      }
      const distance = calculateHaversineDistance(userCoords, store.coordinates);
      return { ...store, distanceKm: distance };
    })
    .filter((store) => store.distanceKm !== undefined && store.distanceKm <= radiusKm);
}

/**
 * Sorts stores by distance in ascending order (closest first).
 * Stores without coordinates or distance are sorted at the end.
 */
export function sortStoresByDistance(stores: Store[]): Store[] {
  return [...stores].sort((a, b) => {
    if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
    if (a.distanceKm === undefined) return 1;
    if (b.distanceKm === undefined) return -1;
    return a.distanceKm - b.distanceKm;
  });
}
