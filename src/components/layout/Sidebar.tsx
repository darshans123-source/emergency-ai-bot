import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircle,
  FilePlus2,
  MapPin,
  Ambulance,
  Cpu,
  LogOut,
  ShieldAlert,
  User as UserIcon
} from 'lucide-react';

export const AegisEmblem: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dim = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  return (
    <div className={`${dim} shrink-0 flex items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs`}>
      <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { user, firebaseUser, logout } = useAuth();

  const navItems = [
    { to: '/', label: 'Command Center', icon: Cpu },
    { to: '/incidents', label: 'Incidents', icon: AlertCircle },
    { to: '/report', label: 'Report Emergency', icon: FilePlus2 },
    { to: '/map', label: 'Live Map', icon: MapPin },
    { to: '/resources', label: 'Fleet & Resources', icon: Ambulance }
  ];

  return (
    <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col shrink-0 h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <AegisEmblem size="md" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-bold text-white tracking-tight">AegisAI</h1>
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/60 text-blue-300 font-semibold rounded border border-blue-700/50">
              GRID
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate">Autonomous Emergency Grid</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Operations
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Operator Session Info & Logout */}
      <div className="p-3 border-t border-slate-800 bg-[#090d16]">
        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 mb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {firebaseUser?.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt="Profile"
                  className="w-7 h-7 rounded-full border border-blue-400/40 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Operator'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.organization || 'Emergency Ops'}</p>
              </div>
            </div>
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                user?.role === 'admin'
                  ? 'bg-purple-900/60 text-purple-200'
                  : user?.role === 'operator'
                  ? 'bg-blue-900/60 text-blue-200'
                  : 'bg-emerald-900/60 text-emerald-200'
              }`}
            >
              {user?.role || 'OPERATOR'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
