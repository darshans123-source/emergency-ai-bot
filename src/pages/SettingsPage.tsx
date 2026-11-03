import { useLanguage } from '../i18n/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, User, ShieldAlert, Trash2, Volume2, MapPin, Mic, KeyRound } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getAiSource, setAiSource, type AiSource } from '../demo/aiSource';
import { api } from '../services/api';
import { dispatchReplayWelcome, isWelcomeVoiceEnabled, setWelcomeVoiceEnabled } from '../demo/welcomeVoice';
import { getLaunchPermissions, requestLaunchPermissions, type LaunchPermissions as LaunchPerms } from '../demo/launchPermissions';
import { locationService } from '../services/locationService';
import { useAuth } from '../context/AuthContext';
import { deleteProfile } from '../services/localProfile';

export const SettingsPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { localProfile, localProfiles, user, logout, logoutLocal, refreshLocalProfiles } = useAuth();
  const [voiceOn, setVoiceOn] = useState<boolean>(() => isWelcomeVoiceEnabled());
  const [permStatus, setPermStatus] = useState<LaunchPerms | null>(() => getLaunchPermissions());
  const [savedLoc, setSavedLoc] = useState(() => {
    try { return locationService.getConfirmedLocation(); } catch { return null; }
  });
  const [permChecking, setPermChecking] = useState(false);
  // AI API Configuration — server status only. No key is ever stored here:
  // the key lives only in the server environment. The optional test key
  // below is used for ONE test call and then cleared from this page.
  const [aiSource, setAiSourceState] = useState<AiSource>(() => getAiSource());
  const [aiStatus, setAiStatus] = useState<{ provider: string; model: string; isExternalConfigured: boolean; status: string; message: string } | null>(null);
  const [aiStatusError, setAiStatusError] = useState<string | null>(null);
  const [testKey, setTestKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  useEffect(() => {
    api.getAIStatus()
      .then((st) => setAiStatus(st))
      .catch((e: any) => setAiStatusError(e?.message || 'Server status unavailable.'));
  }, []);
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const testProvider = aiStatus && (aiStatus.provider === 'openrouter' || aiStatus.provider === 'freeai') ? aiStatus.provider : undefined;
      const res = await api.testFreeAI(testKey.trim() || undefined, testProvider);
      setTestResult(`Connection works: ${res.provider}, model ${res.model}. ${res.testedWithProvidedKey ? 'This key was NOT saved — paste it in the server environment (below) and redeploy to actually use it.' : 'The server environment key works.'}`);
    } catch (e: any) {
      setTestResult(`Connection failed: ${e?.message || 'Unknown error.'} No key was saved.`);
    } finally {
      setTestKey('');
      setTesting(false);
    }
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

  const handleDeleteProfile = () => {
    if (!localProfile) return;
    if (!window.confirm(`Delete the local profile "${localProfile.name}" from this device? This cannot be undone.`)) return;
    deleteProfile(localProfile.id);
    refreshLocalProfiles();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-[20px] border border-slate-200 shadow-sm">
        <h1 className="text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#2563EB]" /> {t('pages.settings_title')}
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Your profile, session and connection — nothing here is stored on a server by this page.
        </p>
      </div>

      <section className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-6">
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
            <dt className="text-[#64748B]">AI engine</dt>
            <dd className="font-semibold text-[#172033] text-right">Local engine ready</dd>
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

      <section className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-[#172033] flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#2563EB]" /> Location &amp; microphone
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          When you open AegisAI, it asks for your device location and microphone permission.
          Location is used for the Live Map, the Report form and nearby demo facilities;
          the microphone is used for voice input and Mitra AI. Location is stored only in
          this browser session (1 hour) and the microphone is never recorded by this check —
          the permission stream is stopped immediately.
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#64748B]">Location permission</dt>
            <dd className="font-semibold text-[#172033] text-right">{permStatus?.location || 'Not checked yet'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#64748B]">Microphone permission</dt>
            <dd className="font-semibold text-[#172033] text-right">{permStatus?.mic || 'Not checked yet'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#64748B]">Saved location</dt>
            <dd className="font-semibold text-[#172033] text-right">{savedLoc ? `${savedLoc.coordinates.latitude.toFixed(5)}, ${savedLoc.coordinates.longitude.toFixed(5)}` : '—'}</dd>
          </div>
          {savedLoc?.address && (
            <div className="flex justify-between gap-4">
              <dt className="text-[#64748B]">Saved address</dt>
              <dd className="font-semibold text-[#172033] text-right">{savedLoc.address}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={permChecking}
            onClick={async () => {
              setPermChecking(true);
              try {
                const res = await requestLaunchPermissions();
                setPermStatus(res);
                try { setSavedLoc(locationService.getConfirmedLocation()); } catch { /* ignore */ }
              } finally { setPermChecking(false); }
            }}
            className="min-h-11 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2 disabled:opacity-50"
          >
            <MapPin className="w-4 h-4" /> <Mic className="w-4 h-4" /> {permChecking ? 'Checking…' : 'Detect location & microphone again'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/map')}
            className="min-h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#172033] hover:bg-slate-50"
          >
            Open Live Map
          </button>
        </div>
        <p className="mt-3 text-xs text-[#64748B]">
          If you denied a permission, your browser may not ask again — use your browser&apos;s
          site settings (lock icon in the address bar) to allow it, then tap the button above.
        </p>
      </section>

      <section className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-[#172033] flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-[#2563EB]" /> Welcome voice
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          A short greeting plays once per browser session when you open AegisAI, in your selected
          language (English, Kannada, Hindi or Telugu). It uses only your browser&apos;s built-in
          speech — no API keys, no external service, no server. It never interrupts Mitra AI or
          agent voice chat.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { const next = !voiceOn; setVoiceOn(next); setWelcomeVoiceEnabled(next); }}
            className={`min-h-11 px-4 rounded-xl text-sm font-semibold transition ${voiceOn ? 'bg-[#2563EB] text-white hover:bg-blue-700' : 'border border-slate-300 bg-white text-[#172033] hover:bg-slate-50'}`}
            aria-pressed={voiceOn}
          >
            Welcome voice: {voiceOn ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => dispatchReplayWelcome()}
            className="min-h-11 px-4 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#172033] hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <Volume2 className="w-4 h-4" /> Hear welcome greeting
          </button>
        </div>
        <p className="mt-3 text-xs text-[#64748B]">
          When OFF, the greeting won&apos;t play automatically on launch. You can still tap
          &ldquo;Hear welcome greeting&rdquo; or the speaker button in the top bar to replay it.
        </p>
      </section>

      <section className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-[#172033] flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-[#2563EB]" /> AI API Configuration
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
          Free.ai is connected through the backend only. The key is never stored in this browser,
          in frontend code, in logs or in GitHub. This page only shows the server&apos;s status and
          can test a key once — it cannot save a key. Saving happens in the server environment
          (see below), then the app is redeployed.
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[#64748B]">Server AI provider</dt>
            <dd className="font-semibold text-[#172033] text-right">{aiStatus ? `${aiStatus.provider} · ${aiStatus.model}` : aiStatusError || 'Checking…'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#64748B]">External AI configured on server</dt>
            <dd className="font-semibold text-[#172033] text-right">{aiStatus ? (aiStatus.isExternalConfigured ? 'Yes' : 'No') : '—'}</dd>
          </div>
          {aiStatus && (
            <div className="flex justify-between gap-4">
              <dt className="text-[#64748B]">Server message</dt>
              <dd className="font-semibold text-[#172033] text-right">{aiStatus.message}</dd>
            </div>
          )}
        </dl>
        <div className="mt-5">
          <label className="block text-sm font-semibold text-[#172033]" htmlFor="freeai-test-key">
            Test an AI key (optional, not saved)
          </label>
          <input
            id="freeai-test-key"
            type="password"
            autoComplete="off"
            value={testKey}
            onChange={(e) => setTestKey(e.target.value)}
            placeholder="Leave empty to test the server key, or paste a key here only to test it (tested against the active provider above)"
            className="mt-2 w-full min-h-12 px-3.5 rounded-xl border border-slate-300 bg-white text-sm text-[#172033] focus:outline-none focus:border-[#2563EB]"
          />
          <p className="mt-1.5 text-xs text-[#64748B]">
            A key typed here is sent once to the server for a test call, then cleared from this
            page. It is never stored in this browser, never logged, and never committed.
          </p>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="mt-3 min-h-11 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
          {testResult && (<p className="mt-3 text-sm text-[#172033] leading-relaxed">{testResult}</p>)}
        </div>
        <div className="mt-5">
          <p className="text-sm font-semibold text-[#172033]">Preferred AI source for Mitra and the four agents</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setAiSource('local'); setAiSourceState('local'); }} className={`min-h-11 px-4 rounded-xl border text-sm font-semibold ${aiSource === 'local' ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-[#172033] border-slate-300 hover:bg-slate-50'}`}>Local engine</button>
            <button type="button" onClick={() => { setAiSource('freeai'); setAiSourceState('freeai'); }} className={`min-h-11 px-4 rounded-xl border text-sm font-semibold ${aiSource === 'freeai' ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-[#172033] border-slate-300 hover:bg-slate-50'}`}>Free.ai (via backend)</button>
            <button type="button" onClick={() => { setAiSource('openrouter'); setAiSourceState('openrouter'); }} className={`min-h-11 px-4 rounded-xl border text-sm font-semibold ${aiSource === 'openrouter' ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-[#172033] border-slate-300 hover:bg-slate-50'}`}>OpenRouter (via backend)</button>
          </div>
          <p className="mt-1.5 text-xs text-[#64748B]">Local engine works with no key and answers instantly. Free.ai / OpenRouter are used only when the matching server key is set; otherwise chats fall back to the local engine. If you have never picked a source, the app adopts the server&apos;s active provider automatically.</p>
        </div>
        <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm leading-relaxed text-[#172033]">
          <p className="font-bold">Where to paste your actual Free.ai key</p>
          <p className="mt-2"><span className="font-semibold">On Vercel (live site) — OpenRouter:</span> Vercel dashboard → project <span className="font-mono text-xs">emergency-ai-bot</span> → Settings → Environment Variables → Add New → Name <span className="font-mono text-xs">OPENROUTER_API_KEY</span>, Value = your OpenRouter key, Environment = Production (tick Preview too if you want previews) → Save → Deployments → Redeploy the latest deployment. Optional: <span className="font-mono text-xs">OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free</span> (default free model, verified against the live OpenRouter models list on 2026-11-03; free models rotate, so change this if OpenRouter reports it as not found) and <span className="font-mono text-xs">OPENROUTER_BASE_URL=https://openrouter.ai/api/v1</span> (default).</p>
          <p className="mt-2"><span className="font-semibold">On Vercel (live site) — Free.ai:</span> same steps, Name <span className="font-mono text-xs">FREE_AI_API_KEY</span>, Value = your fresh Free.ai key, Environment = Production. Optional: <span className="font-mono text-xs">FREE_AI_MODEL=qwen7b</span> (default) and <span className="font-mono text-xs">FREE_AI_API_URL=https://api.free.ai</span> (default). When both keys are set, OpenRouter is used first.</p>
          <p className="mt-2"><span className="font-semibold">Locally:</span> in your copy of the repo, create <span className="font-mono text-xs">.env</span> at the repo root (same folder as <span className="font-mono text-xs">server.ts</span>) and add the line <span className="font-mono text-xs">OPENROUTER_API_KEY=your-openrouter-key</span> (and/or <span className="font-mono text-xs">FREE_AI_API_KEY=your-fresh-key</span>). That file is gitignored and is never committed — do not copy it into <span className="font-mono text-xs">.env.example</span>, which must keep only placeholders.</p>
          <p className="mt-2 text-amber-800"><span className="font-semibold">Security:</span> never paste a real key in chat, in this Settings box to &quot;save&quot; it, or in any file you commit. A key shared in chat must be treated as exposed: generate a fresh key in Free.ai and delete the shared one.</p>
        </div>
      </section>

      <section className="bg-amber-50 border border-amber-200 rounded-[20px] p-6">
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
