import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { SplashPage } from './pages/SplashPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportIncidentPage } from './pages/ReportIncidentPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailsPage } from './pages/IncidentDetailsPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { AdminAuditPage } from './pages/AdminAuditPage';
import { Tactical3DPage } from './pages/Tactical3DPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRoles?: string[] }> = ({
  children,
  requiredRoles
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#111827] text-slate-300 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500 animate-ping" />
          <span>INITIALIZING DISPATCH CONSOLE...</span>
        </div>
      </div>
    );
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
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
