import React, { useState } from 'react';
import { User } from '../types';

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
    setEmployeeId(prev => prev + num);
  };

  const handleBackspace = () => {
    setEmployeeId(prev => prev.slice(0, -1));
  };

  const handleLogin = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://sb.asasconnect.com/api/Auth/login/employee', {
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
      const token: string = data.token ?? data.accessToken ?? data.access_token ?? '';
      const user: User = {
        employeeId,
        name: data.name ?? data.fullName ?? data.displayName ?? `Employee ${employeeId}`,
        role: data.role ?? data.jobTitle ?? data.position ?? 'Employee',
        photo: data.photo ?? data.avatar ?? data.profileImage ?? `https://i.pravatar.cc/150?u=${employeeId}`,
        token,
      };
      onLogin(user);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden relative">
      <div className="absolute top-[-20%] left-[-10%] size-[80%] bg-primary/10 blur-[150px] rounded-none pointer-events-none" />
      
      <header className="flex items-center p-8 border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-10">
        <button onClick={onBack} className="size-14 rounded-none bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
          <span className="material-symbols-outlined text-3xl">arrow_back</span>
        </button>
        <div className="flex flex-col ml-6">
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">Authentication</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Everest Management System</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row items-center justify-center p-8 lg:p-16 gap-12 lg:gap-24 relative z-10 overflow-y-auto custom-scrollbar">
        {/* Left Side: Instructions & Demo Users */}
        <div className="max-w-md w-full flex flex-col items-center md:items-start text-center md:text-left">
          <div className={`size-24 rounded-none flex items-center justify-center mb-8 shadow-2xl transition-colors ${error ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-primary/20 text-primary border border-primary/30'}`}>
            <span className="material-symbols-outlined text-5xl font-variation-fill">
              {error ? 'lock_reset' : 'verified_user'}
            </span>
          </div>
          <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tighter leading-none mb-6">Employee ID Required</h2>
          <p className="text-slate-400 text-lg lg:text-xl leading-relaxed mb-10">
            Please enter your corporate ID to proceed with room booking or modification.
          </p>
          
          <div className="w-full flex flex-col gap-4">
             {error && (
               <div className="text-red-500 font-black uppercase tracking-widest text-xs animate-bounce flex items-center gap-2 mt-4">
                 <span className="material-symbols-outlined text-lg">error</span>
                 {error}
               </div>
             )}
          </div>
        </div>

        {/* Right Side: Keypad Container */}
        <div className="w-full max-w-sm bg-card-dark border border-white/10 rounded-none p-10 shadow-[0_30px_100px_rgba(0,0,0,0.6)] flex flex-col gap-8">
          {/* Display Area */}
          <div className="bg-black/40 border border-white/5 rounded-none p-6 h-28 flex flex-col items-center justify-center relative overflow-hidden group">
            <span className="absolute top-2 left-4 text-[8px] font-black text-slate-600 uppercase tracking-widest">Input Stream</span>
            <div className="w-full text-center">
              <span className={`text-4xl font-black tracking-widest break-all transition-all duration-300 ${employeeId ? 'text-white' : 'text-slate-800'}`}>
                {employeeId || 'ID NUMBER'}
              </span>
            </div>
            {employeeId && (
              <div className="absolute bottom-2 right-4 flex gap-1">
                <span className="size-1 rounded-none bg-primary animate-pulse"></span>
                <span className="size-1 rounded-none bg-primary animate-pulse delay-75"></span>
                <span className="size-1 rounded-none bg-primary animate-pulse delay-150"></span>
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'delete'].map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (key === 'delete') handleBackspace();
                  else if (key === 'C') setEmployeeId('');
                  else handleKeyPress(key);
                }}
                className={`h-20 rounded-none text-2xl font-black transition-all flex items-center justify-center ${
                  key === 'delete' || key === 'C'
                    ? 'text-slate-500 hover:text-white hover:bg-white/5 active:scale-90'
                    : 'bg-white/5 text-white border border-white/5 hover:bg-primary/20 hover:border-primary active:scale-90 shadow-lg'
                }`}
              >
                {key === 'delete' ? <span className="material-symbols-outlined text-3xl">backspace</span> : key}
              </button>
            ))}
          </div>

          {/* Action Button */}
          <button 
            onClick={handleLogin}
            disabled={!employeeId || loading}
            className="w-full bg-primary text-white py-6 rounded-none text-xl font-black shadow-2xl shadow-primary/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale uppercase tracking-[0.2em] border-t border-white/20 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
                Authenticating...
              </span>
            ) : 'Authenticate'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default LoginView;