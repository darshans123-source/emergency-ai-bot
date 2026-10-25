import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { Incident, Resource, RouteCalculationResult } from '../types';
import { searchLocations, fetchOsrmRoute, GeocodeResult, OsrmRouteResult } from '../services/mapService';
import L from 'leaflet';
import {
  MapPin,
  RefreshCw,
  Navigation,
  ChevronRight,
  Crosshair,
  Layers,
  Search,
  X,
  Radio,
  AlertCircle,
  Clock,
  Compass,
  CheckCircle2,
  ExternalLink,
  Shield,
  Truck,
  Flame,
  Info
} from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

export const LiveMapPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedIncidentId = searchParams.get('incidentId');

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('ALL');

  // Live Location Tracking State
  const [isTracking, setIsTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    lastUpdated?: Date;
  } | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Location Search (Nominatim) State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // OSRM Routing State
  const [routeOrigin, setRouteOrigin] = useState<'USER_GPS' | 'RESOURCE' | 'NONE'>('NONE');
  const [osrmRoute, setOsrmRoute] = useState<OsrmRouteResult | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Map DOM and Leaflet References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const incidentLayerRef = useRef<L.LayerGroup | null>(null);
  const resourceLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Load Real Database Data
  const loadData = async () => {
    try {
      const [incRes, resRes] = await Promise.all([
        api.getIncidents({ limit: 100 }),
        api.getResources()
      ]);
      setIncidents(incRes.incidents || []);
      setResources(resRes || []);

      if (preselectedIncidentId) {
        const found = incRes.incidents.find((i) => i.id === preselectedIncidentId);
        if (found) {
          setSelectedIncident(found);
        }
      }
    } catch (err) {
      console.error('Failed to load map incidents or fleet:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [preselectedIncidentId]);

  // Initialize Leaflet Map with OpenStreetMap Standard Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [37.7785, -122.4115], // Central Metro Hub
        zoom: 13,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Free standard OpenStreetMap tile server
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
      incidentLayerRef.current = L.layerGroup().addTo(map);
      resourceLayerRef.current = L.layerGroup().addTo(map);
      userLocationLayerRef.current = L.layerGroup().addTo(map);
      searchMarkerLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Click outside to close location search popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // -------------------------------------------------------------
  // LIVE LOCATION TRACKING (Browser Geolocation API)
  // -------------------------------------------------------------
  const startTracking = () => {
    setTrackingError(null);

    if (!('geolocation' in navigator)) {
      setTrackingError('Geolocation is not supported by your current browser.');
      return;
    }

    setIsTracking(true);

    const successHandler = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      const updatedLoc = {
        latitude: Number(latitude.toFixed(5)),
        longitude: Number(longitude.toFixed(5)),
        accuracy: Math.round(accuracy),
        lastUpdated: new Date()
      };
      setUserLocation(updatedLoc);

      // Pan map smoothly on first lock
      if (!userLocation && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([latitude, longitude], 14, { duration: 1.2 });
      }
    };

    const errorHandler = (error: GeolocationPositionError) => {
      let msg = 'Could not retrieve your location.';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          msg = 'Location permission was denied. Please allow location access in your browser settings.';
          break;
        case error.POSITION_UNAVAILABLE:
          msg = 'Location information is currently unavailable from device sensors.';
          break;
        case error.TIMEOUT:
          msg = 'Location request timed out. Retrying...';
          break;
      }
      setTrackingError(msg);
      setIsTracking(false);
    };

    try {
      const id = navigator.geolocation.watchPosition(successHandler, errorHandler, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000
      });
      watchIdRef.current = id;
    } catch {
      setTrackingError('Failed to initialize geolocation tracking.');
      setIsTracking(false);
    }
  };

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    if (userLocationLayerRef.current) {
      userLocationLayerRef.current.clearLayers();
    }
  }, []);

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Render User Location Marker & Accuracy Circle
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocationLayerRef.current) return;
    userLocationLayerRef.current.clearLayers();

    if (userLocation && isTracking) {
      const { latitude, longitude, accuracy } = userLocation;

      // Accuracy radius circle
      if (accuracy && accuracy > 0) {
        const circle = L.circle([latitude, longitude], {
          radius: accuracy,
          color: '#3b82f6',
          fillColor: '#93c5fd',
          fillOpacity: 0.18,
          weight: 1
        });
        userLocationLayerRef.current.addLayer(circle);
      }

      // Live location pulsing pin
      const userIcon = L.divIcon({
        className: 'user-live-pin',
        html: `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 24px; height: 24px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; background: #2563eb; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([latitude, longitude], { icon: userIcon });
      marker.bindTooltip(
        `<strong>My Current Location</strong><br/>Lat: ${latitude}, Lng: ${longitude}<br/>Accuracy: ±${accuracy || 0}m`,
        { direction: 'top', offset: [0, -12] }
      );
      userLocationLayerRef.current.addLayer(marker);
    }
  }, [userLocation, isTracking]);

  // -------------------------------------------------------------
  // INCIDENT AND RESOURCE MARKERS
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mapInstanceRef.current || !incidentLayerRef.current || !resourceLayerRef.current) return;

    incidentLayerRef.current.clearLayers();
    resourceLayerRef.current.clearLayers();

    // 1. Incidents
    const filteredIncidents = incidents.filter((inc) => {
      if (!inc.location.verified || inc.location.latitude === null || inc.location.longitude === null) return false;
      if (priorityFilter !== 'ALL' && inc.priority !== priorityFilter) return false;
      return true;
    });

    filteredIncidents.forEach((inc) => {
      const isCritical = inc.priority === 'CRITICAL';
      const isHigh = inc.priority === 'HIGH';
      const color = isCritical ? '#dc2626' : isHigh ? '#ea580c' : '#2563eb';

      const customIcon = L.divIcon({
        className: 'incident-marker-pin',
        html: `
          <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.35); border: 2.5px solid white; cursor: pointer;">
            !
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([inc.location.latitude!, inc.location.longitude!], { icon: customIcon });

      marker.on('click', () => {
        setSelectedIncident(inc);
        setSelectedResource(null);
        setRouteOrigin('NONE');
        if (routePolylineRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(routePolylineRef.current);
          routePolylineRef.current = null;
        }
        setOsrmRoute(null);
      });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 2px;">
          <div style="font-weight: 700; color: ${color}; margin-bottom: 2px;">${inc.id} • ${inc.priority}</div>
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 4px;">${inc.title}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">${inc.location.address}</div>
          <div style="font-size: 11px; color: #0284c7; cursor: pointer; text-decoration: underline;" onclick="window.location.hash='#/incidents/${inc.id}'">
            Open Details &rarr;
          </div>
        </div>
      `);

      incidentLayerRef.current?.addLayer(marker);
    });

    // 2. Resources (Registered Staging Coordinates)
    const filteredResources = resources.filter((res) => {
      if (typeof res.latitude !== 'number' || typeof res.longitude !== 'number') return false;
      if (resourceTypeFilter !== 'ALL' && res.type !== resourceTypeFilter) return false;
      return true;
    });

    filteredResources.forEach((res) => {
      const isAvailable = res.status === 'AVAILABLE';
      const color = isAvailable ? '#059669' : '#64748b';

      const resIcon = L.divIcon({
        className: 'resource-marker-pin',
        html: `
          <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid white; cursor: pointer;">
            ★
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([res.latitude, res.longitude], { icon: resIcon });

      marker.on('click', () => {
        setSelectedResource(res);
      });

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 2px;">
          <div style="font-weight: 700; color: ${color}; margin-bottom: 2px;">${res.id} • ${res.status}</div>
          <div style="font-weight: 600; color: #1e293b; margin-bottom: 2px;">${res.name}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">${res.address}</div>
          <div style="color: #475569; font-size: 10px;">Capacity: ${res.capacity}</div>
        </div>
      `);

      resourceLayerRef.current?.addLayer(marker);
    });
  }, [incidents, resources, priorityFilter, resourceTypeFilter]);

  // -------------------------------------------------------------
  // FREE LOCATION SEARCH (OpenStreetMap Nominatim)
  // -------------------------------------------------------------
  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;

    setIsSearchingLocation(true);
    setSearchError(null);
    setShowSearchResults(true);

    try {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('No matching locations found. Try a street name or district.');
      }
    } catch {
      setSearchError('Search service temporarily unavailable. Please try again.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSelectSearchResult = (loc: GeocodeResult) => {
    setShowSearchResults(false);
    setSearchQuery(loc.displayName);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([loc.lat, loc.lng], 15, { duration: 1.2 });

      if (searchMarkerLayerRef.current) {
        searchMarkerLayerRef.current.clearLayers();

        const searchPin = L.divIcon({
          className: 'search-result-pin',
          html: `
            <div style="background-color: #7c3aed; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; box-shadow: 0 2px 8px rgba(124,58,237,0.4); border: 2px solid white;">
              📍
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: searchPin });
        marker.bindPopup(`<strong>Searched Location</strong><br/>${loc.displayName}`).openPopup();
        searchMarkerLayerRef.current.addLayer(marker);
      }
    }
  };

  // -------------------------------------------------------------
  // FREE ROUTING (Public OSRM Demo Service)
  // -------------------------------------------------------------
  const calculateRoute = async (originType: 'USER_GPS' | 'RESOURCE') => {
    if (!selectedIncident || !selectedIncident.location.latitude || !selectedIncident.location.longitude) {
      setRouteError('Please select a verified incident with GPS coordinates on the map.');
      return;
    }

    let startLat = 0;
    let startLng = 0;
    let startName = '';

    if (originType === 'USER_GPS') {
      if (!userLocation) {
        setRouteError('Please start location tracking to use your current device coordinates.');
        return;
      }
      startLat = userLocation.latitude;
      startLng = userLocation.longitude;
      startName = 'My Device Location';
    } else {
      if (!selectedResource) {
        // Pick nearest or first available resource
        const avail = resources.find((r) => r.status === 'AVAILABLE') || resources[0];
        if (!avail) {
          setRouteError('No registered fleet resources available for routing.');
          return;
        }
        startLat = avail.latitude;
        startLng = avail.longitude;
        startName = avail.name;
      } else {
        startLat = selectedResource.latitude;
        startLng = selectedResource.longitude;
        startName = selectedResource.name;
      }
    }

    setIsCalculatingRoute(true);
    setRouteError(null);
    setRouteOrigin(originType);

    try {
      const result = await fetchOsrmRoute(
        startLat,
        startLng,
        selectedIncident.location.latitude,
        selectedIncident.location.longitude
      );

      setOsrmRoute(result);

      if (mapInstanceRef.current && result.polyline.length > 0) {
        if (routePolylineRef.current) {
          mapInstanceRef.current.removeLayer(routePolylineRef.current);
        }

        const poly = L.polyline(result.polyline, {
          color: '#2563eb',
          weight: 4,
          opacity: 0.85,
          dashArray: result.status === 'SUCCESS' ? undefined : '6, 6'
        }).addTo(mapInstanceRef.current);

        routePolylineRef.current = poly;
        mapInstanceRef.current.fitBounds(poly.getBounds(), { padding: [50, 50] });
      }
    } catch (err: any) {
      setRouteError('Failed to calculate route preview.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      if (userLocation) {
        mapInstanceRef.current.flyTo([userLocation.latitude, userLocation.longitude], 14);
      } else {
        mapInstanceRef.current.flyTo([37.7785, -122.4115], 13);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Interactive Operations Map</h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              OpenStreetMap & Leaflet
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Free interactive mapping, browser GPS tracking, and public road route previews without paid API keys.
          </p>
        </div>

        {/* Live Tracking Toggle Button */}
        <div className="flex items-center gap-2">
          {isTracking ? (
            <button
              type="button"
              onClick={stopTracking}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-xs transition"
            >
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              <span>Stop Tracking</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startTracking}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
            >
              <Navigation className="w-4 h-4" />
              <span>Start Live Tracking</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Map Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Tracking Telemetry Banner */}
      {isTracking && userLocation && (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 text-emerald-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">Live GPS Active:</span>
            <span className="font-mono font-medium">
              Lat: {userLocation.latitude.toFixed(5)}, Lng: {userLocation.longitude.toFixed(5)}
            </span>
            {userLocation.accuracy && (
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                Accuracy: ±{userLocation.accuracy}m
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-emerald-700">
            <span>
              Updated: {userLocation.lastUpdated ? userLocation.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Now'}
            </span>
            <button
              type="button"
              onClick={handleRecenter}
              className="font-semibold text-emerald-800 underline hover:no-underline"
            >
              Center on me
            </button>
          </div>
        </div>
      )}

      {/* Tracking / Geolocation Error Message */}
      {trackingError && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{trackingError}</span>
          </div>
          <button
            type="button"
            onClick={() => setTrackingError(null)}
            className="text-rose-600 hover:text-rose-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Map Card Container */}
      <div className="relative h-[620px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-50">
        {/* Map Canvas */}
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Top Control Overlay: Location Search Bar & Quick Filters */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-start justify-between gap-3 pointer-events-none">
          {/* Free Location Search Field (OpenStreetMap Nominatim) */}
          <div className="relative w-full sm:w-80 pointer-events-auto" ref={searchContainerRef}>
            <form onSubmit={handleLocationSearch} className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search street, district, or landmark..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white/95 backdrop-blur-md border border-slate-300 rounded-lg shadow-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                    if (searchMarkerLayerRef.current) {
                      searchMarkerLayerRef.current.clearLayers();
                    }
                  }}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Nominatim Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden text-xs max-h-60 overflow-y-auto">
                {isSearchingLocation ? (
                  <div className="p-4 text-center text-slate-500">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600 mx-auto mb-1" />
                    Searching OpenStreetMap...
                  </div>
                ) : searchError ? (
                  <div className="p-3 text-center text-slate-500 text-xs">
                    {searchError}
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(result)}
                      className="w-full text-left p-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-none flex items-start gap-2 text-slate-700 transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <span className="truncate">{result.displayName}</span>
                    </button>
                  ))
                ) : null}
              </div>
            )}
          </div>

          {/* Map Quick Controls */}
          <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-lg border border-slate-300 shadow-md flex items-center gap-2 pointer-events-auto text-xs">
            {/* Priority Filter */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px] font-medium pl-1">Incidents:</span>
              {['ALL', 'CRITICAL', 'HIGH'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition ${
                    priorityFilter === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <span className="text-slate-200">|</span>

            <button
              type="button"
              onClick={handleRecenter}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
              title="Recenter"
            >
              <Crosshair className="w-3.5 h-3.5 text-blue-600" />
              <span>Center</span>
            </button>
          </div>
        </div>

        {/* Bottom Floating Card: Selected Incident & OSRM Route Preview */}
        {selectedIncident && (
          <div className="absolute bottom-6 left-6 max-w-sm sm:max-w-md w-full bg-white/95 backdrop-blur-md rounded-xl p-4 border border-slate-200 shadow-xl z-[1000] text-xs space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-blue-600">{selectedIncident.id}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    selectedIncident.priority === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : selectedIncident.priority === 'HIGH'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {selectedIncident.priority}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedIncident(null);
                  if (routePolylineRef.current && mapInstanceRef.current) {
                    mapInstanceRef.current.removeLayer(routePolylineRef.current);
                    routePolylineRef.current = null;
                  }
                  setOsrmRoute(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="font-semibold text-slate-900 text-sm line-clamp-1">{selectedIncident.title}</p>
              <p className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{selectedIncident.location.address}</span>
              </p>
            </div>

            {/* OSRM Route Action Buttons */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-[11px] font-medium">Free Route Preview:</span>
              <button
                type="button"
                disabled={isCalculatingRoute || !userLocation}
                onClick={() => calculateRoute('USER_GPS')}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-semibold text-xs flex items-center gap-1 transition disabled:opacity-40"
                title={userLocation ? 'Preview route from your current device location' : 'Start tracking above to route from your GPS'}
              >
                <Navigation className="w-3 h-3" />
                <span>From My Device</span>
              </button>
              <button
                type="button"
                disabled={isCalculatingRoute}
                onClick={() => calculateRoute('RESOURCE')}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-xs flex items-center gap-1 transition"
                title="Preview route from closest emergency response base"
              >
                <Truck className="w-3 h-3" />
                <span>From Nearest Fleet Base</span>
              </button>
            </div>

            {/* OSRM Route Telemetry Result */}
            {isCalculatingRoute ? (
              <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Requesting route from public OSRM service...</span>
              </div>
            ) : osrmRoute ? (
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between font-medium">
                  <span>Driving Distance: <strong className="text-blue-600">{osrmRoute.distanceKm} km</strong></span>
                  <span>Est. Time: <strong className="text-emerald-600">~{osrmRoute.durationMinutes} mins</strong></span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Via {osrmRoute.summary || 'OSRM Road Network'} • Preview only, does not reflect live traffic or siren priority.
                </p>
              </div>
            ) : routeError ? (
              <p className="text-[11px] text-rose-600">{routeError}</p>
            ) : null}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedIncident.location.latitude?.toFixed(4)}, {selectedIncident.location.longitude?.toFixed(4)}
              </span>
              <button
                type="button"
                onClick={() => navigate(`/incidents/${selectedIncident.id}`)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1"
              >
                <span>Open Incident Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom Right Legend */}
        <div className="absolute bottom-6 right-16 z-[1000] hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-md text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Critical
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span> High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600"></span> Available Unit
          </span>
          {isTracking && (
            <span className="flex items-center gap-1.5 font-medium text-blue-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span> My Location
            </span>
          )}
        </div>
      </div>

      {/* Transparent Disclaimer Card (Anti-AI Slop & Real Telematics Notice) */}
      <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">
            About Live Location & Vehicle Tracking in AEGISAI GRID
          </p>
          <p>
            • <strong>Browser GPS</strong> provides the real-time position of your current device only after granting permission. It does not automatically track field emergency vehicles.
          </p>
          <p>
            • <strong>Fleet Unit Coordinates</strong> reflect registered staging stations and bases. Live vehicle telemetry requires dedicated vehicle hardware transponders.
          </p>
          <p>
            • <strong>Maps & Routing</strong> are provided completely free by OpenStreetMap and the public OSRM service without paid Google Maps APIs.
          </p>
        </div>
      </div>
    </div>
  );
};
