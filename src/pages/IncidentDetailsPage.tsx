import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { auth, updateIncidentInFirestore, saveDispatchToFirestore } from '../services/firebase';
import {
  Incident,
  ResourceAssignment,
  IncidentNote,
  AgentRun,
  IncidentPriority,
  IncidentStatus,
  RouteCalculationResult,
  SpecializedAgent,
  SpecializedAgentId
} from '../types';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { CategoryBadge } from '../components/common/CategoryBadge';
import L from 'leaflet';
import {
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Cpu,
  MapPin,
  RefreshCw,
  Send,
  UserCheck,
  ShieldAlert,
  Navigation,
  FileText,
  Clock,
  RotateCcw,
  AlertTriangle,
  Radio,
  Activity,
  Layers,
  ArrowRight,
  Shield,
  HeartPulse,
  Droplets,
  Zap,
  Check
} from 'lucide-react';

export const IncidentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [notes, setNotes] = useState<IncidentNote[]>([]);
  const [latestRun, setLatestRun] = useState<AgentRun | null>(null);
  const [routeResult, setRouteResult] = useState<RouteCalculationResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isExecutingAgent, setIsExecutingAgent] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [rejectModalAssignmentId, setRejectModalAssignmentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Specialized Agents State
  const [specializedAgents, setSpecializedAgents] = useState<SpecializedAgent[]>([]);
  const [executingAgentAction, setExecutingAgentAction] = useState<string | null>(null);
  const [agentActionSuccess, setAgentActionSuccess] = useState<string | null>(null);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      const [data, specAgents] = await Promise.all([
        api.getIncidentById(id),
        api.getSpecializedAgents(id).catch(() => [])
      ]);
      setIncident(data.incident);
      setAssignments(data.assignments);
      setNotes(data.notes);
      setLatestRun(data.latestAgentRun);
      setSpecializedAgents(specAgents);

      // Fetch route if coordinates exist
      if (data.incident.location.verified && data.incident.location.latitude && data.incident.location.longitude) {
        try {
          const route = await api.getIncidentRoute(id);
          setRouteResult(route);
        } catch {
          // ignore route load error
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Leaflet Map Rendering
  useEffect(() => {
    if (!mapContainerRef.current || !incident) return;

    const lat = incident.location.latitude ?? 37.7749;
    const lng = incident.location.longitude ?? -122.4194;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap public tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;

      // Incident Marker with tactical radar ping
      const color =
        incident.priority === 'CRITICAL' ? '#DC2626' : incident.priority === 'HIGH' ? '#D97706' : '#2563EB';

      const incidentIcon = L.divIcon({
        className: 'custom-incident-pin',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: ${color}; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">!</div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([lat, lng], { icon: incidentIcon })
        .addTo(map)
        .bindPopup(`<strong>${incident.id}</strong><br/>${incident.title}`);
    } else {
      mapInstanceRef.current.setView([lat, lng], 14);
    }

    // Render route polyline if available
    if (mapInstanceRef.current && routeResult?.polyline && routeResult.status === 'SUCCESS') {
      if (polylineLayerRef.current) {
        mapInstanceRef.current.removeLayer(polylineLayerRef.current);
      }
      const poly = L.polyline(routeResult.polyline, {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.9,
        dashArray: '6, 6'
      }).addTo(mapInstanceRef.current);
      polylineLayerRef.current = poly;
      mapInstanceRef.current.fitBounds(poly.getBounds(), { padding: [30, 30] });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [incident, routeResult]);

  const handleTriggerAnalysis = async () => {
    if (!id) return;
    setIsExecutingAgent(true);
    try {
      await api.runAnalysis(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Workflow execution error');
    } finally {
      setIsExecutingAgent(false);
    }
  };

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    if (!id) return;
    try {
      await api.updateIncident(id, { status: newStatus });
      if (auth.currentUser) {
        try {
          await updateIncidentInFirestore(id, { status: newStatus });
        } catch (fErr) {
          console.warn('Firestore update sync notice:', fErr);
        }
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handlePriorityChange = async (newPrio: IncidentPriority) => {
    if (!id) return;
    try {
      await api.updateIncident(id, { priority: newPrio });
      if (auth.currentUser) {
        try {
          await updateIncidentInFirestore(id, { priority: newPrio });
        } catch (fErr) {
          console.warn('Firestore update sync notice:', fErr);
        }
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update priority');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newNoteText.trim()) return;
    try {
      await api.addNote(id, newNoteText.trim());
      setNewNoteText('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    }
  };

  const handleRequestCandidate = async (cand: any) => {
    if (!id) return;
    try {
      await api.requestAssignment(id, {
        resourceId: cand.resourceId,
        matchReason: cand.matchReason,
        distanceKm: cand.distanceKm,
        estimatedDurationMins: cand.estimatedMinutes,
        matchScore: cand.matchScore
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Assignment request failed');
    }
  };

  const handleApproveAssignment = async (asgId: string) => {
    try {
      const updatedAsg = await api.approveAssignment(asgId);
      if (auth.currentUser && updatedAsg) {
        try {
          await saveDispatchToFirestore(updatedAsg);
        } catch (fErr) {
          console.warn('Firestore dispatch sync notice:', fErr);
        }
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  const handleRejectAssignmentSubmit = async () => {
    if (!rejectModalAssignmentId || !rejectReason.trim()) {
      alert('A rejection reason is mandatory for operational compliance.');
      return;
    }
    try {
      await api.rejectAssignment(rejectModalAssignmentId, rejectReason.trim());
      setRejectModalAssignmentId(null);
      setRejectReason('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    }
  };

  const handleReleaseAssignment = async (asgId: string) => {
    if (!confirm('Release unit back to available inventory?')) return;
    try {
      await api.releaseAssignment(asgId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Release failed');
    }
  };

  const handleTriggerAgentAction = async (agentId: SpecializedAgentId, actionId: string) => {
    if (!id) return;
    setExecutingAgentAction(`${agentId}:${actionId}`);
    try {
      const res = await api.executeSpecializedAgentAction(agentId, actionId, id);
      setAgentActionSuccess(res.message);
      const updated = await api.getSpecializedAgents(id);
      setSpecializedAgents(updated);
      setTimeout(() => setAgentActionSuccess(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Action execution error');
    } finally {
      setExecutingAgentAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-xs font-mono text-slate-400">LOADING INCIDENT TELEMETRY...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono">
        Incident record not found.
      </div>
    );
  }

  const structured = latestRun?.structuredOutput;
  const score = structured?.priority?.score ?? incident.priorityRecommendation?.score ?? 0;

  // Approximate breakdown points for visual gauges based on criteria
  const lifeDangerPts = incident.priority === 'CRITICAL' ? 38 : incident.priority === 'HIGH' ? 28 : incident.priority === 'MEDIUM' ? 15 : 5;
  const casualtyPts = incident.casualtiesCount >= 4 ? 25 : incident.casualtiesCount >= 2 ? 18 : incident.casualtiesCount === 1 ? 10 : 0;
  const hazardPts = incident.category === 'FIRE_INCIDENT' || incident.category === 'ROAD_ACCIDENT' ? 18 : 12;
  const verifyPts = incident.location.verified ? 15 : 5;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Incident Command Header */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm font-bold text-blue-300 bg-blue-950/80 px-2.5 py-1 rounded border border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.25)]">
              {incident.id}
            </span>
            <CategoryBadge category={incident.category} />
            <PriorityBadge priority={incident.priority} size="md" />
            <StatusBadge status={incident.status} size="md" />
            {incident.location.verified ? (
              <span className="text-[11px] font-mono font-semibold text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                GPS VERIFIED
              </span>
            ) : (
              <span className="text-[11px] font-mono font-semibold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-500/40">
                UNVERIFIED COORDS
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-2 font-mono tracking-tight">
            {incident.title}
          </h2>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>{incident.location.address}</span>
          </p>
        </div>

        {/* Operator Action Controls */}
        {hasRole(['operator', 'admin']) && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Select */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400">STATUS:</span>
              <select
                value={incident.status}
                onChange={(e) => handleStatusChange(e.target.value as IncidentStatus)}
                className="text-xs font-semibold px-2.5 py-1.5 border border-slate-700 rounded-lg bg-slate-950 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="RECEIVED">Received</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="RESOURCES_DISPATCHED">Dispatched</option>
                <option value="ON_SCENE">On Scene</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Priority Override */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-slate-400">PRIORITY:</span>
              <select
                value={incident.priority}
                onChange={(e) => handlePriorityChange(e.target.value as IncidentPriority)}
                className="text-xs font-semibold px-2.5 py-1.5 border border-slate-700 rounded-lg bg-slate-950 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="UNASSESSED">Unassessed</option>
              </select>
            </div>

            {/* Run Multi-Agent Button */}
            <button
              type="button"
              onClick={handleTriggerAnalysis}
              disabled={isExecutingAgent}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.35)] border border-blue-400/40 transition disabled:opacity-50"
            >
              <Cpu className={`w-3.5 h-3.5 ${isExecutingAgent ? 'animate-spin' : ''}`} />
              <span>{isExecutingAgent ? 'EXECUTING PIPELINE...' : 'EXECUTE AGENTS'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Split-Pane Tactical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Report Overview, Visual AI Score Breakdown, Candidate Comparison Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Original Reporter Intake */}
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Original Caller Intake Narrative</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                LOGGED: {new Date(incident.createdAt).toLocaleString()}
              </span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/80 p-4 rounded-lg border border-slate-800 font-sans whitespace-pre-wrap">
              {incident.description}
            </p>

            <div className="grid grid-cols-3 gap-3 text-xs pt-1 text-slate-300 font-mono bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
              <div>
                <span className="text-slate-500">CASUALTIES: </span>
                <strong className="text-red-400">{incident.casualtiesCount}</strong>
              </div>
              <div>
                <span className="text-slate-500">CALLER: </span>
                <strong className="text-slate-200">{incident.reporterName || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-slate-500">CONTACT: </span>
                <strong className="text-slate-200">{incident.reporterContact || 'N/A'}</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Visual AI Score Breakdown & Recommendations */}
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono">
                  Multi-Agent Triage Assessment & Severity Matrix
                </h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-slate-400">Composite Score:</span>
                <span className="text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-500/40">
                  {score}/100
                </span>
              </div>
            </div>

            {/* Visual Step-by-Step AI Score Breakdown with Progress Bars */}
            <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Objective Severity Score Breakdown</span>
                <span className="text-[10px] text-slate-500">MAX 100 POINTS</span>
              </p>

              {/* Meter 1: Life Danger */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">1. Threat to Human Life (Active trauma, trapped, fire)</span>
                  <span className="text-red-400 font-bold">{lifeDangerPts} / 40 pts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-red-600 to-rose-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(lifeDangerPts / 40) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Meter 2: Casualty Scale */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">2. Casualty Scale Factor ({incident.casualtiesCount} reported)</span>
                  <span className="text-amber-400 font-bold">{casualtyPts} / 25 pts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(casualtyPts / 25) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Meter 3: Hazard Severity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">3. Hazard Class Weight ({incident.category})</span>
                  <span className="text-cyan-400 font-bold">{hazardPts} / 20 pts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(hazardPts / 20) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Meter 4: Verification */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">4. Verification & Ground Coordinates</span>
                  <span className="text-emerald-400 font-bold">{verifyPts} / 15 pts</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(verifyPts / 15) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Explanation & Facts */}
            {structured ? (
              <div className="space-y-3 text-xs">
                {structured.priority && (
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                    <p className="font-semibold text-slate-200 mb-1 font-mono text-[11px] uppercase tracking-wide text-blue-400">
                      Triage Recommendation Rationale:
                    </p>
                    <p className="text-slate-300 leading-relaxed font-sans">{structured.priority.explanation}</p>
                  </div>
                )}

                {/* Facts & Uncertainties */}
                {structured.analysis && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="font-mono text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified Facts
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-300 mt-1.5 font-sans">
                        {structured.analysis.extractedFacts.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                      <span className="font-mono text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-400" /> Flagged Uncertainties
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-300 mt-1.5 font-sans">
                        {structured.analysis.knownUncertainties.map((u, i) => (
                          <li key={i}>{u}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 font-mono">
                Click "EXECUTE AGENTS" above to run the multi-agent triage pipeline.
              </div>
            )}
          </div>

          {/* Section: 4 Specialized Domain Agents (Police, EMS, Water Hydro, Current/KEB) */}
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>Specialized Multi-Agency Grid (Police • EMS • Hydro • KEB)</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                  Synchronized tactical assessments and authorized operational directives for this incident.
                </p>
              </div>

              <Link
                to="/agents"
                className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold self-start sm:self-auto"
              >
                <span>Multi-Agent Center</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {agentActionSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-xs font-mono text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{agentActionSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {specializedAgents.map((ag) => {
                const isPol = ag.id === 'POLICE_TACTICAL';
                const isEms = ag.id === 'HOSPITAL_EMS';
                const isHyd = ag.id === 'WATER_HYDRO';
                const isKeb = ag.id === 'CURRENT_KEB';

                const borderCls = isPol
                  ? 'border-cyan-500/30 bg-cyan-950/10'
                  : isEms
                  ? 'border-rose-500/30 bg-rose-950/10'
                  : isHyd
                  ? 'border-teal-500/30 bg-teal-950/10'
                  : 'border-amber-500/30 bg-amber-950/10';

                const badgeCls = isPol
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                  : isEms
                  ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                  : isHyd
                  ? 'bg-teal-950 text-teal-300 border-teal-500/50'
                  : 'bg-amber-950 text-amber-300 border-amber-500/50';

                const Icon = isPol ? ShieldAlert : isEms ? HeartPulse : isHyd ? Droplets : Zap;

                return (
                  <div key={ag.id} className={`p-3.5 rounded-lg border ${borderCls} space-y-2.5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-slate-200" />
                        <span className="font-mono font-bold text-slate-100 text-xs">{ag.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold ${badgeCls}`}>
                          {ag.code}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-600/40 font-bold">
                        {ag.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 font-sans leading-relaxed bg-slate-950/70 p-2.5 rounded border border-slate-800/80">
                      {ag.liveAssessment}
                    </p>

                    {/* Quick Trigger Buttons */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {ag.actions.slice(0, 2).map((act) => {
                        const isExecuting = executingAgentAction === `${ag.id}:${act.id}`;
                        const isDone = act.status === 'COMPLETED';
                        return (
                          <button
                            key={act.id}
                            type="button"
                            onClick={() => handleTriggerAgentAction(ag.id, act.id)}
                            disabled={isExecuting}
                            className={`px-2 py-1.5 rounded text-[10px] font-mono text-left font-bold border transition flex items-center justify-between ${
                              isDone
                                ? 'bg-slate-950 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-700/80'
                            }`}
                          >
                            <span className="truncate">{act.label}</span>
                            {isExecuting ? (
                              <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-400 shrink-0 ml-1" />
                            ) : isDone ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0 ml-1" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Candidate Unit Comparison Table */}
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                <span>Simulated Fleet Dispatch Coordination</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                HUMAN OPERATOR AUTHORIZATION REQUIRED
              </span>
            </div>

            {/* Active Assignments */}
            {assignments.length > 0 && (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                  Active Deployed Units ({assignments.length})
                </p>
                {assignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <strong className="text-slate-100">{asg.resourceName}</strong>
                        <span className="text-slate-500">[{asg.resourceType}]</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            asg.status === 'APPROVED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : asg.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : asg.status === 'REJECTED'
                              ? 'bg-red-950 text-red-300 border border-red-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {asg.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">
                        Distance: {asg.distanceKm} km • ETA: ~{asg.estimatedDurationMins} min
                        {asg.approvedBy && ` • Authorized by ${asg.approvedBy}`}
                        {asg.rejectionReason && ` • Rejection Reason: "${asg.rejectionReason}"`}
                      </p>
                    </div>

                    {hasRole(['operator', 'admin']) && (
                      <div className="flex items-center gap-2 shrink-0">
                        {asg.status === 'PENDING_APPROVAL' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveAssignment(asg.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono font-bold text-xs flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>APPROVE</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectModalAssignmentId(asg.id)}
                              className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-700/60 rounded-lg font-mono font-bold text-xs flex items-center gap-1 transition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>REJECT</span>
                            </button>
                          </>
                        )}
                        {asg.status === 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => handleReleaseAssignment(asg.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono font-medium text-xs flex items-center gap-1 transition border border-slate-700"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>RELEASE UNIT</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Candidate Units Comparison Table */}
            {structured?.candidateResources && structured.candidateResources.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                    Candidate Fleet Unit Evaluation Matrix
                  </p>
                  <Link
                    to="/tactical-3d"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold transition shadow-sm"
                  >
                    <Layers className="w-3 h-3 text-cyan-400" />
                    <span>INSPECT FLEET LOADOUT IN 3D</span>
                  </Link>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                        <th className="py-2.5 px-3 font-semibold">Response Unit</th>
                        <th className="py-2.5 px-3 font-semibold">Type</th>
                        <th className="py-2.5 px-3 font-semibold">Proximity</th>
                        <th className="py-2.5 px-3 font-semibold">Est. ETA</th>
                        <th className="py-2.5 px-3 font-semibold">Match Rationale</th>
                        <th className="py-2.5 px-3 font-semibold">Status / Conflict</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                      {structured.candidateResources.map((cand) => (
                        <tr key={cand.resourceId} className="hover:bg-slate-900/50 transition">
                          <td className="py-2.5 px-3 font-bold text-slate-200">{cand.resourceName}</td>
                          <td className="py-2.5 px-3 text-slate-400">{cand.resourceType}</td>
                          <td className="py-2.5 px-3 text-slate-300">{cand.distanceKm} km</td>
                          <td className="py-2.5 px-3 text-blue-400">~{cand.estimatedMinutes}m</td>
                          <td className="py-2.5 px-3">
                            <span className="text-slate-300 font-sans text-[11px] line-clamp-1" title={cand.matchReason}>
                              {cand.matchReason}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {cand.conflictDetected ? (
                              <span className="text-[10px] text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-600/40">
                                BUSY / CONFLICT
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-600/40">
                                AVAILABLE
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {hasRole(['operator', 'admin']) && (
                              <button
                                type="button"
                                disabled={cand.conflictDetected}
                                onClick={() => handleRequestCandidate(cand)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded font-bold text-[10px] uppercase shadow transition"
                              >
                                Dispatch
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Road Network Route Calculation */}
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-400" />
                <span>Road Network Dispatch Corridor (Dijkstra)</span>
              </h3>
            </div>

            {routeResult ? (
              routeResult.status === 'SUCCESS' ? (
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-500">Distance: </span>
                      <strong className="text-blue-400 text-sm">{routeResult.distanceKm} km</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Est. Duration: </span>
                      <strong className="text-emerald-400 text-sm">~{routeResult.estimatedDurationMinutes} mins</strong>
                    </div>
                  </div>

                  {routeResult.steps && routeResult.steps.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Turn-by-turn Tactical Road Segments:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px]">
                        {routeResult.steps.map((st, i) => (
                          <li key={i}>{typeof st === 'string' ? st : (st as any).instruction}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-200 font-mono">
                  <p className="font-bold">PREREQUISITE NOTICE:</p>
                  <p className="mt-1 text-amber-300">{routeResult.message}</p>
                </div>
              )
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 font-mono">
                Route corridor calculated once GPS coordinates are confirmed.
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Tactical Map & Operational Notes */}
        <div className="space-y-6">
          {/* Tactical Map Card */}
          <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800/80 shadow-xl space-y-2">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Tactical Geolocation HUD</span>
            </h3>
            <div className="rounded-lg border border-slate-800 overflow-hidden h-64 bg-slate-950 relative">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>LAT: {incident.location.latitude?.toFixed(4) ?? 'UNSET'}</span>
              <span>LON: {incident.location.longitude?.toFixed(4) ?? 'UNSET'}</span>
            </div>
          </div>

          {/* Operational Notes */}
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-xl border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Operational Dispatch Notes ({notes.length})</span>
              </h3>
            </div>

            {hasRole(['operator', 'admin']) && (
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={2}
                  required
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Record operational orders, scene updates, or radio contact notes..."
                  className="w-full p-2.5 text-xs border border-slate-800 rounded-lg bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>TRANSMIT OPERATIONAL NOTE</span>
                </button>
              </form>
            )}

            <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto space-y-2">
              {notes.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono text-center py-4">No operational notes logged.</p>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="pt-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                      <span className="text-blue-400 font-bold">{n.authorName} ({n.authorRole})</span>
                      <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-slate-300 mt-1 font-sans">{n.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Rejection Reason Modal */}
      {rejectModalAssignmentId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-red-500/50 text-slate-100">
            <h3 className="text-sm font-bold flex items-center gap-2 text-red-400 font-mono uppercase tracking-wide">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Mandatory Rejection Justification</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              System compliance rules mandate that an operator must log an explicit operational justification when rejecting a recommended unit.
            </p>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Unit standing by for high-acuity pediatric emergency in sector 4..."
              className="w-full p-2.5 text-xs border border-slate-700 rounded-lg bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 font-sans"
            />
            <div className="flex items-center justify-end gap-2.5 pt-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setRejectModalAssignmentId(null);
                  setRejectReason('');
                }}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleRejectAssignmentSubmit}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-[0_0_12px_rgba(239,68,68,0.4)]"
              >
                CONFIRM REJECTION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
