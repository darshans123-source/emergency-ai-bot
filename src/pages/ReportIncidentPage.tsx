import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { IncidentCategory } from '../types';
import { auth, saveIncidentToFirestore } from '../services/firebase';
import { searchLocations, reverseGeocode, GeocodeResult } from '../services/mapService';
import L from 'leaflet';
import {
  FilePlus2,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Navigation,
  Search,
  X,
  RefreshCw
} from 'lucide-react';

export const ReportIncidentPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('ROAD_ACCIDENT');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | ''>(37.7858);
  const [longitude, setLongitude] = useState<number | ''>(-122.4065);
  const [hasCoordinates, setHasCoordinates] = useState(true);
  const [casualtiesCount, setCasualtiesCount] = useState<number>(0);
  const [reporterName, setReporterName] = useState(user?.name || '');
  const [reporterContact, setReporterContact] = useState(user?.email || '');

  // GPS & Geocoding states
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null);

  // Leaflet Mini Map Ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const presets = [
    { label: 'Market & 4th St', lat: 37.7858, lng: -122.4065, addr: 'Market St & 4th St, Downtown' },
    { label: 'East Industrial 16th', lat: 37.7650, lng: -122.3910, addr: 'East Industrial Corridor, 3rd & 16th St' },
    { label: 'Pier 14 Waterfront', lat: 37.7935, lng: -122.3925, addr: 'Embarcadero Pier 14 Waterfront' },
    { label: 'Westside Transit Hub', lat: 37.7812, lng: -122.4215, addr: 'Westside Transit Center, Van Ness Ave' }
  ];

  // Initialize Map with OpenStreetMap Standard Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = typeof latitude === 'number' ? latitude : 37.7749;
      const initialLng = typeof longitude === 'number' ? longitude : -122.4194;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;

      if (hasCoordinates && typeof latitude === 'number' && typeof longitude === 'number') {
        const marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          const lat = Number(pos.lat.toFixed(5));
          const lng = Number(pos.lng.toFixed(5));
          setLatitude(lat);
          setLongitude(lng);
          // Optional reverse geocoding on drag
          const resolvedAddr = await reverseGeocode(lat, lng);
          if (resolvedAddr) setAddress(resolvedAddr);
        });
        markerRef.current = marker;
      }

      map.on('click', async (e) => {
        setHasCoordinates(true);
        const lat = Number(e.latlng.lat.toFixed(5));
        const lng = Number(e.latlng.lng.toFixed(5));
        setLatitude(lat);
        setLongitude(lng);

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
          marker.on('dragend', async () => {
            const pos = marker.getLatLng();
            const dlat = Number(pos.lat.toFixed(5));
            const dlng = Number(pos.lng.toFixed(5));
            setLatitude(dlat);
            setLongitude(dlng);
            const resolvedAddr = await reverseGeocode(dlat, dlng);
            if (resolvedAddr) setAddress(resolvedAddr);
          });
          markerRef.current = marker;
        }

        const resolvedAddr = await reverseGeocode(lat, lng);
        if (resolvedAddr) setAddress(resolvedAddr);
      });
    }

    return () => {
      // Map cleanup
    };
  }, []);

  // Update map marker when manual lat/lng change
  const handleManualCoordChange = (newLat: number | '', newLng: number | '') => {
    setLatitude(newLat);
    setLongitude(newLng);

    if (typeof newLat === 'number' && typeof newLng === 'number' && mapInstanceRef.current) {
      setHasCoordinates(true);
      mapInstanceRef.current.flyTo([newLat, newLng], 14);
      if (markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
      } else {
        markerRef.current = L.marker([newLat, newLng], { draggable: true }).addTo(mapInstanceRef.current);
      }
    }
  };

  // Browser Geolocation: Get Current Device Location
  const handleUseCurrentLocation = () => {
    setLocationNotice(null);

    if (!('geolocation' in navigator)) {
      setLocationNotice('Geolocation is not supported by your browser.');
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        const acc = Math.round(pos.coords.accuracy);

        setLatitude(lat);
        setLongitude(lng);
        setHasCoordinates(true);
        setLocationNotice(`Current device location locked (Accuracy: ±${acc}m)`);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current);
          }
        }

        // Reverse geocode to find address
        const resolved = await reverseGeocode(lat, lng);
        if (resolved) {
          setAddress(resolved);
        }
        setIsGettingLocation(false);
      },
      (err) => {
        let msg = 'Could not access device location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please grant permission in browser settings or pick on map.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        setLocationNotice(msg);
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // OpenStreetMap Nominatim Search
  const handleSearchPlaces = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (loc: GeocodeResult) => {
    setShowSearchResults(false);
    setSearchQuery(loc.displayName);
    setAddress(loc.displayName);
    setLatitude(loc.lat);
    setLongitude(loc.lng);
    setHasCoordinates(true);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.lat, loc.lng], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([loc.lat, loc.lng]);
      } else {
        markerRef.current = L.marker([loc.lat, loc.lng], { draggable: true }).addTo(mapInstanceRef.current);
      }
    }
  };

  const handleApplyPreset = (p: { label: string; lat: number; lng: number; addr: string }) => {
    setAddress(p.addr);
    setHasCoordinates(true);
    setLatitude(p.lat);
    setLongitude(p.lng);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([p.lat, p.lng], 14);
      if (markerRef.current) {
        markerRef.current.setLatLng([p.lat, p.lng]);
      } else {
        markerRef.current = L.marker([p.lat, p.lng], { draggable: true }).addTo(mapInstanceRef.current);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!title.trim() || !description.trim()) {
        throw new Error('Please provide an incident title and description.');
      }

      const verified = hasCoordinates && typeof latitude === 'number' && typeof longitude === 'number';

      const payload = {
        title: title.trim(),
        category,
        description: description.trim(),
        address: address.trim() || (verified ? 'GPS Point on Map' : 'Unspecified address'),
        latitude: verified ? (latitude as number) : null,
        longitude: verified ? (longitude as number) : null,
        locationVerified: verified,
        casualtiesCount,
        reporterName: reporterName.trim() || 'Anonymous Caller',
        reporterContact: reporterContact.trim() || 'N/A'
      };

      const created = await api.createIncident(payload);

      // Save to Firebase Firestore if logged in
      try {
        if (auth.currentUser) {
          await saveIncidentToFirestore(created);
        }
      } catch (fbErr) {
        console.warn('Firestore optional sync notice:', fbErr);
      }

      setCreatedIncidentId(created.id);
    } catch (err: any) {
      setError(err.message || 'Failed to submit incident report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdIncidentId) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white border border-slate-200 rounded-xl p-8 text-center space-y-6 shadow-xs">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">Incident Reported Successfully</h2>
          <p className="text-sm text-slate-500 mt-1">
            Emergency reference: <span className="font-mono font-bold text-blue-600">{createdIncidentId}</span>
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs text-slate-700 space-y-1">
          <p><span className="font-medium text-slate-500">Category:</span> {category.replace('_', ' ')}</p>
          <p><span className="font-medium text-slate-500">Location:</span> {address || 'Coordinates only'}</p>
          <p><span className="font-medium text-slate-500">Coordinates:</span> {typeof latitude === 'number' ? `${latitude}, ${longitude}` : 'Unverified'}</p>
          <p><span className="font-medium text-slate-500">Status:</span> Triaged and dispatched to AI Emergency Response Agents</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(`/incidents/${createdIncidentId}`)}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center justify-center gap-2 transition"
          >
            <span>Open Incident Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCreatedIncidentId(null);
              setTitle('');
              setDescription('');
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg border border-slate-300 transition"
          >
            Submit Another Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Report Emergency Incident
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit emergency reports. Confirmed GPS coordinates enable autonomous road-network routing.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-600 font-medium border border-slate-200">
            Intake Form
          </span>
        </div>

        {error && (
          <div className="m-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-sm">
          {/* Section 1: Core Incident Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Incident Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Multi-Vehicle Collision on Market St"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="ROAD_ACCIDENT">Road Accident</option>
                <option value="MEDICAL_EMERGENCY">Medical Emergency</option>
                <option value="FIRE_INCIDENT">Fire Incident</option>
                <option value="FLOOD">Flood</option>
                <option value="NATURAL_DISASTER">Natural Disaster</option>
                <option value="PUBLIC_SAFETY">Public Safety Hazard</option>
                <option value="OTHER">Other Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe hazards, injuries, trapped occupants, flame spread, or power lines down..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Section 2: Location & Map Selection */}
          <div className="border-t border-slate-200 pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>Geographic Location</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Click on map, drag the pin, search by address, or use your current device GPS.
                </p>
              </div>

              {/* Action Buttons: Current Location & Status */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isGettingLocation}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  title="Detect and use current device location via browser Geolocation API"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isGettingLocation ? 'animate-spin' : ''}`} />
                  <span>{isGettingLocation ? 'Acquiring GPS...' : 'Use My Current Location'}</span>
                </button>

                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                    hasCoordinates && typeof latitude === 'number'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {hasCoordinates && typeof latitude === 'number' ? 'GPS Coordinates Verified' : 'Unverified'}
                </span>
              </div>
            </div>

            {locationNotice && (
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center justify-between">
                <span>{locationNotice}</span>
                <button type="button" onClick={() => setLocationNotice(null)} className="text-blue-600 hover:text-blue-800">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Nominatim Search & Presets Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Location Search Field */}
              <div className="relative flex-1">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchPlaces(e);
                      }
                    }}
                    placeholder="Search place or street address on OpenStreetMap..."
                    className="w-full pl-9 pr-16 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSearchPlaces}
                    disabled={isSearching}
                    className="absolute right-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition"
                  >
                    {isSearching ? '...' : 'Search'}
                  </button>
                </div>

                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-50 text-xs max-h-48 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(r)}
                        className="w-full text-left p-2 hover:bg-slate-50 border-b border-slate-100 last:border-none flex items-start gap-1.5 text-slate-700"
                      >
                        <MapPin className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <span className="truncate">{r.displayName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
                <span className="text-slate-400 text-[11px] shrink-0 font-medium">Presets:</span>
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs shrink-0 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Map Container */}
            <div className="rounded-lg border border-slate-300 overflow-hidden shadow-xs h-64 bg-slate-50 relative">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>

            {/* Coordinate inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Market St & 4th St"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => handleManualCoordChange(e.target.value ? parseFloat(e.target.value) : '', longitude)}
                  placeholder="37.7749"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => handleManualCoordChange(latitude, e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="-122.4194"
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Casualties and Caller Info */}
          <div className="border-t border-slate-200 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Casualties Count
              </label>
              <input
                type="number"
                min={0}
                value={casualtiesCount}
                onChange={(e) => setCasualtiesCount(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reporter / Caller Name
              </label>
              <input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Caller Name"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone / Radio
              </label>
              <input
                type="text"
                value={reporterContact}
                onChange={(e) => setReporterContact(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="border-t border-slate-200 pt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-2"
            >
              <FilePlus2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting Report...' : 'Log Incident & Dispatch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
