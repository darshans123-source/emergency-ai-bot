import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, User, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { deleteProfile } from '../services/localProfile';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { localProfile, localProfiles, user, logout, logoutLocal, refreshLocalProfiles } = useAuth();
  const { isConnected, wsStatus } = useNotifications();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // best-effort
    }
    logoutLocal();
    navigate('/login', { replace: true });
  };

  const handleDeleteProfile = () => {
    if (!localProfile) return;
    if (!window.confirm(`Delete the local profile "${localProfile.name}" from this device? This cannot be undone.`)) return;
    deleteProfile(localProfile.id);
    refreshLocalProfiles();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#2563EB]" /> Settings
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Your profile, session and connection — nothing here is stored on a server by this page.
        </p>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-[#172033] flex items-center gap-2">
          <User className="w-5 h-5 text-[#2563EB]" /> Profile
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#64748B]">Display name</dt>
            <dd className="font-semibold text-[#172033] text-right">{localProfile?.name || user?.name || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#64748B]">Profile type</dt>
            <dd className="font-semibold text-[#172033] text-right">
              {localProfile ? 'Local prototype profile (this browser)' : 'Backend session'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#64748B]">Saved profiles on this device</dt>
            <dd className="font-semibold text-[#172033] text-right">{localProfiles.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#64748B]">Live link</dt>
            <dd className="font-semibold text-[#172033] text-right">
              {isConnected ? 'Connected' : wsStatus === 'unavailable' ? 'Unavailable' : 'Reconnecting…'}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { logoutLocal(); navigate('/login', { replace: true }); }}
            className="min-h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#172033] hover:bg-slate-50"
          >
            Switch profile
          </button>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="min-h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#172033] hover:bg-slate-50"
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-11 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
        <p className="mt-3 text-xs text-[#64748B]">
          Switch profile returns you to the login screen, where you can pick a saved profile or create
          a new one. Your PIN is never shown here.
        </p>
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <h2 className="font-bold text-amber-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" /> Prototype login — important
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-800">
          This login is stored only in this browser, with the PIN kept as a salted hash — never in
          plain text. It is still not secure against device access or browser storage inspection,
          and a 4-digit PIN can be brute-forced. Do not use it to protect real emergency or
          administrative operations. Real operations must use backend authentication.
        </p>
        {localProfile && (
          <button
            type="button"
            onClick={handleDeleteProfile}
            className="mt-4 min-h-11 px-4 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete this local profile
          </button>
        )}
      </section>
    </div>
  );
};
