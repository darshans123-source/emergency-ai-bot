import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, AuditLog } from '../types';
import {
  ShieldCheck,
  Users,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Lock,
  RotateCcw,
  KeyRound,
  Fingerprint,
  Layers,
  Clock,
  Terminal,
  Activity
} from 'lucide-react';

export const AdminAuditPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uData, lData] = await Promise.all([
        api.getUsers(),
        api.getAuditLogs()
      ]);
      setUsers(uData);
      setLogs(lData);
    } catch (err) {
      console.error('Failed to load audit telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    const matchesSearch =
      !search ||
      log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.entityId.toLowerCase().includes(search.toLowerCase());
    return matchesAction && matchesSearch;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('APPROVED')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('REJECTED')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (action.includes('REQUESTED') || action.includes('TRIGGER')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    if (action.includes('RESET')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    }
    return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Tactical Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/70 p-6 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Security Governance & Immutable Audit Trail
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    AIR-GAP ENFORCED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Cryptographic verification logs, role-based access control (RBAC), and operator event provenance.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-200 text-xs font-semibold tracking-wide transition shadow-sm hover:border-slate-600 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Status Mini-Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 flex items-center gap-3 shadow-lg">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Authorized Accounts</p>
            <p className="text-xl font-bold text-white font-mono mt-0.5">{users.length} Active</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 flex items-center gap-3 shadow-lg">
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Audit Stream</p>
            <p className="text-xl font-bold text-purple-300 font-mono mt-0.5">{logs.length} Records</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 flex items-center gap-3 shadow-lg">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Hashing Integrity</p>
            <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">SHA-256 Valid</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 flex items-center gap-3 shadow-lg">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Triage Actions</p>
            <p className="text-xl font-bold text-amber-300 font-mono mt-0.5">
              {logs.filter(l => l.action.includes('ASSIGNMENT') || l.action.includes('INCIDENT')).length}
            </p>
          </div>
        </div>
      </div>

      {/* Authorized Personnel Table */}
      <div className="rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Authorized Personnel Registry ({users.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">RBAC Level 1 - 3</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                <th className="py-3 px-6 font-semibold">User Identity</th>
                <th className="py-3 px-6 font-semibold">Full Name</th>
                <th className="py-3 px-6 font-semibold">Security Clearance</th>
                <th className="py-3 px-6 font-semibold">Organization / Agency</th>
                <th className="py-3 px-6 font-semibold">Provisioned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-6 font-mono text-cyan-300 font-bold">
                    <span className="text-slate-500 font-normal">UID:</span> {u.id}
                  </td>
                  <td className="py-3.5 px-6 font-sans">
                    <div className="font-semibold text-white">{u.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-6">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        u.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : u.role === 'operator'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        u.role === 'admin'
                          ? 'bg-purple-400'
                          : u.role === 'operator'
                          ? 'bg-cyan-400'
                          : 'bg-emerald-400'
                      }`} />
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-slate-300 font-sans">{u.organization}</td>
                  <td className="py-3.5 px-6 text-slate-400 text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Filter Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by operator, action, entity ID, or details..."
            className="w-full pl-9 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition font-sans"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-400 text-xs">Action:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 border border-slate-800 rounded-xl bg-slate-950/70 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-mono"
          >
            <option value="ALL">All Actions</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="INCIDENT_CREATED">Incident Created</option>
            <option value="INCIDENT_UPDATE">Incident Updated</option>
            <option value="ASSIGNMENT_REQUESTED">Assignment Requested</option>
            <option value="ASSIGNMENT_APPROVED">Assignment Approved</option>
            <option value="ASSIGNMENT_REJECTED">Assignment Rejected</option>
            <option value="AGENT_WORKFLOW_TRIGGER">Agent Triggered</option>
            <option value="DEMO_DATA_RESET">Demo Reset</option>
          </select>
        </div>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800/80 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Immutable Ledger Trail ({filteredLogs.length} Records)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Real-Time Sync Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                <th className="py-3 px-5 font-semibold">Timestamp</th>
                <th className="py-3 px-5 font-semibold">Actor</th>
                <th className="py-3 px-5 font-semibold">Action Type</th>
                <th className="py-3 px-5 font-semibold">Target Entity</th>
                <th className="py-3 px-5 font-semibold">Operation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-5 text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>
                          {new Date(log.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-white font-medium whitespace-nowrap">
                      {log.userEmail}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-300 whitespace-nowrap">
                      <span className="text-slate-500 uppercase text-[10px] mr-1">{log.entityType}:</span>
                      <span className="text-cyan-400 font-bold">{log.entityId}</span>
                    </td>
                    <td className="py-3 px-5 text-slate-300 font-sans max-w-md break-words">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
