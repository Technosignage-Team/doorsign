import React from 'react';
import { useNetworkStatus } from '../lib/useNetworkStatus';

const NetworkBanner: React.FC = () => {
  const { online, justReconnected } = useNetworkStatus();

  if (online && !justReconnected) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] pointer-events-none">
      <div className={`flex items-center gap-3 pl-3 pr-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all duration-500 ${
        !online
          ? 'bg-[#1a0a0a] border-red-500/25 shadow-red-500/10'
          : 'bg-[#0a1a0a] border-status-available/25 shadow-green-500/10'
      }`}>
        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
          !online
            ? 'bg-red-500/15 border border-red-500/20'
            : 'bg-status-available/15 border border-status-available/20'
        }`}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px', color: !online ? '#ef4444' : '#10b981' }}
          >
            {!online ? 'wifi_off' : 'wifi'}
          </span>
        </div>

        {/* Text */}
        <div className="flex flex-col">
          <span className={`text-xs font-black leading-tight ${!online ? 'text-red-400' : 'text-status-available'}`}>
            {!online ? 'No Internet Connection' : 'Connection Restored'}
          </span>
          <span className="text-slate-400 text-[11px] font-medium leading-tight mt-0.5">
            {!online
              ? 'API calls will fail until connection is restored'
              : 'You are back online'}
          </span>
        </div>

        {/* Pulse dot */}
        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${!online ? 'bg-red-500' : 'bg-status-available'}`} />
      </div>
    </div>
  );
};

export default NetworkBanner;
