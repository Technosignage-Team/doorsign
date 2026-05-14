import React from 'react';
import { LicenseInfo } from '../lib/license';

interface LicenseExpiredScreenProps {
  license: LicenseInfo;
  onRenew: () => void;
}

const LicenseExpiredScreen: React.FC<LicenseExpiredScreenProps> = ({ license, onRenew }) => {
  const expiredOn = new Date(license.expiryDate).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

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
            <div className="w-18 h-18 w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-400" style={{ fontSize: '34px' }}>gpp_bad</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Licence Expired</h1>
              <p className="text-slate-400 text-sm mt-1">Your Sharewinds licence is no longer active</p>
            </div>
          </div>

          <div className="w-full h-px bg-white/6" />

          {/* Details */}
          <div className="flex flex-col gap-3">
            {[
              { icon: 'business',          label: 'Company',    value: license.companyName },
              { icon: 'workspace_premium', label: 'Plan',       value: license.plan?.toUpperCase() },
              { icon: 'event_busy',        label: 'Expired on', value: expiredOn },
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
              This display is locked until the licence is renewed. Please contact your Sharewinds administrator to renew your subscription.
            </p>
          </div>

          {/* Action */}
          <button
            onClick={onRenew}
            className="w-full py-4 rounded-2xl font-black text-sm bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
            Enter New Licence Key
          </button>
        </div>

        <p className="text-slate-700 text-xs text-center">
          Licence key: <span className="font-mono">{license.licenseKey}</span>
        </p>
      </div>
    </div>
  );
};

export default LicenseExpiredScreen;
