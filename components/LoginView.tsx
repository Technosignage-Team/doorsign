import React, { useState } from 'react';
import { User } from '../types';
import { doorSignFetch } from '../lib/doorSignFetch';
import { getBaseUrl } from '../lib/hostUrl';

interface LoginViewProps {
  onBack: () => void;
  onLogin: (user: User) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onBack, onLogin }) => {
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (num: string) => {
    setError(null);
    if (employeeId.length < 10) setEmployeeId(prev => prev + num);
  };

  const handleBackspace = () => {
    setError(null);
    setEmployeeId(prev => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await doorSignFetch(`${getBaseUrl()}/api/Auth/login/employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ EmployeeNumber: employeeId, pinCode: employeeId }),
      });
      if (!res.ok) {
        setError('ID Not Recognized');
        setEmployeeId('');
        return;
      }
      const data = await res.json();
      // Response shape: { token, user: { Id, FullName, Email, Username, Role, EmployeeNumber, AvatarUrl, IsMainAccount } }
      const u = data.user ?? data;
      const token: string = data.token ?? data.accessToken ?? '';
      const userId: string = u.Id ?? u.id ?? u.userId ?? '';
      const name: string = u.FullName ?? u.fullName ?? u.displayName ?? u.Username ?? u.username ?? employeeId;
      const role: string = u.Role ?? u.role ?? u.jobTitle ?? 'Employee';
      const photo: string = u.AvatarUrl ?? u.avatarUrl ?? u.photo ?? `https://i.pravatar.cc/150?u=${employeeId}`;
      const user: User = { employeeId, userId, name, role, photo, token };
      onLogin(user);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const dots = employeeId.split('').map((_, i) => <span key={i} className="size-3 rounded-full bg-white inline-block" />);

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] size-[70%] bg-primary/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-10 shrink-0">
        <button onClick={onBack} className="size-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0">
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tight leading-none text-white">Employee Authentication</h1>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mt-1">Enter your corporate ID to continue</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10 overflow-hidden">
        <div className="w-full max-w-sm sm:max-w-md tablet:max-w-lg flex flex-col gap-4 lg:gap-5">

          {/* Lock icon + title */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`size-16 rounded-2xl flex items-center justify-center border transition-colors duration-300 ${error ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-primary/10 border-primary/20 text-primary'}`}>
              <span className="material-symbols-outlined text-3xl font-variation-fill">
                {error ? 'lock_reset' : 'shield_person'}
              </span>
            </div>
            {error ? (
              <p className="text-red-400 text-sm font-black uppercase tracking-widest animate-in fade-in duration-200">{error}</p>
            ) : (
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Secure Access Portal</p>
            )}
          </div>

          {/* ID Display */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl px-6 flex flex-col items-center gap-3 justify-center" style={{ minHeight: 'clamp(5rem, 12vh, 8rem)', padding: 'clamp(1rem, 3vh, 1.75rem) 1.5rem' }}>
            {employeeId ? (
              <>
                <div className="flex items-center gap-2">
                  {dots}
                  <span className="w-0.5 h-5 bg-primary animate-pulse rounded-full ml-1" />
                </div>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{employeeId.length} digit{employeeId.length !== 1 ? 's' : ''} entered</p>
              </>
            ) : (
              <p className="text-slate-700 text-sm font-black uppercase tracking-widest">Enter ID Number</p>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'del'].map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (key === 'del') handleBackspace();
                  else if (key === 'C') { setEmployeeId(''); setError(null); }
                  else handleKeyPress(key);
                }}
                style={{ height: 'clamp(3.5rem, 8vh, 6rem)', fontSize: 'clamp(1rem, 2.5vw, 1.5rem)' }}
                className={`rounded-xl font-black transition-all active:scale-90 flex items-center justify-center ${
                  key === 'del'
                    ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
                    : key === 'C'
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10'
                    : 'bg-white/[0.06] text-white border border-white/10 hover:bg-primary/20 hover:border-primary/40 shadow-lg'
                }`}
              >
                {key === 'del'
                  ? <span className="material-symbols-outlined text-xl">backspace</span>
                  : key}
              </button>
            ))}
          </div>

          {/* Authenticate button */}
          <button
            onClick={handleLogin}
            disabled={!employeeId || loading}
            style={{ padding: 'clamp(1rem, 3vh, 1.75rem)', fontSize: 'clamp(0.875rem, 1.8vw, 1.25rem)' }}
            className="w-full bg-white text-black rounded-xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-white/10 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none border-t border-white/20 flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                Authenticating…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">login</span>
                Authenticate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
