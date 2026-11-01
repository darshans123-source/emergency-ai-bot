import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { SplashPage } from './pages/SplashPage';

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
  <div className="h-screen w-screen flex items-center justify-center bg-[#111827] text-slate-300 font-mono text-xs">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-cyan-500 animate-ping" />
      <span>INITIALIZING DISPATCH CONSOLE...</span>
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

const RootLayout: React.FC = () => {
  const hasSeenSplash = sessionStorage.getItem('aegis_splash_dismissed') === 'true';
  if (!hasSeenSplash) {
    return <Navigate to="/splash" replace />;
  }
  return <AppLayout />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              {/* High-Tech Tactical Splash Screen */}
              <Route path="/splash" element={<SplashPage />} />

              {/* Seamless redirects for legacy login and register URLs */}
              <Route path="/login" element={<Navigate to="/splash" replace />} />
              <Route path="/register" element={<Navigate to="/splash" replace />} />

              {/* Main Application Layout */}
              <Route path="/" element={<RootLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="dashboard" element={<Navigate to="/" replace />} />
                <Route path="agents" element={<Navigate to="/" replace />} />
                <Route path="agents/:agentId" element={<DashboardPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="incidents/:id" element={<IncidentDetailsPage />} />
                <Route path="report" element={<ReportIncidentPage />} />
                <Route path="map" element={<LiveMapPage />} />
                <Route path="tactical-3d" element={<Tactical3DPage />} />
                <Route path="resources" element={<ResourcesPage />} />
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
      </AuthProvider>
    </BrowserRouter>
  );
}
