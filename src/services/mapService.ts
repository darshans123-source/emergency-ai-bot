/**
 * Free OpenStreetMap services for AEGISAI GRID:
 * - Nominatim for Location Search and Reverse Geocoding
 * - OSRM public demo service for driving route previews
 * No API keys or paid external services required.
 */

export interface GeocodeResult {
  id: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
}

export interface OsrmRouteResult {
  status: 'SUCCESS' | 'FAILED';
  distanceKm: number;
  durationMinutes: number;
  polyline: [number, number][]; // [lat, lng] pairs for Leaflet
  summary?: string;
  message?: string;
}

// In-memory cache to prevent redundant requests to Nominatim
const geocodeCache = new Map<string, GeocodeResult[]>();
let lastRequestTime = 0;

/**
 * Searches for places or street addresses using public OpenStreetMap Nominatim.
 * Implements in-memory caching and request throttling to respect usage policies.
 */
export async function searchLocations(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed || trimmed.length < 2) return [];

  if (geocodeCache.has(trimmed)) {
    return geocodeCache.get(trimmed)!;
  }

  // Throttle to respect OpenStreetMap Nominatim usage guidelines (max 1 req/sec)
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - timeSinceLast));
  }
  lastRequestTime = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=6&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'AegisAI-EmergencyGrid/2.0'
      }
    });

    if (!res.ok) {
      throw new Error(`Geocoding failed with status: ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const mapped: GeocodeResult[] = data.map((item: any, idx: number) => ({
      id: String(item.place_id || idx),
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type || item.class
    }));

    geocodeCache.set(trimmed, mapped);
    return mapped;
  } catch (err: any) {
    console.warn('Nominatim location search notice:', err);
    return [];
  }
}

/**
 * Reverse geocodes coordinates to a human-readable street address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en'
      }
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch (err) {
    console.warn('Nominatim reverse geocode notice:', err);
    return null;
  }
}

/**
 * Requests driving route polyline from the public OSRM demo routing endpoint.
 * Note: OSRM expects coordinates in lng,lat order; returned geometry is [lng, lat] which we convert to [lat, lng].
 */
export async function fetchOsrmRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): Promise<OsrmRouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`OSRM service responded with HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) {
      return {
        status: 'FAILED',
        distanceKm: 0,
        durationMinutes: 0,
        polyline: [],
        message: json.message || 'No road route found between coordinates.'
      };
    }

    const route = json.routes[0];
    const distanceKm = Number((route.distance / 1000).toFixed(2));
    const durationMinutes = Math.max(1, Math.round(route.duration / 60));

    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
    const polyline: [number, number][] = (route.geometry?.coordinates || []).map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    return {
      status: 'SUCCESS',
      distanceKm,
      durationMinutes,
      polyline,
      summary: route.legs?.[0]?.summary || 'Primary Road Network'
    };
  } catch (err: any) {
    console.warn('OSRM routing notice (using straight fallback):', err);
    // Graceful fallback to direct connection
    return {
      status: 'FAILED',
      distanceKm: 0,
      durationMinutes: 0,
      polyline: [
        [startLat, startLng],
        [destLat, destLng]
      ],
      message: 'Public OSRM demo service unavailable. Direct coordinate vector displayed.'
    };
  }
}
