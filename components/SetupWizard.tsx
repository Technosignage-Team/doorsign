import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';
import { setHostUrl, getBaseUrl } from '../lib/hostUrl';
import { setActivationKey } from '../lib/activationKey';
import { setLicense, getDeviceId, LicenseInfo } from '../lib/license';
import { doorSignFetch } from '../lib/doorSignFetch';

const SUBSCRIPTION_API_BASE = 'https://sw-subscription-1.onrender.com';
const LICENSE_API = `${SUBSCRIPTION_API_BASE}/api/license/activate`;

const OFFLINE_MSG = 'No internet connection. Please check your network and try again.';
const SERVER_UNREACHABLE_MSG = 'Cannot reach the server. Check your internet connection and try again.';

function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return (
      m.includes('failed to resolve') ||
      m.includes('unable to resolve') ||
      m.includes('network') ||
      m.includes('unreachable') ||
      m.includes('connection refused') ||
      m.includes('name not resolved') ||
      m.includes('err_name') ||
      m.includes('no address') ||
      m.includes('could not connect') ||
      m.includes('hostname') ||
      m.includes('host lookup') ||
      m.includes('enotfound') ||
      m.includes('econnrefused')
    );
  }
  return false;
}

interface SetupWizardProps {
  onComplete: (resourceData: any) => void;
}

interface SignItem {
  id: string;
  name: string;
  activationKey: string;
  location?: string;
  [key: string]: unknown;
}

type Step = 'welcome' | 'host' | 'sign' | 'license';
type ConnStatus = 'idle' | 'testing' | 'ok' | 'fail';

const BAR_STEPS = ['host', 'sign', 'license'] as const;
const BAR_LABELS = ['Connection', 'Sign', 'Licence'];
const barIndex = (s: Step) => BAR_STEPS.indexOf(s as any);

// ── Shared ────────────────────────────────────────────────────────────────

const Logo: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'sm' }) => {
  const lg = size === 'lg';
  return (
    <div className={`flex items-center gap-3 ${lg ? 'flex-col' : ''}`}>
      <div className={`${lg ? 'w-20 h-20 rounded-2xl text-3xl' : 'w-10 h-10 rounded-xl text-base'} bg-primary flex items-center justify-center shadow-lg shadow-primary/40 font-black text-white select-none tracking-tight flex-shrink-0`}>
        SW
      </div>
      <div className={lg ? 'text-center' : ''}>
        <p className={`font-black text-white leading-none ${lg ? 'text-3xl mt-2' : 'text-base'}`}>Sharewinds</p>
        {lg && <p className="text-slate-400 text-sm mt-1.5 font-medium">Door Sign Management System</p>}
      </div>
    </div>
  );
};

const StepBar: React.FC<{ current: Step }> = ({ current }) => {
  const idx = barIndex(current);
  return (
    <div className="flex items-center w-full">
      {BAR_STEPS.map((_, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-300
              ${i < idx ? 'bg-primary border-primary text-white'
                : i === idx ? 'bg-primary/15 border-primary text-primary'
                : 'bg-white/5 border-white/15 text-slate-500'}`}>
              {i < idx
                ? <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
                : i + 1}
            </div>
            <span className={`text-[10px] font-bold tracking-wide ${i === idx ? 'text-primary' : i < idx ? 'text-slate-400' : 'text-slate-600'}`}>
              {BAR_LABELS[i]}
            </span>
          </div>
          {i < BAR_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all duration-500 ${i < idx ? 'bg-primary' : 'bg-white/10'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const Glow = () => (
  <>
    <div className="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary/8 blur-[140px] rounded-full pointer-events-none" />
    <div className="fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-primary/8 blur-[140px] rounded-full pointer-events-none" />
  </>
);

const ErrorBox: React.FC<{ msg: string }> = ({ msg }) => (
  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/8 border border-red-500/15 px-4 py-3 rounded-xl">
    <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '18px' }}>error</span>
    {msg}
  </div>
);

const TopBar: React.FC = () => (
  <div className="flex items-center justify-between mb-5 px-1">
    <Logo size="sm" />
    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Setup</span>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('welcome');

  // Host
  const [hostInput, setHostInput] = useState('');
  const [connStatus, setConnStatus] = useState<ConnStatus>('idle');
  const [hostError, setHostError] = useState<string | null>(null);

  // Sign picker
  const [tenantId, setTenantId] = useState('');
  const [signsLoading, setSignsLoading] = useState(false);
  const [signs, setSigns] = useState<SignItem[]>([]);
  const [signsError, setSignsError] = useState<string | null>(null);
  const [selectedSign, setSelectedSign] = useState<SignItem | null>(null);

  // Licence
  const [licenceInput, setLicenceInput] = useState('');
  const [licenceLoading, setLicenceLoading] = useState(false);
  const [licenceError, setLicenceError] = useState<string | null>(null);
  const [licenceInUse, setLicenceInUse] = useState(false);

  const go = (s: Step) => {
    setHostError(null);
    setSignsError(null);
    setLicenceError(null);
    setLicenceInUse(false);
    setStep(s);
  };

  // ── Connection test ───────────────────────────────────────────────────────

  const testAndProceed = async () => {
    const trimmed = hostInput.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setHostError('URL must start with http:// or https://');
      return;
    }
    if (!navigator.onLine) {
      setConnStatus('fail');
      setHostError('No internet connection. Please check your network and try again.');
      return;
    }
    setHostError(null);
    setConnStatus('testing');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      await fetch(`${trimmed}/api/DigitalSigns`, { method: 'GET', signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      setConnStatus('ok');
      await setHostUrl(trimmed);
      setTimeout(() => go('sign'), 800);
    } catch (err) {
      setConnStatus('fail');
      if (!navigator.onLine) {
        // Internet is down — nothing to do with the URL
        setHostError(OFFLINE_MSG);
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        setHostError('Connection timed out. The server took too long to respond — the URL may be incorrect.');
      } else {
        // Online but server not reached — URL is likely wrong
        setHostError('Failed to connect. The host URL may be incorrect — please check and try again.');
      }
    }
  };

  // ── Load signs ────────────────────────────────────────────────────────────

  const loadSigns = async () => {
    if (!tenantId.trim()) {
      setSignsError('Please enter your account name.');
      return;
    }
    if (!navigator.onLine) {
      setSignsError('No internet connection. Please check your network and try again.');
      return;
    }
    setSignsLoading(true);
    setSignsError(null);
    setSigns([]);
    setSelectedSign(null);
    try {
      // Tenant is identified via query param only — no ActivationKey header.
      // This hits the subscription service (same host as licence activation),
      // not the tenant's ASAS Connect host set in the previous step.
      const url = `${SUBSCRIPTION_API_BASE}/api/subscription/unused-signs?tenant=${encodeURIComponent(tenantId.trim())}`;

      let ok: boolean;
      let status: number;
      let raw: any;

      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.get({ url });
        ok = response.status >= 200 && response.status < 300;
        status = response.status;
        raw = response.data;
      } else {
        const res = await fetch(url, { method: 'GET', cache: 'no-store' });
        ok = res.ok;
        status = res.status;
        raw = await res.json();
      }

      if (!ok) {
        if (status === 401 || status === 403) {
          setSignsError('Account not found or not authorised. Check your account name and try again.');
        } else if (status === 404) {
          setSignsError('No signs found for this account. Contact your administrator.');
        } else if (status >= 500) {
          setSignsError('Server error. Please try again later.');
        } else {
          setSignsError(`Failed to load signs (${status}). Please try again.`);
        }
        return;
      }

      // API returns { count: N, items: [...] }
      const count: number = raw.count ?? 0;
      const list: any[] = Array.isArray(raw.items) ? raw.items : [];

      console.log('[Signs] count:', count, 'items:', list);

      if (count === 0 || list.length === 0) {
        setSignsError('No available signs found for this account. All signs may already be assigned.');
        return;
      }

      setSigns(list.map((s: any) => ({
        id: String(s.id ?? s.signId ?? s._id ?? ''),
        name: s.sign_name ?? s.name ?? s.signName ?? 'Unnamed Sign',
        activationKey: s.activation_key ?? s.activationKey ?? s.ActivationKey ?? '',
        location: s.location ?? s.floorName ?? s.buildingName ?? undefined,
      })));
    } catch (err) {
      setSignsError(isNetworkError(err) ? SERVER_UNREACHABLE_MSG : 'Unexpected error. Please try again.');
    } finally {
      setSignsLoading(false);
    }
  };

  const confirmSign = async (sign: SignItem) => {
    setSelectedSign(sign);
    if (!sign.activationKey) {
      setSignsError('This sign does not have an activation key. Contact your administrator.');
      return;
    }
    await setActivationKey(sign.activationKey);
    go('license');
  };

  // ── Licence ───────────────────────────────────────────────────────────────

  const handleLicence = async () => {
    if (!navigator.onLine) {
      setLicenceError('No internet connection. Please check your network and try again.');
      return;
    }
    setLicenceLoading(true);
    setLicenceError(null);
    setLicenceInUse(false);
    try {
      const deviceInfo = await getDeviceId();
      const body = { licenseKey: licenceInput.trim(), deviceInfo };

      let ok: boolean;
      let status: number;
      let data: any;

      if (Capacitor.isNativePlatform()) {
        const response = await CapacitorHttp.post({
          url: LICENSE_API,
          headers: { 'Content-Type': 'application/json' },
          data: body,
        });
        ok = response.status >= 200 && response.status < 300;
        status = response.status;
        data = response.data;
      } else {
        const res = await fetch(LICENSE_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        ok = res.ok;
        status = res.status;
        data = await res.json();
      }

      if (!ok || !data.success) {
        if (status === 404) setLicenceError('Licence key not found. Please check the key and try again.');
        else if (status === 403) setLicenceError('This licence is not authorised for this product. Contact your administrator.');
        else if (status >= 500) setLicenceError('The licence server is currently unavailable. Please try again later.');
        else setLicenceError(data.message ?? 'Invalid licence key. Please check and try again.');
        return;
      }

      if (data.alreadyActivated) {
        setLicenceInUse(true);
        return;
      }

      await setLicense(data.license as LicenseInfo);

      // Activate the door sign with the key obtained from sign selection
      const res = await doorSignFetch(`${getBaseUrl()}/api/digitalsigns/activate/${(await import('../lib/activationKey')).getActivationKey()}`);
      const resourceData = res.ok ? await res.json() : null;
      onComplete(resourceData);
    } catch (err) {
      console.error('[Licence]', err);
      if (isNetworkError(err)) {
        setLicenceError(!Capacitor.isNativePlatform()
          ? 'Browser CORS restriction — build the APK and test on a device.'
          : OFFLINE_MSG);
      } else {
        setLicenceError('Unexpected error. Please try again.');
      }
    } finally {
      setLicenceLoading(false);
    }
  };

  // ── WELCOME ───────────────────────────────────────────────────────────────

  if (step === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
        <Glow />
        <div className="relative flex flex-col items-center w-full max-w-xl">
          <div className="w-full bg-[#0d1117] border border-white/8 rounded-3xl p-8 flex flex-col items-center gap-7 shadow-2xl">
            <Logo size="lg" />
            <div className="w-full h-px bg-white/8" />
            <p className="text-slate-300 text-sm leading-relaxed text-center">
              Welcome to the Sharewinds Door Sign setup.<br />This will take less than a minute.
            </p>
            <div className="w-full">
              <StepBar current="host" />
            </div>
            <button
              onClick={() => go('host')}
              className="w-full bg-primary text-white font-black py-4 rounded-2xl text-base shadow-xl shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Get Started
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>
            </button>
          </div>
          <p className="text-slate-600 text-xs text-center mt-5">Powered by Sharewinds © {new Date().getFullYear()}</p>
        </div>
      </div>
    );
  }

  // ── HOST ──────────────────────────────────────────────────────────────────

  if (step === 'host') {
    const isTesting = connStatus === 'testing';
    const isOk = connStatus === 'ok';
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
        <Glow />
        <div className="relative w-full max-w-xl">
          <TopBar />
          <div className="w-full bg-[#0d1117] border border-white/8 rounded-3xl p-7 flex flex-col gap-6 shadow-2xl">
            <StepBar current="host" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>dns</span>
              </div>
              <div>
                <h2 className="text-lg font-black leading-tight">Connection Setup</h2>
                <p className="text-slate-500 text-xs mt-0.5">Enter your ASAS Connect server address</p>
              </div>
            </div>
            <div className="w-full h-px bg-white/6" />
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Host URL or IP Address</label>
              <input
                type="url"
                value={hostInput}
                onChange={e => { setHostInput(e.target.value); setConnStatus('idle'); setHostError(null); }}
                className={`w-full p-4 rounded-xl bg-[#111518] border text-white font-mono text-sm outline-none transition-colors placeholder-slate-600 ${
                  isOk ? 'border-status-available' : connStatus === 'fail' ? 'border-red-500/50' : 'border-white/12 focus:border-primary'
                }`}
                style={{ colorScheme: 'dark' }}
                placeholder="https://your-server.com"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {isTesting && (
                <div className="flex items-center gap-2 text-slate-400 text-xs px-1">
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: '14px' }}>progress_activity</span>
                  Testing connection…
                </div>
              )}
              {isOk && (
                <div className="flex items-center gap-2 text-status-available text-xs font-black px-1">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                  Connected successfully
                </div>
              )}
              {connStatus === 'fail' && (
                <div className="flex items-center gap-2 text-red-400 text-xs font-black px-1">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cancel</span>
                  Failed to connect
                </div>
              )}
              {connStatus === 'idle' && (
                <div className="flex flex-col gap-1 mt-0.5">
                  <p className="text-[11px] text-slate-600">e.g. <span className="text-slate-500 font-mono">https://192.168.1.100</span></p>
                  <p className="text-[11px] text-slate-600">or &nbsp;<span className="text-slate-500 font-mono">https://asas.mycompany.com</span></p>
                </div>
              )}
            </div>
            {hostError && <ErrorBox msg={hostError} />}
            <div className="flex gap-3">
              <button type="button" onClick={() => go('welcome')} className="flex-1 py-3.5 rounded-xl font-black text-sm border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white active:scale-[0.98] transition-all">Back</button>
              <button
                onClick={testAndProceed}
                disabled={isTesting || isOk || !hostInput.trim()}
                className="flex-[2] py-3.5 rounded-xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isTesting ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span> Testing…</>
                  : isOk ? <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span> Connected</>
                  : <>Test &amp; Next <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SIGN PICKER ───────────────────────────────────────────────────────────

  if (step === 'sign') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
        <Glow />
        <div className="relative w-full max-w-xl">
          <TopBar />
          <div className="w-full bg-[#0d1117] border border-white/8 rounded-3xl p-7 flex flex-col gap-6 shadow-2xl">

            <StepBar current="sign" />

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>meeting_room</span>
              </div>
              <div>
                <h2 className="text-lg font-black leading-tight">Select Sign</h2>
                <p className="text-slate-500 text-xs mt-0.5">Enter your account name to load available signs</p>
              </div>
            </div>

            <div className="w-full h-px bg-white/6" />

            {/* Account name input */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Account Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tenantId}
                  onChange={e => { setTenantId(e.target.value); setSignsError(null); setSigns([]); setSelectedSign(null); }}
                  className="flex-1 p-4 rounded-xl bg-[#111518] border border-white/12 text-white font-mono text-sm outline-none focus:border-primary transition-colors placeholder-slate-600"
                  style={{ colorScheme: 'dark' }}
                  placeholder="your-account"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  onClick={loadSigns}
                  disabled={signsLoading || !tenantId.trim()}
                  className="px-4 rounded-xl font-black text-sm bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-1 flex-shrink-0"
                >
                  {signsLoading
                    ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
                    : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>search</span>}
                </button>
              </div>
              <p className="text-[11px] text-slate-600">This will be sent as your tenant identifier</p>
            </div>

            {/* Signs list */}
            {signs.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  Available Signs <span className="text-primary">({signs.length})</span>
                </p>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {signs.map(sign => (
                    <button
                      key={sign.id}
                      onClick={() => confirmSign(sign)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all active:scale-[0.98] group ${
                        selectedSign?.id === sign.id
                          ? 'bg-primary/10 border-primary'
                          : 'bg-white/4 border-white/8 hover:border-primary/40 hover:bg-primary/5'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedSign?.id === sign.id ? 'bg-primary text-white' : 'bg-white/8 text-slate-400 group-hover:text-primary'
                      }`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>door_front</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black truncate ${selectedSign?.id === sign.id ? 'text-white' : 'text-slate-200'}`}>
                          {sign.name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                          {sign.activationKey || '—'}
                        </p>
                      </div>
                      {selectedSign?.id === sign.id && (
                        <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: '18px' }}>check_circle</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {signsError && <ErrorBox msg={signsError} />}

            <div className="flex gap-3">
              <button type="button" onClick={() => go('host')} className="flex-1 py-3.5 rounded-xl font-black text-sm border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white active:scale-[0.98] transition-all">Back</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LICENCE ───────────────────────────────────────────────────────────────

  if (licenceInUse) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
        <Glow />
        <div className="relative w-full max-w-xl">
          <TopBar />
          <div className="w-full bg-[#0d1117] border border-amber-500/20 rounded-3xl p-7 flex flex-col gap-6 shadow-2xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-400" style={{ fontSize: '32px' }}>warning</span>
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Licence Already in Use</h2>
                <p className="text-slate-400 text-xs mt-1">This licence key is active on another device</p>
              </div>
            </div>
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15">
              <span className="material-symbols-outlined text-amber-400 flex-shrink-0 mt-0.5" style={{ fontSize: '16px' }}>info</span>
              <p className="text-amber-300/80 text-xs leading-relaxed">
                Please contact your Sharewinds administrator to revoke the licence from the other device before activating here.
              </p>
            </div>
            <button
              onClick={() => { setLicenceInUse(false); setLicenceInput(''); }}
              className="w-full py-4 rounded-2xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
              Use a Different Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
      <Glow />
      <div className="relative w-full max-w-xl">
        <TopBar />
        <div className="w-full bg-[#0d1117] border border-white/8 rounded-3xl p-7 flex flex-col gap-6 shadow-2xl">

          <StepBar current="license" />

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '22px' }}>workspace_premium</span>
            </div>
            <div>
              <h2 className="text-lg font-black leading-tight">Licence Activation</h2>
              <p className="text-slate-500 text-xs mt-0.5">Enter your Sharewinds licence key</p>
            </div>
          </div>

          <div className="w-full h-px bg-white/6" />

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Licence Key</label>
            <input
              type="text"
              value={licenceInput}
              onChange={e => { setLicenceInput(e.target.value.toUpperCase()); setLicenceError(null); }}
              className="w-full p-4 rounded-xl bg-[#111518] border border-white/12 text-white font-mono text-sm outline-none focus:border-primary transition-colors placeholder-slate-600 tracking-widest"
              style={{ colorScheme: 'dark' }}
              placeholder="SW-XXXXXX-XXXXXX-XXXXXX"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-[11px] text-slate-600 mt-0.5">Provided in your Sharewinds purchase confirmation</p>
          </div>

          {licenceError && <ErrorBox msg={licenceError} />}

          <div className="flex gap-3">
            <button type="button" onClick={() => go('sign')} className="flex-1 py-3.5 rounded-xl font-black text-sm border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white active:scale-[0.98] transition-all">Back</button>
            <button
              onClick={handleLicence}
              disabled={licenceLoading || !licenceInput.trim()}
              className="flex-[2] py-3.5 rounded-xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {licenceLoading
                ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span> Checking…</>
                : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>verified</span> Activate</>}
            </button>
          </div>
        </div>
        <p className="text-slate-600 text-xs text-center mt-5">Powered by Sharewinds © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

export default SetupWizard;
