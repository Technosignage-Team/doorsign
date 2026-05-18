import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getBaseUrl, setHostUrl, loadHostUrl } from '../lib/hostUrl';
import { getActivationKey, setActivationKey } from '../lib/activationKey';
import { getLicense } from '../lib/license';
import { doorSignFetch } from '../lib/doorSignFetch';
import LoginView from './LoginView';

const INACTIVATE_API = 'https://sw-subscription-1.onrender.com/api/license/inactivate';

interface ConfigurationViewProps {
  onBack: () => void;
  onConnectionChanged: (resourceData: any) => void;
  onUnlinked?: () => void;
}

const ConfigurationView: React.FC<ConfigurationViewProps> = ({ onBack, onConnectionChanged, onUnlinked }) => {
  const [hostInput, setHostInput] = useState('');
  const [editingHost, setEditingHost] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [hostSaving, setHostSaving] = useState(false);
  const [hostSaved, setHostSaved] = useState(false);

  const [keyInput, setKeyInput] = useState('');
  const [editingKey, setEditingKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySaving, setKeySaving] = useState(false);
  const [keyMasked, setKeyMasked] = useState('');

  // Unlink flow: idle → auth → confirm → (unlinking)
  type UnlinkStage = 'idle' | 'auth' | 'confirm' | 'done';
  const [unlinkStage, setUnlinkStage] = useState<UnlinkStage>('idle');
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  const resetUnlink = () => {
    setUnlinkStage('idle');
    setUnlinkError(null);
  };

  useEffect(() => {
    loadHostUrl().then(url => setHostInput(url));
    getActivationKey().then(k => {
      if (k) setKeyMasked(k.length > 8 ? k.slice(0, 4) + '••••' + k.slice(-4) : '••••••••');
      else setKeyMasked('Not configured');
    });
  }, []);

  const saveHost = async () => {
    const trimmed = hostInput.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setHostError('Must start with http:// or https://');
      return;
    }
    setHostSaving(true);
    setHostError(null);
    await setHostUrl(trimmed);
    setHostInput(trimmed);
    setEditingHost(false);
    setHostSaving(false);
    setHostSaved(true);
    setTimeout(() => setHostSaved(false), 3000);
  };

  const saveKey = async () => {
    const key = keyInput.trim();
    if (!key) return;
    setKeySaving(true);
    setKeyError(null);
    try {
      const res = await doorSignFetch(`${getBaseUrl()}/api/digitalsigns/activate/${key}`);
      if (!res.ok) throw new Error();
      const resourceData = await res.json();
      await setActivationKey(key);
      setKeyMasked(key.length > 8 ? key.slice(0, 4) + '••••' + key.slice(-4) : '••••••••');
      setKeyInput('');
      setEditingKey(false);
      onConnectionChanged(resourceData);
    } catch {
      setKeyError('Invalid activation key. Please check and try again.');
    } finally {
      setKeySaving(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    setUnlinkError(null);
    try {
      const licence = await getLicense();
      if (!licence?.licenseKey) throw new Error('NO_KEY');

      const body = { licenseKey: licence.licenseKey };

      if (Capacitor.isNativePlatform()) {
        await CapacitorHttp.post({
          url: INACTIVATE_API,
          headers: { 'Content-Type': 'application/json' },
          data: body,
        });
      } else {
        await fetch(INACTIVATE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      // Clear all stored setup data
      await Promise.all([
        Preferences.remove({ key: 'sw_license' }),
        Preferences.remove({ key: 'activation_key' }),
        Preferences.remove({ key: 'host_url' }),
      ]);

      setUnlinkStage('done');
      setTimeout(() => onUnlinked?.(), 2000);
    } catch (err) {
      setUnlinkError('Failed to unlink. Please try again.');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <>
    {/* Auth overlay — full LoginView */}
    {unlinkStage === 'auth' && (
      <div className="fixed inset-0 z-[200]">
        <LoginView
          onBack={resetUnlink}
          onLogin={(user) => {
            const role = (user.role ?? '').toLowerCase().trim();
            const isAdmin = role === 'admin' || role === 'administrator' || role.includes('admin');
            if (!isAdmin) {
              setUnlinkError('Access denied. Only administrators can unlink a sign.');
              setUnlinkStage('idle');
              return;
            }
            setUnlinkStage('confirm');
          }}
        />
      </div>
    )}

    {/* Confirm overlay */}
    {unlinkStage === 'confirm' && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center px-6 bg-black/80 backdrop-blur-xl">
        <div className="w-full max-w-sm bg-[#0d1117] border border-red-500/20 rounded-3xl p-7 flex flex-col gap-6 shadow-2xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-400" style={{ fontSize: '32px' }}>link_off</span>
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Unlink This Sign?</h2>
              <p className="text-slate-400 text-xs mt-1">This action requires confirmation</p>
            </div>
          </div>
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/15">
            <span className="material-symbols-outlined text-red-400 flex-shrink-0 mt-0.5" style={{ fontSize: '14px' }}>warning</span>
            <p className="text-red-300/80 text-xs leading-relaxed">
              This will release the licence and return the sign to the setup wizard. You will need to re-enter all details to use it again.
            </p>
          </div>
          {unlinkError && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/8 border border-red-500/15 px-3 py-2.5 rounded-xl">
              <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px' }}>error</span>
              {unlinkError}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={resetUnlink}
              disabled={unlinking}
              className="flex-1 py-4 rounded-2xl font-black text-sm border border-white/10 text-slate-400 hover:bg-white/5 active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="flex-[2] py-4 rounded-2xl font-black text-sm bg-red-500 text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {unlinking
                ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span> Unlinking…</>
                : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>link_off</span> Confirm Unlink</>}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Done overlay */}
    {unlinkStage === 'done' && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center px-6 bg-black/80 backdrop-blur-xl">
        <div className="w-full max-w-sm bg-[#0d1117] border border-status-available/20 rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-status-available/10 border border-status-available/25 flex items-center justify-center">
            <span className="material-symbols-outlined text-status-available" style={{ fontSize: '32px' }}>check_circle</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Sign Unlinked</h2>
            <p className="text-slate-400 text-sm mt-1">Returning to setup wizard…</p>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-status-available rounded-full animate-[grow_2s_linear_forwards]" style={{ width: '100%', transformOrigin: 'left', animation: 'none', transition: 'none' }} />
          </div>
        </div>
      </div>
    )}
    <div className="flex flex-col h-full overflow-hidden bg-background-dark text-white">

      {/* Header — same style as DetailsView */}
      <div className="flex items-center bg-background-dark/95 backdrop-blur-xl p-6 border-b border-white/5 shrink-0">
        <button
          onClick={onBack}
          className="text-white flex size-12 items-center justify-center hover:bg-white/5 rounded-xl transition-all"
        >
          <span className="material-symbols-outlined text-3xl">arrow_back</span>
        </button>
        <div className="flex flex-col flex-1 text-center">
          <h2 className="text-2xl font-black tracking-tighter uppercase text-white">Configuration</h2>
          <p className="text-[9px] font-black text-primary tracking-[0.4em] uppercase mt-1">Connection & Activation</p>
        </div>
        <div className="size-12" />
      </div>

      {/* Body */}
      <main className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-8 lg:p-12 pb-24">
        <div className="w-full max-w-2xl tablet:max-w-3xl mx-auto flex flex-col gap-8">

          {/* ── Host URL ── */}
          <section>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 px-1">
              Server Connection
            </p>
            <div className="bg-card-dark rounded-2xl border border-white/8 overflow-hidden">

              {/* Row header */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5">
                <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>dns</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-black text-sm">Host URL</p>
                  <p className="text-slate-500 text-xs mt-0.5 font-mono truncate">
                    {hostInput || '—'}
                  </p>
                </div>
                {!editingHost && (
                  <button
                    onClick={() => { setEditingHost(true); setHostError(null); setHostSaved(false); }}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-black text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl hover:bg-primary/20 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                    Edit
                  </button>
                )}
                {hostSaved && !editingHost && (
                  <div className="shrink-0 flex items-center gap-1 text-xs font-black text-status-available">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                    Saved
                  </div>
                )}
              </div>

              {/* Edit form */}
              {editingHost && (
                <div className="px-6 py-5 flex flex-col gap-4 bg-black/20">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      New Host URL
                    </label>
                    <input
                      type="url"
                      value={hostInput}
                      onChange={e => { setHostInput(e.target.value); setHostError(null); }}
                      className="w-full px-4 py-3.5 rounded-xl bg-[#0d1117] border border-white/10 text-white font-mono text-sm outline-none focus:border-primary transition-colors placeholder-slate-600"
                      style={{ colorScheme: 'dark' }}
                      placeholder="https://your-server.com"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <p className="text-[11px] text-slate-600">
                      e.g. <span className="font-mono text-slate-500">https://192.168.1.100</span> or <span className="font-mono text-slate-500">https://asas.company.com</span>
                    </p>
                  </div>
                  {hostError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/8 border border-red-500/15 px-4 py-3 rounded-xl">
                      <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px' }}>error</span>
                      {hostError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setEditingHost(false); setHostError(null); loadHostUrl().then(u => setHostInput(u)); }}
                      className="flex-1 py-3.5 rounded-xl font-black text-sm border border-white/10 text-slate-400 hover:bg-white/5 active:scale-[0.98] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveHost}
                      disabled={hostSaving}
                      className="flex-[2] py-3.5 rounded-xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {hostSaving
                        ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>progress_activity</span> Saving…</>
                        : <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span> Save</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Activation Key ── */}
          <section>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 px-1">
              Display Activation
            </p>
            <div className="bg-card-dark rounded-2xl border border-white/8 overflow-hidden">

              {/* Row header */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5">
                <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>vpn_key</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-black text-sm">Activation Key</p>
                  <p className="text-slate-500 text-xs mt-0.5 font-mono tracking-widest">{keyMasked}</p>
                </div>
                {!editingKey && (
                  <button
                    onClick={() => { setEditingKey(true); setKeyInput(''); setKeyError(null); }}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-black text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl hover:bg-primary/20 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                    Change
                  </button>
                )}
              </div>

              {/* Edit form */}
              {editingKey && (
                <div className="px-6 py-5 flex flex-col gap-4 bg-black/20">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      New Activation Key
                    </label>
                    <input
                      type="text"
                      value={keyInput}
                      onChange={e => { setKeyInput(e.target.value); setKeyError(null); }}
                      className="w-full px-4 py-3.5 rounded-xl bg-[#0d1117] border border-white/10 text-white font-mono text-sm outline-none focus:border-primary transition-colors placeholder-slate-600 tracking-widest"
                      style={{ colorScheme: 'dark' }}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <p className="text-[11px] text-slate-600">
                      Key is validated against the server before saving. The display will reload with the new sign data.
                    </p>
                  </div>
                  {keyError && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/8 border border-red-500/15 px-4 py-3 rounded-xl">
                      <span className="material-symbols-outlined shrink-0" style={{ fontSize: '16px' }}>error</span>
                      {keyError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setEditingKey(false); setKeyError(null); }}
                      className="flex-1 py-3.5 rounded-xl font-black text-sm border border-white/10 text-slate-400 hover:bg-white/5 active:scale-[0.98] transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveKey}
                      disabled={keySaving || !keyInput.trim()}
                      className="flex-[2] py-3.5 rounded-xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {keySaving
                        ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>progress_activity</span> Validating…</>
                        : <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span> Validate & Save</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Info note */}
          <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-white/3 border border-white/6">
            <span className="material-symbols-outlined text-slate-500 shrink-0 mt-0.5" style={{ fontSize: '18px' }}>info</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              Changing the activation key reloads the room data immediately. A new host URL takes effect on the next API call — no restart required.
            </p>
          </div>

          {/* ── Unlink Sign ── */}
          <section>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 px-1">
              Danger Zone
            </p>
            <div className="bg-[#0d1117] border border-red-500/15 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-red-400" style={{ fontSize: '16px' }}>link_off</span>
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">Unlink This Sign</p>
                    <p className="text-slate-500 text-[11px]">Release the licence and reset to setup wizard</p>
                  </div>
                </div>

                {/* Unlink button — always visible, overlays handle the rest */}
                <button
                  onClick={() => { setUnlinkError(null); setUnlinkStage('auth'); }}
                  className="w-full py-3.5 rounded-xl font-black text-sm border border-red-500/25 text-red-400 hover:bg-red-500/8 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>link_off</span>
                  Unlink Sign
                </button>
                {unlinkError && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/8 border border-red-500/15 px-3 py-2.5 rounded-xl">
                    <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px' }}>error</span>
                    {unlinkError}
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </main>
    </div>
    </>
  );
};

export default ConfigurationView;
