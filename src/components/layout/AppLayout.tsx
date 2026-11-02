import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { LayoutDashboard, AlertCircle, FilePlus2, MapPin, Bot } from 'lucide-react';

const BOTTOM_NAV = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/incidents', label: 'Incidents', icon: AlertCircle, end: false },
  { to: '/report', label: 'Report', icon: FilePlus2, end: false },
  { to: '/map', label: 'Map', icon: MapPin, end: false },
  { to: '/agents', label: 'Agents', icon: Bot, end: false }
];

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('aegis_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem('aegis_sidebar_collapsed', String(!prev));
      } catch {
        // ignore
      }
      return !prev;
    });
  };

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden bg-[#F1F5F9] text-[#172033]">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 text-[#172033]">
          <Outlet />
        </main>

        {/* Mobile bottom navigation — only on phones/tablets, with safe-area padding */}
        <nav
          className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-white/60 pb-[env(safe-area-inset-bottom)]"
          aria-label="Primary"
        >
          <div className="grid grid-cols-5">
            {BOTTOM_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium min-h-14 ${
                      isActive ? 'text-[#2563EB]' : 'text-[#64748B]'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
