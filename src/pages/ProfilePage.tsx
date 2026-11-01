import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ShieldAlert, Trash2, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deleteProfile } from '../services/localProfile';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { localProfile, localProfiles, user, logout, logoutLocal, renameLocal, changeLocalPin, refreshLocalProfiles } = useAuth();

  const [name, setName] = useState(localProfile?.name || user?.name || '');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!localProfile) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-xl font-bold text-[#172033]">No local profile</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          You are not signed in with a local profile. Go to login to create or pick a profile.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-4 min-h-11 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await renameLocal(name);
      setMessage('Profile name updated.');
    } catch (err: any) {
      setError(err?.message || 'Could not update the name.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);
    try {
      await changeLocalPin(oldPin, newPin, confirmPin);
      setMessage('PIN changed. Use the new PIN next time you log in.');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      setError(err?.message || 'Could not change the PIN.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete the local profile "${localProfile.name}" from this device? This cannot be undone.`)) return;
    deleteProfile(localProfile.id);
    refreshLocalProfiles();
    logoutLocal();
    navigate('/login', { replace: true });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // best-effort
    }
    logoutLocal();
    navigate('/login', { replace: true });
  };

  const pinInput = (value: string, onChange: (v: string) => void, id: string, placeholder: string) => (
    <input
      id={id}
      type="password"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
      placeholder={placeholder}
      className="w-full min-h-12 px-3.5 rounded-xl border border-slate-300 bg-white text-[#172033] placeholder-slate-400 tracking-[0.5em] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
    />
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-[#101B33] rounded-2xl p-6 sm:p-8 text-white shadow-sm flex items-center gap-4">
        <span className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
          <User className="w-8 h-8" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight truncate">{localProfile.name}</h1>
          <p className="text-sm text-slate-300 mt-1">Local prototype profile · created {new Date(localProfile.createdAt).toLocaleDateString()}</p>
          <p className="text-xs text-slate-400 mt-1">{localProfiles.length} profile(s) saved on this device</p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> {message}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-[#172033]">Edit profile</h2>
        <form onSubmit={handleSaveName} className="mt-4 space-y-3">
          <div>
            <label htmlFor="profileName" className="block text-sm font-medium text-[#172033] mb-1.5">Full Name</label>
            <input
              id="profileName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-12 px-3.5 rounded-xl border border-slate-300 bg-white text-[#172033] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button type="submit" disabled={saving} className="min-h-11 px-5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            Save Name
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-[#172033]">Change PIN</h2>
        <p className="mt-1 text-sm text-[#64748B]">Your PIN is never shown here and is stored only as a salted hash.</p>
        <form onSubmit={handleChangePin} className="mt-4 space-y-3">
          <div>
            <label htmlFor="oldPin" className="block text-sm font-medium text-[#172033] mb-1.5">Current PIN</label>
            {pinInput(oldPin, setOldPin, 'oldPin', '••••')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="newPin" className="block text-sm font-medium text-[#172033] mb-1.5">New PIN</label>
              {pinInput(newPin, setNewPin, 'newPin', '••••')}
            </div>
            <div>
              <label htmlFor="confirmPin" className="block text-sm font-medium text-[#172033] mb-1.5">Confirm New PIN</label>
              {pinInput(confirmPin, setConfirmPin, 'confirmPin', '••••')}
            </div>
          </div>
          <button type="submit" disabled={saving} className="min-h-11 px-5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            Change PIN
          </button>
        </form>
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <h2 className="font-bold text-amber-900 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Prototype login</h2>
        <p className="mt-2 text-sm leading-relaxed text-amber-800">
          This is local prototype authentication, not production-grade security. It does not protect
          real emergency or administrative operations, and it is not secure against device access or
          browser storage inspection.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={handleLogout} className="min-h-11 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold inline-flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </button>
          <button type="button" onClick={handleDelete} className="min-h-11 px-4 rounded-xl bg-[#E53935] text-white text-sm font-semibold hover:bg-red-700 inline-flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete this profile
          </button>
        </div>
      </section>
    </div>
  );
};
