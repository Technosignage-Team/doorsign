import React, { useState } from 'react';
import { LicenseInfo } from '../lib/license';

interface LicenseRevokedScreenProps {
  license: LicenseInfo;
  onRefresh: () => Promise<LicenseInfo | null>;
}

const LicenseRevokedScreen: React.FC<LicenseRevokedScreenProps> = ({ license, onRefresh }) => {
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  const handleCheckAgain = async () => {
    setChecking(true);
    setCheckMsg(null);
    const result = await onRefresh();
    if (!result) setCheckMsg('Unable to reach the licence server. Check your connection and try again.');
    else setCheckMsg('Licence status checked — still revoked.');
    setChecking(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#050505] text-white px-6">
      <div className="fixed top-[-15%] left-[-10%] w-[50%] h-[50%] bg-red-500/5 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-red-500/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative w-full max-w-sm flex flex-col items-center gap-6">

        {/* Logo */}
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center font-black text-white text-base select-none">
          SW
        </div>

        {/* Card */}
        <div className="w-full bg-[#0d1117] border border-red-500/20 rounded-3xl p-8 flex flex-col gap-6 shadow-2xl">

          {/* Icon + title */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-400" style={{ fontSize: '34px' }}>block</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Licence Revoked</h1>
              <p className="text-slate-400 text-sm mt-1">Your Sharewinds licence has been revoked</p>
            </div>
          </div>

          <div className="w-full h-px bg-white/6" />

          {/* Details */}
          <div className="flex flex-col gap-3">
            {[
              { icon: 'business',          label: 'Company', value: license.companyName },
              { icon: 'workspace_premium', label: 'Plan',    value: license.plan?.toUpperCase() },
              { icon: 'gpp_bad',           label: 'Status',  value: license.status?.toUpperCase() },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/4 border border-white/6">
                <span className="material-symbols-outlined text-slate-500 flex-shrink-0" style={{ fontSize: '18px' }}>{icon}</span>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider w-20 flex-shrink-0">{label}</span>
                <span className="text-white text-sm font-bold truncate">{value}</span>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/6 border border-red-500/12">
            <span className="material-symbols-outlined text-red-400 flex-shrink-0 mt-0.5" style={{ fontSize: '16px' }}>info</span>
            <p className="text-red-300/70 text-xs leading-relaxed">
              This display is locked because your licence has been revoked. Please contact your Sharewinds administrator to restore access.
            </p>
          </div>

          {/* Action */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCheckAgain}
              disabled={checking}
              className="w-full py-4 rounded-2xl font-black text-sm bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined ${checking ? 'animate-spin' : ''}`} style={{ fontSize: '18px' }}>refresh</span>
              {checking ? 'Checking…' : 'Check Again'}
            </button>
            {checkMsg && (
              <p className="text-slate-500 text-xs text-center">{checkMsg}</p>
            )}
          </div>
        </div>

        <p className="text-slate-700 text-xs text-center">
          Licence key: <span className="font-mono">{license.licenseKey}</span>
        </p>
      </div>
    </div>
  );
};

export default LicenseRevokedScreen;
