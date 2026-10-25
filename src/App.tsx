import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReportIncidentPage } from './pages/ReportIncidentPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailsPage } from './pages/IncidentDetailsPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { AgentControlCenterPage } from './pages/AgentControlCenterPage';
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
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
          <span>INITIALIZING DISPATCH CONSOLE...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="incidents" element={<IncidentsPage />} />
              <Route path="incidents/:id" element={<IncidentDetailsPage />} />
              <Route path="report" element={<ReportIncidentPage />} />
              <Route path="map" element={<LiveMapPage />} />
              <Route path="tactical-3d" element={<Tactical3DPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="agents" element={<AgentControlCenterPage />} />
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
