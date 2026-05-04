import React, { useState } from 'react';
import { setHostUrl, getBaseUrl } from '../lib/hostUrl';
import { setActivationKey } from '../lib/activationKey';
import { doorSignFetch } from '../lib/doorSignFetch';

interface SetupWizardProps {
  onComplete: (resourceData: any) => void;
}

type Step = 'welcome' | 'host' | 'activate';
const STEPS: Step[] = ['welcome', 'host', 'activate'];
const STEP_INDEX: Record<Step, number> = { welcome: 0, host: 1, activate: 2 };

const Logo: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'sm' }) => {
  const isLg = size === 'lg';
  return (
    <div className={`flex items-center gap-3 ${isLg ? 'flex-col' : ''}`}>
      <div className={`${isLg ? 'w-20 h-20 rounded-2xl text-3xl' : 'w-10 h-10 rounded-xl text-base'} bg-primary flex items-center justify-center shadow-lg shadow-primary/40 font-black text-white select-none tracking-tight flex-shrink-0`}>
        SW
      </div>
      <div className={isLg ? 'text-center' : ''}>
        <p className={`font-black text-white leading-none ${isLg ? 'text-3xl mt-2' : 'text-base'}`}>Sharewinds</p>
        {isLg && <p className="text-slate-400 text-sm mt-1.5 font-medium">Door Sign Management System</p>}
      </div>
    </div>
  );
};

const StepBar: React.FC<{ current: Step }> = ({ current }) => {
  const idx = STEP_INDEX[current];
  const labels = ['Welcome', 'Connection', 'Activate'];
  return (
    <div className="flex items-center w-full gap-0">
      {[0, 1, 2].map(i => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-300
                ${done ? 'bg-primary border-primary text-white' : active ? 'bg-primary/15 border-primary text-primary' : 'bg-white/5 border-white/15 text-slate-500'}`}>
                {done
                  ? <span className="material-symbols-outlined text-sm" style={{ fontSize: '16px' }}>check</span>
                  : i + 1}
              </div>
              <span className={`text-[10px] font-bold tracking-wide ${active ? 'text-primary' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                {labels[i]}
              </span>
            </div>
            {i < 2 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all duration-500 ${i < idx ? 'bg-primary' : 'bg-white/10'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('welcome');
  const [hostUrl, setHostUrlLocal] = useState('');
  const [activationKey, setActivationKeyLocal] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = hostUrl.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }
    await setHostUrl(trimmed);
    setStep('activate');
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const key = activationKey.trim();
      const res = await doorSignFetch(`${getBaseUrl()}/api/digitalsigns/activate/${key}`);
      if (!res.ok) throw new Error('Invalid key');
      await setActivationKey(key);
      const resourceData = await res.json();
      onComplete(resourceData);
    } catch {
      setError('Invalid activation key. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const glow = (
    <>
      <div className="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary/8 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-primary/8 blur-[140px] rounded-full pointer-events-none" />
    </>
  );

  // ── WELCOME ──────────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
        {glow}
        <div className="relative flex flex-col items-center w-full max-w-sm">

          {/* Card */}
          <div className="w-full bg-[#0d1117] border border-white/8 rounded-3xl p-8 flex flex-col items-center gap-7 shadow-2xl">
            <Logo size="lg" />

            <div className="w-full h-px bg-white/8" />

            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-slate-300 text-sm leading-relaxed">
                Welcome to the Sharewinds Door Sign setup.<br />
                This will take less than a minute.
              </p>
            </div>

            <div className="w-full">
              <StepBar current="welcome" />
            </div>

            <button
              onClick={() => setStep('host')}
              className="w-full bg-primary text-white font-black py-4 rounded-2xl text-base shadow-xl shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Get Started
              <span className="material-symbols-outlined text-xl" style={{ fontSize: '20px' }}>arrow_forward</span>
            </button>
          </div>

          <p className="text-slate-600 text-xs text-center mt-5">
            Powered by Sharewinds © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    );
  }

  // ── HOST URL ─────────────────────────────────────────────────────────────
  if (step === 'host') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
        {glow}
        <div className="relative w-full max-w-sm">

          {/* Top logo strip */}
          <div className="flex items-center justify-between mb-5 px-1">
            <Logo size="sm" />
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Setup</span>
          </div>

          {/* Card */}
          <form onSubmit={handleHostSubmit} className="w-full bg-[#0d1117] border border-white/8 rounded-3xl p-7 flex flex-col gap-6 shadow-2xl">

            {/* Step bar */}
            <StepBar current="host" />

            {/* Section header */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>dns</span>
              </div>
              <div>
                <h2 className="text-lg font-black leading-tight">Connection Setup</h2>
                <p className="text-slate-500 text-xs mt-0.5">Your ASAS Connect address</p>
              </div>
            </div>

            <div className="w-full h-px bg-white/6" />

            {/* Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">
                Host URL or IP Address
              </label>
              <input
                type="url"
                value={hostUrl}
                onChange={e => { setHostUrlLocal(e.target.value); setError(null); }}
                className="w-full p-4 rounded-xl bg-[#111518] border border-white/12 text-white font-mono text-sm outline-none focus:border-primary transition-colors placeholder-slate-600"
                style={{ colorScheme: 'dark' }}
                placeholder="https://your-server.com"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
              />
              <div className="flex flex-col gap-1 mt-0.5">
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  e.g. <span className="text-slate-500 font-mono">https://192.168.1.100</span>
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  or &nbsp;<span className="text-slate-500 font-mono">https://asas.mycompany.com</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/8 border border-red-500/15 px-4 py-3 rounded-xl">
                <span className="material-symbols-outlined text-base flex-shrink-0" style={{ fontSize: '18px' }}>error</span>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep('welcome'); setError(null); }}
                className="flex-1 py-3.5 rounded-xl font-black text-sm border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white active:scale-[0.98] transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-[2] py-3.5 rounded-xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Next
                <span className="material-symbols-outlined text-base" style={{ fontSize: '18px' }}>arrow_forward</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ── ACTIVATE ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
      {glow}
      <div className="relative w-full max-w-sm">

        {/* Top logo strip */}
        <div className="flex items-center justify-between mb-5 px-1">
          <Logo size="sm" />
          <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Setup</span>
        </div>

        {/* Card */}
        <form onSubmit={handleActivate} className="w-full bg-[#0d1117] border border-white/8 rounded-3xl p-7 flex flex-col gap-6 shadow-2xl">

          {/* Step bar */}
          <StepBar current="activate" />

          {/* Section header */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>vpn_key</span>
            </div>
            <div>
              <h2 className="text-lg font-black leading-tight">Activate Display</h2>
              <p className="text-slate-500 text-xs mt-0.5">Enter your door sign activation key</p>
            </div>
          </div>

          <div className="w-full h-px bg-white/6" />

          {/* Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">
              Activation Key
            </label>
            <input
              type="text"
              value={activationKey}
              onChange={e => { setActivationKeyLocal(e.target.value); setError(null); }}
              className="w-full p-4 rounded-xl bg-[#111518] border border-white/12 text-white font-mono text-sm outline-none focus:border-primary transition-colors placeholder-slate-600 tracking-widest"
              style={{ colorScheme: 'dark' }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
            />
            <p className="text-[11px] text-slate-600 mt-0.5">
              Provided by your Sharewinds administrator
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/8 border border-red-500/15 px-4 py-3 rounded-xl">
              <span className="material-symbols-outlined text-base flex-shrink-0" style={{ fontSize: '18px' }}>error</span>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep('host'); setError(null); }}
              className="flex-1 py-3.5 rounded-xl font-black text-sm border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white active:scale-[0.98] transition-all"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !activationKey.trim()}
              className="flex-[2] py-3.5 rounded-xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading
                ? <><span className="material-symbols-outlined animate-spin text-base" style={{ fontSize: '18px' }}>progress_activity</span> Activating…</>
                : <><span className="material-symbols-outlined text-base" style={{ fontSize: '18px' }}>verified</span> Activate</>}
            </button>
          </div>
        </form>

        <p className="text-slate-600 text-xs text-center mt-5">
          Powered by Sharewinds © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default SetupWizard;
