import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { AppLayout } from './components/layout/AppLayout';
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
  <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#F5F7FB] text-[#64748B] text-sm">
    <div className="flex flex-col items-center gap-3 px-4 text-center">
      <div className="w-10 h-10 rounded-2xl bg-[#101C35] text-white flex items-center justify-center animate-pulse">
        <span className="font-bold">A</span>
      </div>
      <span>Loading AegisAI…</span>
    </div>
  </div>
);

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

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </NotificationProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
