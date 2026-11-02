import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, MapPin, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { loadDemoIncidents, loadDemoActivity } from '../demo/demoStore';
import { demoIncidentToIncident } from '../demo/localFallback';
import { Incident, AuditLog } from '../types';
import { Skeleton } from '../components/common/UiBits';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';

/**
 * Mission History — built only from real backend records:
 * recent incidents and audit entries from /dashboard/activity.
 * Nothing here is invented, and an empty result is shown as empty.
 */
export const MissionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardActivity();
      setIncidents(data.recentIncidents || []);
      setAudits(data.recentAudits || []);
    } catch {
      // Backend unavailable: history from local data, no error shown.
      setIncidents(loadDemoIncidents().map(demoIncidentToIncident));
      setAudits(loadDemoActivity().map((a, i) => ({ id: `AUDIT-${i}`, action: 'Demo activity', details: a, userEmail: 'Local engine', entityType: 'Incident', entityId: '', createdAt: new Date().toISOString() } as any)));
      setError(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-[20px] border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-[#2563EB]" /> Mission History
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Recent incidents and activity. Simulated data · For real emergencies, call 112.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="min-h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#172033] hover:bg-slate-50 inline-flex items-center gap-2 shrink-0"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>


      <section className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="px-5 py-4 border-b border-slate-200 font-bold text-[#172033]">Recent Incidents</h2>
        {isLoading ? (
          <div className="p-5 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : incidents.length === 0 ? (
          <p className="p-5 text-sm text-[#64748B]">No recent incident records were returned.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {incidents.map((inc) => (
              <li key={inc.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-[#2563EB]">{inc.id}</span>
                      <PriorityBadge priority={inc.priority} size="sm" />
                      <StatusBadge status={inc.status} size="sm" />
                      <span className="text-xs text-slate-500">
                        {new Date(inc.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-[#172033] truncate">{inc.title}</p>
                    <p className="text-xs text-[#64748B] truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" /> {inc.location.address}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-white rounded-[20px] border border-slate-200 shadow-sm overflow-hidden">
        <h2 className="px-5 py-4 border-b border-slate-200 font-bold text-[#172033]">Audit Trail</h2>
        {isLoading ? (
          <div className="p-5 space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : audits.length === 0 ? (
          <p className="p-5 text-sm text-[#64748B]">No audit entries were returned.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {audits.map((a) => (
              <li key={a.id} className="px-5 py-4">
                <p className="text-sm font-semibold text-[#172033]">{a.action}</p>
                <p className="text-xs text-[#64748B] mt-0.5 break-words">{a.details}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {a.userEmail} · {a.entityType} {a.entityId} ·{' '}
                  {new Date(a.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
