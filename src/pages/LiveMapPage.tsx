import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { Incident, Resource, EmergencyFacility, SpecializedAgentId, FacilityType } from '../types';
import { searchLocations, fetchOsrmRoute, GeocodeResult, OsrmRouteResult } from '../services/mapService';
import { locationService } from '../services/locationService';
import { useNotifications } from '../context/NotificationContext';
import L from 'leaflet';
import {
  MapPin,
  RefreshCw,
  Navigation,
  ChevronRight,
  ChevronLeft,
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
  Info,
  Maximize2,
  Minimize2,
  Zap,
  Droplets,
  HeartPulse,
  Building2,
  Phone,
  Eye,
  Filter,
  ArrowRight,
  Activity,
  SlidersHorizontal,
  Check
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ActiveAgentFilter = 'ALL' | SpecializedAgentId;

interface SelectedMapItem {
  type: 'INCIDENT' | 'FACILITY' | 'RESOURCE';
  incident?: Incident;
  facility?: EmergencyFacility;
  resource?: Resource;
}

export const LiveMapPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedIncidentId = searchParams.get('incidentId');
  const agentParam = searchParams.get('agent') as SpecializedAgentId | null;
  const initialAgent: ActiveAgentFilter =
    agentParam && ['POLICE_TACTICAL', 'HOSPITAL_EMS', 'WATER_HYDRO', 'CURRENT_KEB'].includes(agentParam)
      ? agentParam
      : 'ALL';
  const { isConnected: isWsConnected, latestEvent } = useNotifications();

  // Core Data States
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [facilities, setFacilities] = useState<EmergencyFacility[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDataSync, setLastDataSync] = useState<Date>(new Date());

  // Selected item inspector
  const [selectedItem, setSelectedItem] = useState<SelectedMapItem | null>(null);

  // Filters & Agent Focus
  const [selectedAgent, setSelectedAgent] = useState<ActiveAgentFilter>(initialAgent);
  const [showFacilitiesLayer, setShowFacilitiesLayer] = useState(true);
  const [showIncidentsLayer, setShowIncidentsLayer] = useState(true);
  const [showResourcesLayer, setShowResourcesLayer] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // UI Panels
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'FACILITIES' | 'FLEET'>('INCIDENTS');

  // Real User Geolocation Tracking State
  const [isTracking, setIsTracking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    lastUpdated?: Date;
  } | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    facilities: EmergencyFacility[];
    incidents: Incident[];
    places: GeocodeResult[];
  }>({ facilities: [], incidents: [], places: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<any>(null);

  // Directions & Routing State
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [osrmRoute, setOsrmRoute] = useState<OsrmRouteResult | null>(null);
  const [routeOriginType, setRouteOriginType] = useState<'USER_GPS' | 'FLEET' | 'CUSTOM'>('FLEET');
  const [routeOriginName, setRouteOriginName] = useState<string>('');
  const [routeError, setRouteError] = useState<string | null>(null);

  // Map DOM & Leaflet References
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const facilitiesLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null);
  const resourcesLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const searchMarkerLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Agent Metadata Definitions
  const agentProfiles: Record<
    SpecializedAgentId,
    {
      name: string;
      code: string;
      color: string;
      bgClass: string;
      borderClass: string;
      textClass: string;
      icon: any;
      description: string;
      focusSummary: string;
    }
  > = {
    POLICE_TACTICAL: {
      name: 'Rakshak AI (Police)',
      code: 'RAKSHAK-01',
      color: '#3b82f6',
      bgClass: 'bg-blue-950/60',
      borderClass: 'border-blue-500/40',
      textClass: 'text-blue-400',
      icon: Shield,
      description: 'Coordinates perimeter security, road closures, and police station tactical assets.',
      focusSummary: 'Active Filter: Police Stations, Patrol Units & Security/Traffic Incidents'
    },
    HOSPITAL_EMS: {
      name: 'Jeevan AI (Hospital & EMS)',
      code: 'JEEVAN-02',
      color: '#ef4444',
      bgClass: 'bg-rose-950/60',
      borderClass: 'border-rose-500/40',
      textClass: 'text-rose-400',
      icon: HeartPulse,
      description: 'Monitors regional hospital capacity, trauma receiving, and ambulance emergency routing.',
      focusSummary: 'Active Filter: Hospitals, Trauma Centers, Ambulances & Medical Emergencies'
    },
    WATER_HYDRO: {
      name: 'JalRakshak AI (Water & Hydro)',
      code: 'JALRAKSHAK-03',
      color: '#06b6d4',
      bgClass: 'bg-cyan-950/60',
      borderClass: 'border-cyan-500/40',
      textClass: 'text-cyan-400',
      icon: Droplets,
      description: 'Supervises municipal water treatment facilities, surge pumps, and water main disruptions.',
      focusSummary: 'Active Filter: Water Treatment, Surge Pumps, Flood & Pipeline Leak Incidents'
    },
    CURRENT_KEB: {
      name: 'Shakti AI (Power Grid)',
      code: 'SHAKTI-04',
      color: '#f59e0b',
      bgClass: 'bg-amber-950/60',
      borderClass: 'border-amber-500/40',
      textClass: 'text-amber-400',
      icon: Zap,
      description: 'Oversees high-voltage electrical substations, grid switching, and reported power outages.',
      focusSummary: 'Active Filter: Substations, BESS Storage, Downed Powerlines & Outage Reports'
    }
  };

  // Helper to categorize incidents by agent domain
  const getIncidentAgentDomain = useCallback((inc: Incident): SpecializedAgentId => {
    const text = `${inc.title} ${inc.description}`.toLowerCase();
    if (inc.category === 'MEDICAL_EMERGENCY' || inc.casualtiesCount > 0 || text.includes('medic') || text.includes('casualt') || text.includes('trauma')) {
      return 'HOSPITAL_EMS';
    }
    if (inc.category === 'FLOOD' || text.includes('water') || text.includes('pipe') || text.includes('leak') || text.includes('flood') || text.includes('hydro') || text.includes('sewage')) {
      return 'WATER_HYDRO';
    }
    if (inc.category === 'FIRE_INCIDENT' || text.includes('power') || text.includes('electric') || text.includes('outage') || text.includes('blackout') || text.includes('transformer') || text.includes('wire') || text.includes('keb') || text.includes('grid')) {
      return 'CURRENT_KEB';
    }
    return 'POLICE_TACTICAL';
  }, []);

  // Check if incident is water or electrical incident
  const isWaterIncident = useCallback((inc: Incident) => {
    const text = `${inc.title} ${inc.description}`.toLowerCase();
    return inc.category === 'FLOOD' || text.includes('water') || text.includes('pipe') || text.includes('leak') || text.includes('flood') || text.includes('hydro');
  }, []);

  const isPowerIncident = useCallback((inc: Incident) => {
    const text = `${inc.title} ${inc.description}`.toLowerCase();
    return inc.category === 'FIRE_INCIDENT' || text.includes('power') || text.includes('electric') || text.includes('outage') || text.includes('blackout') || text.includes('transformer') || text.includes('wire') || text.includes('keb');
  }, []);

  // Load Real Database Data (Incidents, Facilities, Fleet)
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [incRes, facRes, resRes] = await Promise.all([
        api.getIncidents({ limit: 100 }),
        api.getFacilities(),
        api.getResources()
      ]);

      const fetchedIncidents = incRes.incidents || [];
      const fetchedFacilities = facRes || [];
      const fetchedResources = resRes || [];

      setIncidents(fetchedIncidents);
      setFacilities(fetchedFacilities);
      setResources(fetchedResources);
      setLastDataSync(new Date());

      // If URL preselected an incident, focus on it
      if (preselectedIncidentId) {
        const found = fetchedIncidents.find((i) => i.id === preselectedIncidentId);
        if (found) {
          setSelectedItem({ type: 'INCIDENT', incident: found });
          if (found.location.latitude && found.location.longitude && mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([found.location.latitude, found.location.longitude], 15, { duration: 1 });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load emergency grid map data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [preselectedIncidentId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh when WebSocket broadcast arrives
  useEffect(() => {
    if (!latestEvent) return;
    if (
      latestEvent.type === 'INCIDENT_CREATED' ||
      latestEvent.type === 'INCIDENT_UPDATED' ||
      latestEvent.type === 'WORKFLOW_COMPLETED' ||
      latestEvent.type === 'DATA_RESET' ||
      latestEvent.type === 'ASSIGNMENT_UPDATED'
    ) {
      loadData();
    }
  }, [latestEvent, loadData]);

  // Periodic heartbeat polling fallback (every 15s)
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Initialize Leaflet Map Instance with OpenStreetMap Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [37.7785, -122.4115], // Central Operations Sector
        zoom: 13,
        zoomControl: false,
        attributionControl: true
      });

      // Zoom control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Standard OpenStreetMap Tile Layer
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
      facilitiesLayerRef.current = L.layerGroup().addTo(map);
      incidentsLayerRef.current = L.layerGroup().addTo(map);
      resourcesLayerRef.current = L.layerGroup().addTo(map);
      userLocationLayerRef.current = L.layerGroup().addTo(map);
      searchMarkerLayerRef.current = L.layerGroup().addTo(map);

      // Fix container size
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Invalidate map size when sidebar is toggled
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

  // Handle outside click for search popover
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
  // REAL BROWSER GEOLOCATION TRACKING
  // -------------------------------------------------------------
  const startTracking = () => {
    setTrackingError(null);
    setIsLocating(true);

    if (!('geolocation' in navigator)) {
      setTrackingError('Browser geolocation is not supported on this device.');
      setIsLocating(false);
      return;
    }

    const successHandler = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      const updatedLoc = {
        latitude: Number(latitude.toFixed(5)),
        longitude: Number(longitude.toFixed(5)),
        accuracy: Math.round(accuracy),
        lastUpdated: new Date()
      };
      setUserLocation(updatedLoc);
      setIsTracking(true);
      setIsLocating(false);

      // Save to shared locationService so all agents have access immediately
      locationService.reverseGeocode(latitude, longitude).then((addrStr) => {
        locationService.setConfirmedLocation({
          coordinates: {
            latitude: Number(latitude.toFixed(5)),
            longitude: Number(longitude.toFixed(5)),
            accuracy: Math.round(accuracy)
          },
          address: addrStr,
          timestamp: Date.now(),
          verified: true,
          source: 'GPS_LIVE'
        });
      }).catch(() => {
        locationService.setConfirmedLocation({
          coordinates: {
            latitude: Number(latitude.toFixed(5)),
            longitude: Number(longitude.toFixed(5)),
            accuracy: Math.round(accuracy)
          },
          address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          timestamp: Date.now(),
          verified: true,
          source: 'GPS_LIVE'
        });
      });

      // Smoothly pan and center map on user on first lock
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1.2 });
      }
    };

    const errorHandler = (error: GeolocationPositionError) => {
      setIsLocating(false);
      setIsTracking(false);
      let msg = 'Could not determine your device location.';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          msg = 'Location permission was denied. Please allow location permissions in your browser URL bar.';
          break;
        case error.POSITION_UNAVAILABLE:
          msg = 'Device GPS / location information is currently unavailable.';
          break;
        case error.TIMEOUT:
          msg = 'Device location request timed out. Retrying...';
          break;
      }
      setTrackingError(msg);
    };

    try {
      // First try single high accuracy query
      navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      // Then subscribe to live updates
      const id = navigator.geolocation.watchPosition(successHandler, errorHandler, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000
      });
      watchIdRef.current = id;
    } catch {
      setTrackingError('Failed to initialize geolocation tracking service.');
      setIsLocating(false);
      setIsTracking(false);
    }
  };

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setIsLocating(false);
    if (userLocationLayerRef.current) {
      userLocationLayerRef.current.clearLayers();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Render User Location Pin & Accuracy Circle
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocationLayerRef.current) return;
    userLocationLayerRef.current.clearLayers();

    if (userLocation && isTracking) {
      const { latitude, longitude, accuracy } = userLocation;

      // Accuracy radius circle
      if (accuracy && accuracy > 0) {
        const circle = L.circle([latitude, longitude], {
          radius: Math.min(accuracy, 1000), // Cap at 1km for visualization
          color: '#3b82f6',
          fillColor: '#60a5fa',
          fillOpacity: 0.15,
          weight: 1.5,
          dashArray: '4, 4'
        });
        userLocationLayerRef.current.addLayer(circle);
      }

      // Radar pulse user location icon
      const userIcon = L.divIcon({
        className: 'user-live-pin',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 32px; height: 32px; background: rgba(59, 130, 246, 0.4); border-radius: 50%; animation: radar-pulse 2s infinite;"></div>
            <div style="position: relative; width: 16px; height: 16px; background: #2563eb; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 12px rgba(37, 99, 235, 0.8);"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([latitude, longitude], { icon: userIcon });
      marker.bindTooltip(
        `<strong>My Device Location</strong><br/>Lat: ${latitude}, Lng: ${longitude}<br/>Accuracy: ±${accuracy || 0}m`,
        { direction: 'top', offset: [0, -16] }
      );
      userLocationLayerRef.current.addLayer(marker);
    }
  }, [userLocation, isTracking]);

  // -------------------------------------------------------------
  // MAP MARKERS RENDERING (FACILITIES, INCIDENTS, FLEET)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const facLayer = facilitiesLayerRef.current;
    const incLayer = incidentsLayerRef.current;
    const resLayer = resourcesLayerRef.current;

    if (facLayer) facLayer.clearLayers();
    if (incLayer) incLayer.clearLayers();
    if (resLayer) resLayer.clearLayers();

    // 1. VERIFIED FACILITIES (Police Stations, Hospitals, Water Plants, Substations)
    if (showFacilitiesLayer && facLayer) {
      const filteredFacilities = facilities.filter((fac) => {
        if (selectedAgent !== 'ALL' && fac.agentDomain !== selectedAgent) return false;
        return true;
      });

      filteredFacilities.forEach((fac) => {
        let iconHtml = '';
        let badgeColor = '#3b82f6';
        let typeLabel = 'Emergency Facility';

        if (fac.type === 'POLICE_STATION') {
          badgeColor = '#2563eb';
          typeLabel = 'Police Station';
          iconHtml = `
            <div style="background: #1e3a8a; border: 2.5px solid #60a5fa; border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(30, 58, 138, 0.6); color: white; cursor: pointer;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
          `;
        } else if (fac.type === 'HOSPITAL') {
          badgeColor = '#dc2626';
          typeLabel = 'Hospital & Trauma Center';
          iconHtml = `
            <div style="background: #991b1b; border: 2.5px solid #f87171; border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(153, 27, 27, 0.6); color: white; cursor: pointer;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
            </div>
          `;
        } else if (fac.type === 'WATER_FACILITY') {
          badgeColor = '#0284c7';
          typeLabel = 'Water Infrastructure';
          iconHtml = `
            <div style="background: #0369a1; border: 2.5px solid #38bdf8; border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(3, 105, 161, 0.6); color: white; cursor: pointer;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
            </div>
          `;
        } else if (fac.type === 'POWER_SUBSTATION') {
          badgeColor = '#d97706';
          typeLabel = 'Power Grid Substation';
          iconHtml = `
            <div style="background: #b45309; border: 2.5px solid #fbbf24; border-radius: 8px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(180, 83, 9, 0.6); color: white; cursor: pointer;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
          `;
        }

        const customIcon = L.divIcon({
          className: 'facility-marker',
          html: iconHtml,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -18]
        });

        const marker = L.marker([fac.latitude, fac.longitude], { icon: customIcon });

        marker.on('click', () => {
          setSelectedItem({ type: 'FACILITY', facility: fac });
          setOsrmRoute(null);
          setRouteError(null);
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 210px; color: #f8fafc;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 6px;">
              <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; letter-spacing: 0.5px;">
                VERIFIED FACILITY
              </span>
              <span style="color: ${badgeColor}; font-weight: 600; font-size: 11px;">${fac.operationalStatus}</span>
            </div>
            <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-bottom: 3px;">${fac.name}</div>
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 6px;">${fac.address}</div>
            <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; font-size: 11px; color: #cbd5e1;">
              ${fac.details}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #94a3b8; border-top: 1px solid #334155; padding-top: 6px;">
              <span>📞 ${fac.contactPhone}</span>
              <span style="font-mono; font-size: 10px;">${fac.id}</span>
            </div>
          </div>
        `);

        facLayer.addLayer(marker);
      });
    }

    // 2. EMERGENCY INCIDENTS (Water disruptions, Power outages, Police, Medical)
    if (showIncidentsLayer && incLayer) {
      const filteredIncidents = incidents.filter((inc) => {
        if (!inc.location.verified || inc.location.latitude === null || inc.location.longitude === null) {
          return false;
        }
        if (priorityFilter !== 'ALL' && inc.priority !== priorityFilter) {
          return false;
        }
        if (selectedAgent !== 'ALL') {
          const domain = getIncidentAgentDomain(inc);
          if (domain !== selectedAgent) return false;
        }
        return true;
      });

      filteredIncidents.forEach((inc) => {
        const isCritical = inc.priority === 'CRITICAL';
        const isHigh = inc.priority === 'HIGH';
        const isWater = isWaterIncident(inc);
        const isPower = isPowerIncident(inc);

        let markerColor = isCritical ? '#ef4444' : isHigh ? '#f97316' : '#3b82f6';
        let borderGlow = isCritical ? 'rgba(239, 68, 68, 0.7)' : 'rgba(249, 115, 22, 0.5)';
        let symbol = '!';

        if (isWater) {
          markerColor = '#06b6d4';
          borderGlow = 'rgba(6, 182, 212, 0.6)';
          symbol = '💧';
        } else if (isPower) {
          markerColor = '#f59e0b';
          borderGlow = 'rgba(245, 158, 11, 0.6)';
          symbol = '⚡';
        }

        const customIcon = L.divIcon({
          className: 'incident-marker-pin',
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              ${
                isCritical
                  ? `<div style="position: absolute; width: 32px; height: 32px; background: ${markerColor}; opacity: 0.35; border-radius: 50%; animation: radar-pulse 1.8s infinite;"></div>`
                  : ''
              }
              <div style="background-color: ${markerColor}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 13px; box-shadow: 0 4px 10px ${borderGlow}; border: 2.5px solid white;">
                ${symbol}
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        const marker = L.marker([inc.location.latitude!, inc.location.longitude!], { icon: customIcon });

        marker.on('click', () => {
          setSelectedItem({ type: 'INCIDENT', incident: inc });
          setOsrmRoute(null);
          setRouteError(null);
        });

        const categoryTag = isWater ? 'WATER SUPPLY INCIDENT' : isPower ? 'ELECTRICAL OUTAGE REPORT' : inc.category;

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 220px; color: #f8fafc;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px;">
                USER INCIDENT REPORT
              </span>
              <span style="font-weight: 700; color: ${markerColor};">${inc.priority}</span>
            </div>
            <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-bottom: 3px;">${inc.title}</div>
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 6px;">${inc.location.address}</div>
            <div style="display: flex; gap: 8px; font-size: 10px; color: #cbd5e1; margin-bottom: 8px;">
              <span>Status: <strong style="color: #38bdf8;">${inc.status}</strong></span>
              <span>Casualties: <strong>${inc.casualtiesCount}</strong></span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #334155; padding-top: 6px;">
              <span style="color: #64748b; font-size: 10px;">${inc.id}</span>
              <a href="#/incidents/${inc.id}" style="color: #38bdf8; font-weight: 600; text-decoration: underline; font-size: 11px;">
                Full Dossier &rarr;
              </a>
            </div>
          </div>
        `);

        incLayer.addLayer(marker);
      });
    }

    // 3. REGISTERED RESPONSE FLEET UNITS
    if (showResourcesLayer && resLayer) {
      const filteredResources = resources.filter((res) => {
        if (typeof res.latitude !== 'number' || typeof res.longitude !== 'number') return false;
        if (selectedAgent === 'POLICE_TACTICAL' && res.type !== 'POLICE_PATROL') return false;
        if (selectedAgent === 'HOSPITAL_EMS' && res.type !== 'AMBULANCE') return false;
        if (selectedAgent === 'WATER_HYDRO' && res.type !== 'GENERAL_SUPPORT' && !res.name.toLowerCase().includes('water')) return false;
        if (selectedAgent === 'CURRENT_KEB' && res.type !== 'FIRE_UNIT' && !res.name.toLowerCase().includes('grid')) return false;
        return true;
      });

      filteredResources.forEach((res) => {
        const isAvailable = res.status === 'AVAILABLE';
        const color = isAvailable ? '#10b981' : '#64748b';

        const resIcon = L.divIcon({
          className: 'fleet-marker-pin',
          html: `
            <div style="background-color: ${color}; width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); border: 2px solid white; cursor: pointer;">
              🚚
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          popupAnchor: [0, -14]
        });

        const marker = L.marker([res.latitude, res.longitude], { icon: resIcon });

        marker.on('click', () => {
          setSelectedItem({ type: 'RESOURCE', resource: res });
          setOsrmRoute(null);
          setRouteError(null);
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 200px; color: #f8fafc;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px;">
                FLEET STAGING BASE
              </span>
              <span style="color: ${color}; font-weight: 600; font-size: 11px;">${res.status}</span>
            </div>
            <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-bottom: 3px;">${res.name}</div>
            <div style="color: #94a3b8; font-size: 11px; margin-bottom: 4px;">${res.address}</div>
            <div style="color: #cbd5e1; font-size: 10px;">Capacity: ${res.capacity}</div>
          </div>
        `);

        resLayer.addLayer(marker);
      });
    }
  }, [
    incidents,
    facilities,
    resources,
    selectedAgent,
    showFacilitiesLayer,
    showIncidentsLayer,
    showResourcesLayer,
    priorityFilter,
    getIncidentAgentDomain,
    isWaterIncident,
    isPowerIncident
  ]);

  // -------------------------------------------------------------
  // SMART UNIFIED SEARCH (FACILITIES + INCIDENTS + NOMINATIM)
  // -------------------------------------------------------------
  const executeSearch = async (term: string) => {
    const q = term.trim().toLowerCase();
    if (!q || q.length < 2) {
      setSearchResults({ facilities: [], incidents: [], places: [] });
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setSearchNotice(null);
    setShowSearchResults(true);

    // 1. Search local verified facilities
    const matchedFacilities = facilities.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.address.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q) ||
        f.details.toLowerCase().includes(q) ||
        (q.includes('hospital') && f.type === 'HOSPITAL') ||
        (q.includes('police') && f.type === 'POLICE_STATION') ||
        (q.includes('water') && f.type === 'WATER_FACILITY') ||
        (q.includes('power') && f.type === 'POWER_SUBSTATION')
    );

    // 2. Search local incidents
    const matchedIncidents = incidents.filter(
      (i) =>
        i.id.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.address.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );

    // 3. Search public OpenStreetMap Nominatim for street addresses
    let matchedPlaces: GeocodeResult[] = [];
    try {
      matchedPlaces = await searchLocations(q);
    } catch {
      // ignore
    }

    setSearchResults({
      facilities: matchedFacilities,
      incidents: matchedIncidents,
      places: matchedPlaces
    });

    if (matchedFacilities.length === 0 && matchedIncidents.length === 0 && matchedPlaces.length === 0) {
      setSearchNotice('No matching facilities, incidents, or map addresses found.');
    }

    setIsSearching(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (val.trim().length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        executeSearch(val);
      }, 400);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    executeSearch(searchQuery);
  };

  const selectSearchResult = (item: {
    lat: number;
    lng: number;
    title: string;
    type: 'FACILITY' | 'INCIDENT' | 'PLACE';
    facility?: EmergencyFacility;
    incident?: Incident;
  }) => {
    setShowSearchResults(false);
    setSearchQuery(item.title);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([item.lat, item.lng], 16, { duration: 1.2 });

      if (item.type === 'FACILITY' && item.facility) {
        setSelectedItem({ type: 'FACILITY', facility: item.facility });
      } else if (item.type === 'INCIDENT' && item.incident) {
        setSelectedItem({ type: 'INCIDENT', incident: item.incident });
      } else if (item.type === 'PLACE') {
        if (searchMarkerLayerRef.current) {
          searchMarkerLayerRef.current.clearLayers();
          const pin = L.divIcon({
            className: 'search-pin',
            html: `
              <div style="background-color: #8b5cf6; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; box-shadow: 0 4px 12px rgba(139,92,246,0.6); border: 2.5px solid white;">
                📍
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          const marker = L.marker([item.lat, item.lng], { icon: pin });
          marker.bindPopup(`<strong>Searched Address</strong><br/>${item.title}`).openPopup();
          searchMarkerLayerRef.current.addLayer(marker);
        }
      }
    }
  };

  // -------------------------------------------------------------
  // OSRM DRIVING DIRECTIONS & ROUTE CALCULATOR
  // -------------------------------------------------------------
  const calculateRoute = async (originChoice: 'USER_GPS' | 'FLEET') => {
    setRouteError(null);

    // Determine Destination Coordinates
    let destLat: number | null = null;
    let destLng: number | null = null;
    let destName = '';

    if (selectedItem?.type === 'INCIDENT' && selectedItem.incident) {
      destLat = selectedItem.incident.location.latitude;
      destLng = selectedItem.incident.location.longitude;
      destName = selectedItem.incident.title;
    } else if (selectedItem?.type === 'FACILITY' && selectedItem.facility) {
      destLat = selectedItem.facility.latitude;
      destLng = selectedItem.facility.longitude;
      destName = selectedItem.facility.name;
    }

    if (!destLat || !destLng) {
      setRouteError('Please select a verified facility or incident marker on the map as destination.');
      return;
    }

    let startLat = 0;
    let startLng = 0;
    let startName = '';

    if (originChoice === 'USER_GPS') {
      if (!userLocation) {
        setRouteError('Device GPS coordinates are not active. Click "Locate Me" above first.');
        return;
      }
      startLat = userLocation.latitude;
      startLng = userLocation.longitude;
      startName = 'My Device Location (Browser GPS)';
    } else {
      // Pick nearest or first available fleet base
      const avail = resources.find((r) => r.status === 'AVAILABLE') || resources[0];
      if (!avail) {
        setRouteError('No registered fleet vehicles or stations available for routing.');
        return;
      }
      startLat = avail.latitude;
      startLng = avail.longitude;
      startName = avail.name;
    }

    setIsCalculatingRoute(true);
    setRouteOriginType(originChoice);
    setRouteOriginName(startName);

    try {
      const result = await fetchOsrmRoute(startLat, startLng, destLat, destLng);
      setOsrmRoute(result);

      if (mapInstanceRef.current && result.polyline.length > 0) {
        if (routePolylineRef.current) {
          mapInstanceRef.current.removeLayer(routePolylineRef.current);
        }

        const poly = L.polyline(result.polyline, {
          color: '#38bdf8',
          weight: 5,
          opacity: 0.9,
          dashArray: result.status === 'SUCCESS' ? undefined : '8, 8'
        }).addTo(mapInstanceRef.current);

        routePolylineRef.current = poly;
        mapInstanceRef.current.fitBounds(poly.getBounds(), { padding: [60, 60] });
      }
    } catch {
      setRouteError('Failed to calculate road route preview from routing provider.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const clearCurrentRoute = () => {
    if (routePolylineRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    setOsrmRoute(null);
    setRouteError(null);
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      if (userLocation) {
        mapInstanceRef.current.flyTo([userLocation.latitude, userLocation.longitude], 15);
      } else {
        mapInstanceRef.current.flyTo([37.7785, -122.4115], 13);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!mapWrapperRef.current) return;
    if (!document.fullscreenElement) {
      mapWrapperRef.current.requestFullscreen?.().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(console.error);
      setIsFullscreen(false);
    }
  };

  // Compute stats for current view
  const gridMetrics = useMemo(() => {
    const verifiedIncidents = incidents.filter((i) => i.location.verified && i.location.latitude !== null);
    const criticalCount = verifiedIncidents.filter((i) => i.priority === 'CRITICAL').length;
    const highCount = verifiedIncidents.filter((i) => i.priority === 'HIGH').length;
    const waterCount = verifiedIncidents.filter(isWaterIncident).length;
    const powerCount = verifiedIncidents.filter(isPowerIncident).length;

    return {
      totalIncidents: verifiedIncidents.length,
      totalFacilities: facilities.length,
      totalFleet: resources.length,
      criticalCount,
      highCount,
      waterCount,
      powerCount
    };
  }, [incidents, facilities, resources, isWaterIncident, isPowerIncident]);

  return (
    <div
      ref={mapWrapperRef}
      className={`flex flex-col h-[calc(100vh-5rem)] w-full overflow-hidden bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-2xl relative ${
        isFullscreen ? 'h-screen rounded-none border-none' : ''
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* TOP COMMAND CONTROL HEADER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/95 backdrop-blur-md px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-30 shrink-0">
        {/* Left: Branding & Status Badge */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title={isSidebarOpen ? 'Collapse Tactical Sidebar' : 'Expand Tactical Sidebar'}
          >
            {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-wider text-slate-200 uppercase">
              AEGISAI GRID LIVE MAP
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 border ${
                isWsConnected
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{isWsConnected ? 'LIVE GATEWAY ACTIVE' : 'POLLING SYNC (15S)'}</span>
            </span>
          </div>
        </div>

        {/* Center: Unified Search Bar */}
        <div className="relative flex-1 max-w-md" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setShowSearchResults(true);
              }}
              placeholder="Search hospitals, police, incidents, or street..."
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-800/90 border border-slate-700 hover:border-slate-600 focus:border-blue-500 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none transition shadow-inner font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchResults(false);
                  if (searchMarkerLayerRef.current) searchMarkerLayerRef.current.clearLayers();
                }}
                className="absolute right-2 text-slate-400 hover:text-slate-200 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </form>

          {/* Unified Search Dropdown */}
          {showSearchResults && (
            <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto text-xs">
              {isSearching ? (
                <div className="p-4 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Searching Grid Database & Maps...</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {/* Verified Facilities Results */}
                  {searchResults.facilities.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                        Verified Emergency Facilities
                      </div>
                      {searchResults.facilities.map((fac) => (
                        <button
                          key={fac.id}
                          type="button"
                          onClick={() =>
                            selectSearchResult({
                              lat: fac.latitude,
                              lng: fac.longitude,
                              title: fac.name,
                              type: 'FACILITY',
                              facility: fac
                            })
                          }
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-lg flex items-start gap-2 transition text-slate-200"
                        >
                          <Building2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold truncate">{fac.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{fac.address}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Incident Results */}
                  {searchResults.incidents.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                        Active Reported Incidents
                      </div>
                      {searchResults.incidents.map((inc) => (
                        <button
                          key={inc.id}
                          type="button"
                          onClick={() =>
                            selectSearchResult({
                              lat: inc.location.latitude!,
                              lng: inc.location.longitude!,
                              title: inc.title,
                              type: 'INCIDENT',
                              incident: inc
                            })
                          }
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-lg flex items-start gap-2 transition text-slate-200"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold truncate">
                              [{inc.id}] {inc.title}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{inc.location.address}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* OpenStreetMap Geocoded Places */}
                  {searchResults.places.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">
                        Street Addresses (OpenStreetMap)
                      </div>
                      {searchResults.places.map((place) => (
                        <button
                          key={place.id}
                          type="button"
                          onClick={() =>
                            selectSearchResult({
                              lat: place.lat,
                              lng: place.lng,
                              title: place.displayName,
                              type: 'PLACE'
                            })
                          }
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-lg flex items-start gap-2 transition text-slate-200"
                        >
                          <MapPin className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                          <div className="truncate font-medium">{place.displayName}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchNotice && (
                    <div className="p-3 text-center text-slate-400 text-xs">
                      {searchNotice}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: GPS Locate, Refresh, Fullscreen */}
        <div className="flex items-center gap-2">
          {isTracking ? (
            <button
              type="button"
              onClick={stopTracking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 rounded-lg transition"
              title="Stop Device Geolocation Tracking"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>GPS Active</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isLocating}
              onClick={startTracking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-200 bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 rounded-lg transition disabled:opacity-50"
              title="Request Browser Geolocation Permission"
            >
              {isLocating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>{isLocating ? 'Locating...' : 'My Location'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRecenter}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition"
            title="Recenter Grid Map"
          >
            <Crosshair className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={loadData}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition"
            title="Refresh Grid Data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* AGENT CONNECTION CHIPS (FOUR SPECIALIZED AGENTS + ALL) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none z-20 shrink-0">
        <span className="text-[10px] font-mono uppercase text-slate-400 font-bold shrink-0 flex items-center gap-1">
          <Activity className="w-3 h-3 text-blue-400" />
          Agent Domain:
        </span>

        {/* ALL AGENTS BUTTON */}
        <button
          type="button"
          onClick={() => setSelectedAgent('ALL')}
          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            selectedAgent === 'ALL'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <span>All Layers</span>
          <span className="text-[10px] bg-slate-900/60 px-1.5 py-0.2 rounded-full">
            {gridMetrics.totalIncidents + gridMetrics.totalFacilities}
          </span>
        </button>

        {/* 1. POLICE AGENT BUTTON */}
        <button
          type="button"
          onClick={() => setSelectedAgent('POLICE_TACTICAL')}
          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            selectedAgent === 'POLICE_TACTICAL'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-blue-950/40 text-blue-300 hover:bg-blue-900/50 border border-blue-500/30'
          }`}
        >
          <Shield className="w-3 h-3" />
          <span>Rakshak AI (Police)</span>
        </button>

        {/* 2. HOSPITAL & EMS AGENT BUTTON */}
        <button
          type="button"
          onClick={() => setSelectedAgent('HOSPITAL_EMS')}
          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            selectedAgent === 'HOSPITAL_EMS'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/50 border border-rose-500/30'
          }`}
        >
          <HeartPulse className="w-3 h-3" />
          <span>Jeevan AI (Hospital & EMS)</span>
        </button>

        {/* 3. WATER & HYDRO AGENT BUTTON */}
        <button
          type="button"
          onClick={() => setSelectedAgent('WATER_HYDRO')}
          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            selectedAgent === 'WATER_HYDRO'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 border border-cyan-500/30'
          }`}
        >
          <Droplets className="w-3 h-3" />
          <span>JalRakshak AI (Water & Hydro)</span>
          {gridMetrics.waterCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          )}
        </button>

        {/* 4. POWER GRID / KEB AGENT BUTTON */}
        <button
          type="button"
          onClick={() => setSelectedAgent('CURRENT_KEB')}
          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
            selectedAgent === 'CURRENT_KEB'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 border border-amber-500/30'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>Shakti AI (Power Grid)</span>
          {gridMetrics.powerCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ACTIVE AGENT FOCUS BANNER */}
      {/* ------------------------------------------------------------- */}
      {selectedAgent !== 'ALL' && (
        <div
          className={`px-4 py-2 border-b text-xs flex flex-wrap items-center justify-between gap-3 ${
            agentProfiles[selectedAgent].bgClass
          } ${agentProfiles[selectedAgent].borderClass} ${agentProfiles[selectedAgent].textClass}`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider font-mono">
              [{agentProfiles[selectedAgent].code}] {agentProfiles[selectedAgent].name}:
            </span>
            <span>{agentProfiles[selectedAgent].focusSummary}</span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedAgent('ALL')}
            className="text-[11px] underline hover:no-underline font-semibold"
          >
            Reset to All Layers
          </button>
        </div>
      )}

      {/* Geolocation Telemetry Notification Banner */}
      {isTracking && userLocation && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Device GPS Telemetry:</span>
            <span className="font-mono text-emerald-200">
              {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
            </span>
            {userLocation.accuracy && (
              <span className="bg-emerald-900/60 px-2 py-0.5 rounded-full text-[10px] border border-emerald-500/30">
                Accuracy: ±{userLocation.accuracy}m
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <button
              type="button"
              onClick={handleRecenter}
              className="font-bold underline text-emerald-200 hover:text-white"
            >
              Center on My Position
            </button>
          </div>
        </div>
      )}

      {/* Geolocation Error Alert */}
      {trackingError && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-4 py-2 text-xs flex items-center justify-between gap-2 text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{trackingError}</span>
          </div>
          <button
            type="button"
            onClick={() => setTrackingError(null)}
            className="text-rose-400 hover:text-rose-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA: TACTICAL SIDEBAR + REAL LEAFLET MAP */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* TACTICAL COLLAPSIBLE SIDEBAR */}
        {isSidebarOpen && (
          <aside className="w-80 md:w-96 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shrink-0 transition-all">
            {/* Sidebar Tabs */}
            <div className="grid grid-cols-3 border-b border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('INCIDENTS')}
                className={`py-2.5 text-center transition ${
                  activeTab === 'INCIDENTS'
                    ? 'border-b-2 border-blue-500 text-blue-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                Incidents ({incidents.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('FACILITIES')}
                className={`py-2.5 text-center transition ${
                  activeTab === 'FACILITIES'
                    ? 'border-b-2 border-emerald-500 text-emerald-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                Facilities ({facilities.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('FLEET')}
                className={`py-2.5 text-center transition ${
                  activeTab === 'FLEET'
                    ? 'border-b-2 border-purple-500 text-purple-400 bg-slate-800/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                }`}
              >
                Fleet ({resources.length})
              </button>
            </div>

            {/* Layer Toggles Toolbar */}
            <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono uppercase font-bold">Visible Layers:</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={showIncidentsLayer}
                    onChange={(e) => setShowIncidentsLayer(e.target.checked)}
                    className="rounded text-blue-600 bg-slate-800 border-slate-700"
                  />
                  <span>Incidents</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={showFacilitiesLayer}
                    onChange={(e) => setShowFacilitiesLayer(e.target.checked)}
                    className="rounded text-emerald-600 bg-slate-800 border-slate-700"
                  />
                  <span>Facilities</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={showResourcesLayer}
                    onChange={(e) => setShowResourcesLayer(e.target.checked)}
                    className="rounded text-purple-600 bg-slate-800 border-slate-700"
                  />
                  <span>Fleet</span>
                </label>
              </div>
            </div>

            {/* TAB CONTENT LIST */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {/* TAB 1: INCIDENTS LIST */}
              {activeTab === 'INCIDENTS' && (
                <>
                  {incidents.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      <div className="font-semibold text-slate-400">No Incidents in Database</div>
                      <p className="mt-1">
                        Submit a new report from "Report Incident" or simulate an emergency to see live markers.
                      </p>
                    </div>
                  ) : (
                    incidents.map((inc) => {
                      const isSelected = selectedItem?.type === 'INCIDENT' && selectedItem.incident?.id === inc.id;
                      const isWater = isWaterIncident(inc);
                      const isPower = isPowerIncident(inc);

                      return (
                        <div
                          key={inc.id}
                          onClick={() => {
                            setSelectedItem({ type: 'INCIDENT', incident: inc });
                            if (inc.location.latitude && inc.location.longitude && mapInstanceRef.current) {
                              mapInstanceRef.current.flyTo([inc.location.latitude, inc.location.longitude], 15);
                            }
                          }}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                            isSelected
                              ? 'bg-blue-950/60 border-blue-500 shadow-md ring-1 ring-blue-500'
                              : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                              <span className="text-blue-400">{inc.id}</span>
                              {isWater && (
                                <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-500/30">
                                  WATER
                                </span>
                              )}
                              {isPower && (
                                <span className="text-[10px] bg-amber-950 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/30">
                                  POWER
                                </span>
                              )}
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                inc.priority === 'CRITICAL'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                                  : inc.priority === 'HIGH'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                                  : 'bg-blue-950 text-blue-400 border border-blue-500/30'
                              }`}
                            >
                              {inc.priority}
                            </span>
                          </div>

                          <div className="font-semibold text-slate-100 line-clamp-1 mb-1">{inc.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-2">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{inc.location.address}</span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-700/50">
                            <span>Status: {inc.status}</span>
                            <span className="text-blue-400 flex items-center gap-0.5 hover:underline">
                              Inspect &rarr;
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* TAB 2: VERIFIED FACILITIES LIST */}
              {activeTab === 'FACILITIES' && (
                <>
                  {facilities.map((fac) => {
                    const isSelected = selectedItem?.type === 'FACILITY' && selectedItem.facility?.id === fac.id;
                    return (
                      <div
                        key={fac.id}
                        onClick={() => {
                          setSelectedItem({ type: 'FACILITY', facility: fac });
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo([fac.latitude, fac.longitude], 15);
                          }
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            {fac.type.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{fac.id}</span>
                        </div>

                        <div className="font-semibold text-slate-100 line-clamp-1 mb-1">{fac.name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{fac.address}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">📞 {fac.contactPhone}</div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* TAB 3: REGISTERED FLEET LIST */}
              {activeTab === 'FLEET' && (
                <>
                  {resources.map((res) => {
                    const isSelected = selectedItem?.type === 'RESOURCE' && selectedItem.resource?.id === res.id;
                    const isAvail = res.status === 'AVAILABLE';
                    return (
                      <div
                        key={res.id}
                        onClick={() => {
                          setSelectedItem({ type: 'RESOURCE', resource: res });
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo([res.latitude, res.longitude], 15);
                          }
                        }}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-purple-950/60 border-purple-500 shadow-md ring-1 ring-purple-500'
                            : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-purple-400 font-bold text-[11px]">{res.id}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              isAvail
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {res.status}
                          </span>
                        </div>

                        <div className="font-semibold text-slate-100 line-clamp-1 mb-1">{res.name}</div>
                        <div className="text-[11px] text-slate-400 truncate mb-1">{res.address}</div>
                        <div className="text-[10px] text-slate-500">Crew: {res.capacity}</div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </aside>
        )}

        {/* ------------------------------------------------------------- */}
        {/* LEAFLET STREET MAP CONTAINER */}
        {/* ------------------------------------------------------------- */}
        <div className="flex-1 relative h-full w-full bg-slate-950">
          <div ref={mapContainerRef} className="h-full w-full tactical-dark-tiles" />

          {/* BOTTOM FLOATING CARD: SELECTED ITEM INSPECTOR & OSRM ROUTE PREVIEW */}
          {selectedItem && (
            <div className="absolute bottom-6 left-6 right-6 sm:left-6 sm:right-auto sm:max-w-md w-auto bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 border border-slate-700 shadow-2xl z-[1000] text-xs space-y-3 animate-in fade-in duration-150">
              {/* Header with Title and Close Button */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {selectedItem.type === 'FACILITY' && (
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                        VERIFIED FACILITY
                      </span>
                    )}
                    {selectedItem.type === 'INCIDENT' && (
                      <span className="bg-rose-950 text-rose-400 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                        USER INCIDENT REPORT
                      </span>
                    )}
                    {selectedItem.type === 'RESOURCE' && (
                      <span className="bg-purple-950 text-purple-400 border border-purple-500/40 text-[10px] font-bold px-2 py-0.5 rounded">
                        FLEET STAGING BASE
                      </span>
                    )}
                    <span className="font-mono text-slate-400 text-[11px]">
                      {selectedItem.incident?.id || selectedItem.facility?.id || selectedItem.resource?.id}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-100 text-sm line-clamp-1">
                    {selectedItem.incident?.title || selectedItem.facility?.name || selectedItem.resource?.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedItem(null);
                    clearCurrentRoute();
                  }}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Address / Location snippet */}
              <div className="text-slate-400 flex items-center gap-1.5 text-xs">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">
                  {selectedItem.incident?.location.address ||
                    selectedItem.facility?.address ||
                    selectedItem.resource?.address}
                </span>
              </div>

              {/* Operational details snippet */}
              {selectedItem.facility && (
                <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg text-[11px] text-slate-300 space-y-1">
                  <div>{selectedItem.facility.details}</div>
                  <div className="text-slate-400">📞 Phone: {selectedItem.facility.contactPhone}</div>
                </div>
              )}

              {selectedItem.incident && (
                <div className="p-2 bg-slate-950/70 border border-slate-800 rounded-lg text-[11px] text-slate-300 space-y-1">
                  <div className="line-clamp-2">{selectedItem.incident.description}</div>
                  <div className="flex items-center gap-3 text-slate-400 pt-1">
                    <span>Priority: <strong className="text-rose-400">{selectedItem.incident.priority}</strong></span>
                    <span>Casualties: <strong>{selectedItem.incident.casualtiesCount}</strong></span>
                  </div>
                </div>
              )}

              {/* OSRM Route Action Controls */}
              <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400 font-bold">Free Route Preview:</span>
                <button
                  type="button"
                  disabled={isCalculatingRoute || !userLocation}
                  onClick={() => calculateRoute('USER_GPS')}
                  className="px-2.5 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-500/40 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-40"
                  title={userLocation ? 'Preview driving route from your device coordinates' : 'Enable My Location above to route from your GPS'}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>From My Device</span>
                </button>

                <button
                  type="button"
                  disabled={isCalculatingRoute}
                  onClick={() => calculateRoute('FLEET')}
                  className="px-2.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/40 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-40"
                  title="Preview route from closest emergency response base"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>From Nearest Base</span>
                </button>
              </div>

              {/* OSRM Route Telemetry Result */}
              {isCalculatingRoute ? (
                <div className="p-2.5 bg-slate-950 rounded-lg text-xs text-slate-400 flex items-center gap-2 border border-slate-800">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Computing road vectors from OpenStreetMap OSRM network...</span>
                </div>
              ) : osrmRoute ? (
                <div className="p-3 bg-slate-950/90 rounded-xl border border-blue-500/40 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span>Driving Distance: <strong className="text-blue-400">{osrmRoute.distanceKm} km</strong></span>
                    <span>Est. Time: <strong className="text-emerald-400">~{osrmRoute.durationMinutes} mins</strong></span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Route: {osrmRoute.summary || 'Primary Road Network'} (Origin: {routeOriginName})
                  </div>
                  <div className="bg-amber-950/50 border border-amber-500/30 p-1.5 rounded text-[10px] text-amber-300">
                    ⚠️ <strong>Route Preview Only:</strong> Subject to traffic and municipal dispatch verification. Fleet vehicles follow confirmed radio dispatch.
                  </div>
                  <button
                    type="button"
                    onClick={clearCurrentRoute}
                    className="text-[10px] text-slate-400 hover:text-white underline pt-0.5"
                  >
                    Clear route preview
                  </button>
                </div>
              ) : routeError ? (
                <p className="text-[11px] text-rose-400">{routeError}</p>
              ) : null}

              {/* Bottom Quick Action: Full Dossier */}
              {selectedItem.incident && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => navigate(`/incidents/${selectedItem.incident!.id}`)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition"
                  >
                    <span>Open Incident Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BOTTOM RIGHT FLOATING LEGEND */}
          <div className="absolute bottom-6 right-16 z-[1000] hidden lg:flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 shadow-xl text-[11px] text-slate-300">
            <span className="font-mono text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">
              Marker Legend
            </span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-blue-600 border border-blue-400" />
              <span>Police Station</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-rose-600 border border-rose-400" />
              <span>Hospital & Trauma</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-cyan-600 border border-cyan-400" />
              <span>Water Treatment / Supply</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-amber-600 border border-amber-400" />
              <span>Power Substation / Outage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse border border-white" />
              <span>Critical Incident</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-400" />
              <span>Response Vehicle</span>
            </div>
            {isTracking && (
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping border border-white" />
                <span>My Location</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
