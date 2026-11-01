import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircle,
  FilePlus2,
  MapPin,
  Ambulance,
  LayoutDashboard,
  ShieldCheck,
  Bot,
  History,
  Settings,
  Box,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  X
} from 'lucide-react';

export const AegisEmblem: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dim = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  return (
    <div className={`${dim} shrink-0 flex items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-sm`}>
      <ShieldCheck className="w-5 h-5" />
    </div>
  );
};

const NAV_ITEMS = [
  { to: '/', label: 'Command Center', icon: LayoutDashboard, end: true },
  { to: '/incidents', label: 'Incidents', icon: AlertCircle, end: false },
  { to: '/report', label: 'Report Emergency', icon: FilePlus2, end: false },
  { to: '/map', label: 'Live Map', icon: MapPin, end: false },
  { to: '/tactical-3d', label: '3D Tactical View', icon: Box, end: false },
  { to: '/resources', label: 'Fleet & Resources', icon: Ambulance, end: false },
  { to: '/agents', label: 'AI Agents', icon: Bot, end: false },
  { to: '/history', label: 'Mission History', icon: History, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false }
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile
}) => {
  const { localProfile, user, logout, logoutLocal } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // backend logout is best-effort; the local gate is what controls access
    }
    logoutLocal();
    onCloseMobile();
    navigate('/login', { replace: true });
  };

  const renderBody = (isDrawer: boolean) => (
    <div className="flex flex-col h-full bg-[#101C35] text-slate-300">
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <NavLink to="/" onClick={onCloseMobile} title="Command Center" className="shrink-0">
          <AegisEmblem size="md" />
        </NavLink>
        {(!collapsed || isDrawer) && (
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-white tracking-tight">AegisAI</h1>
            <p className="text-[11px] text-slate-400 truncate">One Voice. Four Agents. One Mission.</p>
          </div>
        )}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 min-w-11 min-h-11 flex items-center justify-center"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {(!collapsed || isDrawer) && (
          <p className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Operations
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onCloseMobile}
              title={item.label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-11 ${
                  isActive
                    ? 'bg-[#2563EB] text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                } ${!isDrawer && collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {(!collapsed || isDrawer) && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        {(!collapsed || isDrawer) && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-2">
            <p className="text-xs font-semibold text-white truncate">{localProfile?.name || user?.name || 'Command User'}</p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {localProfile ? 'Local prototype profile' : user?.organization || 'Command centre'}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition min-h-11 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {(!collapsed || isDrawer) && <span>Logout</span>}
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex w-full items-center justify-center gap-2 mt-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition min-h-10"
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: collapsible */}
      <aside
        className={`hidden lg:flex shrink-0 h-screen sticky top-0 transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderBody(false)}
      </aside>

      {/* Mobile: drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={onCloseMobile}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] shadow-2xl">{renderBody(true)}</aside>
        </div>
      )}
    </>
  );
};
