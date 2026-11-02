import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, AlertCircle, FilePlus2, MapPin, Bot, MoreHorizontal, Box, Layers, History, Settings, User, LogOut, X } from 'lucide-react';

const BOTTOM_NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/incidents', label: 'Incidents', icon: AlertCircle, end: false },
  { to: '/report', label: 'Report', icon: FilePlus2, end: false },
  { to: '/map', label: 'Map', icon: MapPin, end: false },
  { to: '/agents', label: 'Agents', icon: Bot, end: false }
];

const MORE_ITEMS = [
  { to: '/3d', label: '3D Tactical', icon: Box },
  { to: '/resources', label: 'Fleet & Resources', icon: Layers },
  { to: '/history', label: 'Mission History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: User }
];

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('aegis_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      try { localStorage.setItem('aegis_sidebar_collapsed', String(!prev)); } catch { /* ignore */ }
      return !prev;
    });
  };

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden bg-[#F1F5F9] text-[#172033]">
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 text-[#172033]">
          <Outlet />
        </main>

        {/* More sheet — remaining sections, above the bottom nav */}
        {moreOpen && (
          <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-label="More sections">
            <button type="button" aria-label="Close more menu" className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
            <div className="absolute bottom-16 inset-x-0 bg-white rounded-t-[20px] border border-slate-200 shadow-xl p-4 pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-[#172033]">More</p>
                <button type="button" onClick={() => setMoreOpen(false)} className="p-2 rounded-lg hover:bg-slate-100" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MORE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.to} type="button" onClick={() => { setMoreOpen(false); navigate(item.to); }} className="min-h-12 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-[#172033] flex items-center gap-2.5 text-left">
                      <Icon className="w-4 h-4 text-[#2563EB] shrink-0" />{item.label}
                    </button>
                  );
                })}
                <button type="button" onClick={() => { setMoreOpen(false); logout(); navigate('/login'); }} className="min-h-12 px-3 rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 flex items-center gap-2.5 text-left">
                  <LogOut className="w-4 h-4 shrink-0" />Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile bottom navigation — 5 main sections + More, safe-area padding */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-white/60 pb-[env(safe-area-inset-bottom)]" aria-label="Primary">
          <div className="grid grid-cols-6">
            {BOTTOM_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium min-h-14 ${isActive ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>
                  <Icon className="w-5 h-5" /><span>{item.label}</span>
                </NavLink>
              );
            })}
            <button type="button" onClick={() => setMoreOpen((v) => !v)} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium min-h-14 ${moreOpen ? 'text-[#2563EB]' : 'text-[#64748B]'}`} aria-expanded={moreOpen}>
              <MoreHorizontal className="w-5 h-5" /><span>More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};
