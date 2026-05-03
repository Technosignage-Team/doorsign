import React, { useState } from 'react';
import { setHostUrl, getBaseUrl } from '../lib/hostUrl';
import { setActivationKey } from '../lib/activationKey';
import { doorSignFetch } from '../lib/doorSignFetch';

interface SetupWizardProps {
  onComplete: (resourceData: any) => void;
}

type Step = 'welcome' | 'host' | 'activate';

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

  const stepDots = (
    <div className="flex gap-2 mb-8">
      {(['welcome', 'host', 'activate'] as Step[]).map((s, i) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            step === s ? 'w-6 bg-primary' : i < ['welcome', 'host', 'activate'].indexOf(step) ? 'w-1.5 bg-primary/50' : 'w-1.5 bg-white/20'
          }`}
        />
      ))}
    </div>
  );

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative flex flex-col items-center gap-8 w-full max-w-sm">
          {/* Logo */}
          <div className="w-28 h-28 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/40">
            <span className="text-white font-black text-4xl tracking-tight select-none">SW</span>
          </div>

          {/* Brand text */}
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight">Sharewinds</h1>
            <p className="text-slate-400 font-medium mt-2 text-base">Door Sign Management System</p>
          </div>

          {stepDots}

          <button
            onClick={() => setStep('host')}
            className="w-full bg-primary text-white font-black py-5 rounded-2xl text-lg shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all"
          >
            Get Started
          </button>

          <p className="text-slate-600 text-xs text-center">
            Initial setup — takes less than a minute
          </p>
        </div>
      </div>
    );
  }

  if (step === 'host') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

        <form onSubmit={handleHostSubmit} className="relative w-full max-w-sm flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center gap-4 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">dns</span>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black">Server Setup</h2>
              <p className="text-slate-400 text-sm mt-1">Step 1 of 2 — Configure your server</p>
            </div>
          </div>

          {stepDots}

          {/* Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">
              Host URL or IP Address
            </label>
            <input
              type="url"
              value={hostUrl}
              onChange={e => { setHostUrlLocal(e.target.value); setError(null); }}
              className="p-4 rounded-xl bg-[#111518] border border-white/15 text-white font-mono text-sm outline-none focus:border-primary transition-colors placeholder-slate-600"
              style={{ colorScheme: 'dark' }}
              placeholder="https://your-server.com"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              required
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              e.g. <span className="text-slate-400 font-mono">https://192.168.1.100</span> or <span className="text-slate-400 font-mono">https://asas.mycompany.com</span>
            </p>
          </div>

          {error && (
            <div className="text-red-400 font-bold text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setStep('welcome'); setError(null); }}
              className="flex-1 py-4 rounded-xl font-black border border-white/10 text-slate-300 hover:bg-white/5 active:scale-95 transition-all"
            >
              Back
            </button>
            <button
              type="submit"
              className="flex-1 py-4 rounded-xl font-black bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    );
  }

  // step === 'activate'
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <form onSubmit={handleActivate} className="relative w-full max-w-sm flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-primary">vpn_key</span>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-black">Activate Display</h2>
            <p className="text-slate-400 text-sm mt-1">Step 2 of 2 — Enter your activation key</p>
          </div>
        </div>

        {stepDots}

        {/* Input */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">
            Activation Key
          </label>
          <input
            type="text"
            value={activationKey}
            onChange={e => { setActivationKeyLocal(e.target.value); setError(null); }}
            className="p-4 rounded-xl bg-[#111518] border border-white/15 text-white font-mono text-sm outline-none focus:border-primary transition-colors placeholder-slate-600 tracking-widest"
            style={{ colorScheme: 'dark' }}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            required
          />
          <p className="text-[11px] text-slate-500">
            Provided by your Sharewinds administrator
          </p>
        </div>

        {error && (
          <div className="text-red-400 font-bold text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setStep('host'); setError(null); }}
            className="flex-1 py-4 rounded-xl font-black border border-white/10 text-slate-300 hover:bg-white/5 active:scale-95 transition-all"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={loading || !activationKey.trim()}
            className="flex-1 py-4 rounded-xl font-black bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
          >
            {loading ? 'Activating...' : 'Activate'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SetupWizard;
