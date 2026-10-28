import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Radio, AlertCircle, UserPlus, ArrowRight } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password, organization, 'reporter');
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient tactical glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-8 pb-6 text-center border-b border-slate-800/80 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-md" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-emerald-400/30 text-white">
              <UserPlus className="w-7 h-7" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono tracking-wider uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Citizen Incident Intake
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white">
            Register Reporter Account
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Direct Public Incident Telemetry Submissions
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition font-sans"
                placeholder="Jane Citizen"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition font-mono"
                placeholder="jane@metro.org"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Account Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition font-mono"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                Community / Neighborhood (Optional)
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition font-sans"
                placeholder="Metro Neighborhood Watch"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold text-xs tracking-wider uppercase font-mono rounded-xl shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{isSubmitting ? 'Registering...' : 'Complete Reporter Registration'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-400">
            Already have access?{' '}
            <Link to="/splash" className="text-cyan-400 font-semibold hover:underline">
              Enter Command Splash
            </Link>
          </div>
        </div>

        {/* Tactical Footer Disclaimer */}
        <div className="bg-slate-950/90 px-6 py-3 border-t border-slate-800/80 text-center text-[10px] text-slate-400 font-mono">
          OFFICIAL CITIZEN REPORTING PORTAL • VERIFIED DISPATCH PROTOCOL
        </div>
      </div>
    </div>
  );
};
