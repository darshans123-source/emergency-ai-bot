import { EmergencyFacility } from '../types';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface UserLocationDetails {
  coordinates: GeoCoordinates;
  address: string;
  timestamp: number;
  verified: boolean;
  source: 'GPS_LIVE' | 'MANUAL';
}

const STORAGE_KEY = 'aegis_confirmed_user_location';
const ADDRESS_CACHE_KEY_PREFIX = 'aegis_revgeo_';

class LocationService {
  private inMemoryLocation: UserLocationDetails | null = null;
  private watchId: number | null = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Only use stored location if less than 1 hour old
          if (Date.now() - parsed.timestamp < 3600000) {
            this.inMemoryLocation = parsed;
          } else {
            sessionStorage.removeItem(STORAGE_KEY);
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Check if browser supports Geolocation API
   */
  public isGeolocationSupported(): boolean {
    return typeof window !== 'undefined' && 'navigator' in window && 'geolocation' in navigator;
  }

  /**
   * Get current device location via browser Geolocation API
   */
  public async getCurrentPosition(
    options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000
    }
  ): Promise<GeoCoordinates> {
    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocation is not supported by your current browser.');
    }

    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.protocol !== 'http:' &&
      window.location.hostname !== 'localhost'
    ) {
      throw new Error('Geolocation requires a secure context (HTTPS or localhost).');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: GeoCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
            altitude: position.coords.altitude,
            heading: position.coords.heading,
            speed: position.coords.speed
          };
          resolve(coords);
        },
        (error) => {
          let msg = 'Failed to acquire device location.';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = 'Location permission was denied. Please allow location access in your browser address bar.';
              break;
            case error.POSITION_UNAVAILABLE:
              msg = 'Device location is currently unavailable. Please verify GPS or network location settings.';
              break;
            case error.TIMEOUT:
              msg = 'Location request timed out. Please retry or enter your address manually.';
              break;
          }
          reject(new Error(msg));
        },
        options
      );
    });
  }

  /**
   * Start continuous location watching
   */
  public startTracking(
    onPosition: (pos: GeoCoordinates) => void,
    onError?: (err: Error) => void
  ): number {
    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocation is not supported by your browser.');
    }

    this.stopTracking();

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: GeoCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          altitude: position.coords.altitude,
          heading: position.coords.heading,
          speed: position.coords.speed
        };
        onPosition(coords);
      },
      (error) => {
        let msg = 'Tracking error.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location tracking permission denied.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'GPS signal lost during tracking.';
        }
        if (onError) onError(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 12000
      }
    );

    return this.watchId;
  }

  /**
   * Stop active continuous location watching
   */
  public stopTracking(): void {
    if (this.watchId !== null && this.isGeolocationSupported()) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Reverse-geocode coordinates to an address using OpenStreetMap Nominatim
   * Works completely independently of AI API
   */
  public async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const cacheKey = `${ADDRESS_CACHE_KEY_PREFIX}${latitude.toFixed(4)}_${longitude.toFixed(4)}`;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) return cached;
      }
    } catch {
      // ignore
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'en,hi,kn'
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const addr = data.display_name;
          try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
              sessionStorage.setItem(cacheKey, addr);
            }
          } catch {
            // ignore
          }
          return addr;
        }
      }
    } catch (err) {
      console.warn('[LocationService] Reverse geocode network fallback:', err);
    }

    return `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  }

  /**
   * Haversine formula to compute great-circle distance between two GPS coordinates in kilometers
   */
  public calculateDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Return real nearby facilities sorted by distance from coordinates
   * Works completely independently of AI API
   */
  public async findNearbyFacilities(
    latitude: number,
    longitude: number,
    typeFilter?: 'HOSPITAL' | 'POLICE_STATION' | 'WATER_FACILITY' | 'POWER_SUBSTATION' | 'ALL'
  ): Promise<Array<EmergencyFacility & { distanceKm: number }>> {
    try {
      const endpoint =
        typeFilter && typeFilter !== 'ALL'
          ? `/api/facilities?type=${encodeURIComponent(typeFilter)}`
          : '/api/facilities';
      const res = await fetch(endpoint);
      if (res.ok) {
        const facilities: EmergencyFacility[] = await res.json();
        const withDistances = facilities.map((f) => ({
          ...f,
          distanceKm: this.calculateDistanceKm(latitude, longitude, f.latitude, f.longitude)
        }));
        return withDistances.sort((a, b) => a.distanceKm - b.distanceKm);
      }
    } catch (err) {
      console.warn('[LocationService] Facilities API error:', err);
    }
    return [];
  }

  /**
   * Get confirmed location from memory/sessionStorage
   */
  public getConfirmedLocation(): UserLocationDetails | null {
    if (this.inMemoryLocation) {
      if (Date.now() - this.inMemoryLocation.timestamp < 3600000) {
        return this.inMemoryLocation;
      }
      this.clearConfirmedLocation();
    }
    return null;
  }

  /**
   * Save confirmed location to memory and sessionStorage
   */
  public setConfirmedLocation(loc: UserLocationDetails): void {
    this.inMemoryLocation = loc;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Clear confirmed location
   */
  public clearConfirmedLocation(): void {
    this.inMemoryLocation = null;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }
}

export const locationService = new LocationService();
