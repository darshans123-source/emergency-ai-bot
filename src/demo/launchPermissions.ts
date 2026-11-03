// Launch detection: location + microphone permission, on app open.
// Runs once per browser session, never blocks the app, and never
// records anything: the microphone stream is stopped immediately after
// the permission check, and coordinates are stored only through the
// existing locationService (sessionStorage, 1-hour expiry) — never in
// localStorage. Permission *status* (granted/denied, no coordinates)
// is kept in localStorage so Settings can show it.
// If the user denies, nothing breaks: Live Map, Report and agents all
// keep working with manual location entry, and a retry button is
// offered instead of an error banner.
import { locationService } from '../services/locationService';

export type PermissionState = 'granted' | 'denied' | 'unsupported' | 'prompt' | 'unknown' | 'error';

export interface LaunchPermissions {
  location: PermissionState;
  mic: PermissionState;
  updatedAt: number;
}

const STATUS_KEY = 'aegis_launch_permissions';
const SESSION_KEY = 'aegis_launch_permissions_done';

export function getLaunchPermissions(): LaunchPermissions | null {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? (JSON.parse(raw) as LaunchPermissions) : null;
  } catch {
    return null;
  }
}

export function saveLaunchPermissions(p: LaunchPermissions): void {
  try {
    localStorage.setItem(STATUS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function hasLaunchPermissionsRunThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markLaunchPermissionsRun(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

async function queryPermission(name: 'geolocation' | 'microphone'): Promise<PermissionState> {
  try {
    const nav = navigator as Navigator & { permissions?: { query: (d: { name: string }) => Promise<{ state: string }> } };
    if (!nav.permissions?.query) return 'unknown';
    const res = await nav.permissions.query({ name });
    if (res.state === 'granted' || res.state === 'denied' || res.state === 'prompt') return res.state;
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Check microphone permission only: open the stream, then stop it at once. No recording. */
async function checkMicPermission(): Promise<PermissionState> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return 'unsupported';
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    return 'granted';
  } catch (e: unknown) {
    const name = (e as { name?: string })?.name || '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'unsupported';
    return 'error';
  }
}

/**
 * Detect + request location and microphone on app launch, and save the
 * location through locationService so Live Map, Report, Dashboard and
 * agents all use it automatically. Returns the resulting statuses.
 */
export async function requestLaunchPermissions(): Promise<LaunchPermissions> {
  let location: PermissionState = 'unknown';
  let mic: PermissionState = 'unknown';

  // Location first (this is the one the app actually uses).
  try {
    if (!locationService.isGeolocationSupported()) {
      location = 'unsupported';
    } else {
      const coords = await locationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      });
      let address = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
      try {
        address = await locationService.reverseGeocode(coords.latitude, coords.longitude);
      } catch {
        /* keep coordinate fallback */
      }
      locationService.setConfirmedLocation({
        coordinates: coords,
        address,
        timestamp: Date.now(),
        verified: true,
        source: 'GPS_LIVE',
      });
      location = 'granted';
    }
  } catch (e: unknown) {
    const msg = (e as Error)?.message || '';
    location = msg.includes('denied') || msg.includes('permission') ? 'denied' : 'error';
    // Fall back to the Permissions API state for a clearer status.
    if (location === 'error') {
      const q = await queryPermission('geolocation');
      if (q !== 'unknown') location = q;
    }
  }

  // Microphone: permission check only, stream stopped immediately.
  try {
    mic = await checkMicPermission();
    if (mic === 'error') {
      const q = await queryPermission('microphone');
      if (q !== 'unknown') mic = q;
    }
  } catch {
    mic = 'error';
  }

  const result: LaunchPermissions = { location, mic, updatedAt: Date.now() };
  saveLaunchPermissions(result);
  return result;
}
