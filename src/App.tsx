import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { AppLayout } from './components/layout/AppLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { WelcomeVoice } from './components/demo/WelcomeVoice';
import { SplashPage } from './pages/SplashPage';
import { LocalLoginPage } from './pages/LocalLoginPage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { MissionHistoryPage } from './pages/MissionHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AgentsPage } from './pages/AgentsPage';
import { AgentChatPage } from './pages/AgentChatPage';

// Heavy pages are lazy-loaded so the splash screen's first load stays small
// and fast on mobile. They are only downloaded when the user actually opens them.
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const ReportIncidentPage = lazy(() =>
  import('./pages/ReportIncidentPage').then((m) => ({ default: m.ReportIncidentPage }))
);
const IncidentsPage = lazy(() =>
  import('./pages/IncidentsPage').then((m) => ({ default: m.IncidentsPage }))
);
const IncidentDetailsPage = lazy(() =>
  import('./pages/IncidentDetailsPage').then((m) => ({ default: m.IncidentDetailsPage }))
);
const LiveMapPage = lazy(() =>
  import('./pages/LiveMapPage').then((m) => ({ default: m.LiveMapPage }))
);
const ResourcesPage = lazy(() =>
  import('./pages/ResourcesPage').then((m) => ({ default: m.ResourcesPage }))
);
const AdminAuditPage = lazy(() =>
  import('./pages/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage }))
);
const Tactical3DPage = lazy(() =>
  import('./pages/Tactical3DPage').then((m) => ({ default: m.Tactical3DPage }))
);

const PageLoading: React.FC = () => (
  <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#071329] text-slate-400 text-sm">
    <div className="flex flex-col items-center gap-3 px-4 text-center">
      <div className="w-10 h-10 rounded-2xl bg-[#101C35] text-white flex items-center justify-center animate-pulse">
        <span className="font-bold">A</span>
      </div>
      <span>Loading AegisAI…</span>
    </div>
  </div>
);


// Meaningful page titles + meta descriptions per route (previously every
// page shared the single index.html title). Runs inside BrowserRouter so
// it can read the current location. Unknown routes keep the 404 title.
const PAGE_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'AegisAI Command Centre', description: 'AegisAI emergency command centre: four demo AI agents, incidents, live map and resources. Decision support only, simulated data — call 112 for real emergencies.' },
  '/agents': { title: 'AegisAI Agents', description: 'Rakshak, Jeevan, Agni and Sanrakshak AI agents — police, medical, fire and disaster demo assistance. Simulated data, not real dispatch.' },
  '/incidents': { title: 'AegisAI Incidents', description: 'Incident queue and demo incident records for AegisAI. Simulated data — call 112 for real emergencies.' },
  '/report': { title: 'Report Emergency — AegisAI', description: 'Report an emergency incident in the AegisAI demo. Records are simulated and no real service is contacted — call 112 for real emergencies.' },
  '/map': { title: 'Live Map — AegisAI', description: 'Live operations map with demo incidents, units and facilities for AegisAI. Simulated data.' },
  '/tactical-3d': { title: '3D Tactical View — AegisAI', description: '3D tactical view for AegisAI demo incidents and resources. Simulated data.' },
  '/resources': { title: 'Fleet & Resources — AegisAI', description: 'Demo fleet, units, hospitals and stations for AegisAI. Simulated data — call 112 for real emergencies.' },
  '/history': { title: 'Mission History — AegisAI', description: 'Mission history and recent demo activity for AegisAI. Simulated data.' },
  '/settings': { title: 'Settings — AegisAI', description: 'AegisAI profile, session and welcome voice settings. Nothing here is stored on a server by this page.' },
  '/profile': { title: 'Profile — AegisAI', description: 'Your local AegisAI profile. Stored only in this browser.' },
  '/login': { title: 'Login — AegisAI', description: 'Sign in to AegisAI with your name and 4-digit PIN (local prototype profile, this browser only).' },
  '/splash': { title: 'AegisAI — One Voice. Four Agents. One Mission.', description: 'AegisAI: One Voice. Four Agents. One Mission. Premium emergency response command centre — decision support only, simulated demo data.' },
};
const RouteTitle: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const key = pathname.startsWith('/agents/') ? '/agents' : pathname.startsWith('/incidents/') ? '/incidents' : pathname;
    const meta = PAGE_META[key] || { title: 'Page Not Found — AegisAI', description: 'This AegisAI page does not exist. Return to the Command Centre or call 112 for a real emergency.' };
    document.title = `${meta.title} | AegisAI`;
    const el = document.querySelector('meta[name="description"]');
    if (el) el.setAttribute('content', meta.description);
  }, [pathname]);
  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRoles?: string[] }> = ({
  children,
  requiredRoles
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

/**
 * The shell is gated on the local prototype profile, not on the old
 * always-present default backend user. Without a local session the user
 * is sent to /login; the splash is only an initial-load route, never a
 * gate that reappears on every navigation.
 */
const RootLayout: React.FC = () => {
  const { localProfile } = useAuth();
  if (!localProfile) {
    return <Navigate to="/login" replace />;
  }
  return <AppLayout />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
        <NotificationProvider>
          <RouteTitle />
          <WelcomeVoice />
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* Premium splash — initial load only */}
              <Route path="/splash" element={<SplashPage />} />

              {/* Local prototype login: Full Name + 4-digit PIN */}
              <Route path="/login" element={<LocalLoginPage />} />
              <Route path="/register" element={<Navigate to="/login" replace />} />

              {/* Main Application Layout */}
              <Route path="/" element={<RootLayout />}>
                <Route index element={<CommandCenterPage />} />
                <Route path="dashboard" element={<Navigate to="/" replace />} />
                {/* AI Agents: new Rakshak / Jeevan / Agni / Sanrakshak hub + chat.
                    The older specialised-agent hub is preserved at /agents/legacy/:agentId. */}
                <Route path="agents" element={<AgentsPage />} />
                <Route path="agents/:slug" element={<AgentChatPage />} />
                <Route path="agents/legacy/:agentId" element={<DashboardPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="incidents/:id" element={<IncidentDetailsPage />} />
                <Route path="report" element={<ReportIncidentPage />} />
                <Route path="map" element={<LiveMapPage />} />
                <Route path="tactical-3d" element={<Tactical3DPage />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="history" element={<MissionHistoryPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route
                  path="admin"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'operator']}>
                      <AdminAuditPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </NotificationProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
