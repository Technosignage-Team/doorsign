import React, { useState, useEffect, useCallback } from 'react';
import { getBaseUrl } from '../lib/hostUrl';
import { doorSignFetch } from '../lib/doorSignFetch';
import { db } from '../lib/db';
import { RoomStatus } from '../types';

interface CheckInOutViewProps {
  onBack: () => void;
  currentTime: Date;
  roomStatus: RoomStatus;
}

type Mode = 'CHECK_IN' | 'CHECK_OUT';
type TabMode = 'GUEST' | 'EMPLOYEE';

const CheckInOutView: React.FC<CheckInOutViewProps> = ({ onBack, roomStatus }) => {
  const [mode, setMode] = useState<Mode>(roomStatus.isAvailable ? 'CHECK_IN' : 'CHECK_OUT');
  const [activeTab] = useState<TabMode>('GUEST');
  const [inputCode, setInputCode] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showFaceSurvey, setShowFaceSurvey] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [ratings, setRatings] = useState({ room: '', event: '' });
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  const isMeetingStarted = !roomStatus.isAvailable;

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAuth = useCallback((codeOverride?: string) => {
    const finalCode = codeOverride || inputCode;
    if (activeTab === 'EMPLOYEE') {
      const user = db.getEmployee(finalCode);
      if (user) {
        setAuthenticatedUser(user);
        setIsAuthenticated(true);
      } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
        setInputCode('');
      }
    } else {
      if (finalCode.length === 4) {
        setAuthenticatedUser({ name: 'Guest User' });
        setIsAuthenticated(true);
      }
    }
  }, [inputCode, activeTab]);

  const handleKeyPress = (num: string) => {
    if (isAuthenticated) return;
    setError(false);
    const limit = activeTab === 'GUEST' ? 4 : 32;
    if (inputCode.length < limit) {
      const nextCode = inputCode + num;
      setInputCode(nextCode);
      if (activeTab === 'GUEST' && nextCode.length === 4) {
        setTimeout(() => handleAuth(nextCode), 300);
      }
    }
  };

  const handleBackspace = () => {
    if (isAuthenticated) return;
    setInputCode(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setInputCode('');
    setError(false);
    setIsAuthenticated(false);
    setAuthenticatedUser(null);
    setRatings({ room: '', event: '' });
  };

  const onConfirmAction = async () => {
    setApiError(null);
    // Check-in targets the in-progress meeting if one is running (late arrival),
    // otherwise the upcoming one. Check-out always targets the in-progress meeting.
    const bookingId = mode === 'CHECK_IN'
      ? (roomStatus.currentMeeting?.apiId ?? roomStatus.nextMeeting?.apiId)
      : roomStatus.currentMeeting?.apiId;
    if (!bookingId) {
      setApiError('No booking found to check ' + (mode === 'CHECK_IN' ? 'in to' : 'out of') + '.');
      return;
    }
    setIsApiLoading(true);
    const endpoint = mode === 'CHECK_IN'
      ? `${getBaseUrl()}/api/bookings/${bookingId}/checkin`
      : `${getBaseUrl()}/api/bookings/${bookingId}/checkout`;
    try {
      const res = await doorSignFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinCode: inputCode }),
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => '');
        const msg = raw.replace(/[{}"\[\]]/g, '').trim();
        throw new Error(msg || 'The code could not be verified. Please check and try again.');
      }
      if (mode === 'CHECK_OUT') {
        setShowFaceSurvey(true);
      } else {
        setShowSuccessModal(true);
      }
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      const clean = raw.replace(/[{}"\[\]]/g, '').trim();
      setApiError(clean || 'Something went wrong. Please try again.');
    } finally {
      setIsApiLoading(false);
    }
  };

  const submitFeedback = () => {
    setShowFaceSurvey(false);
    setShowSuccessModal(true);
  };

  /* ── PIN PAD shared between portrait and landscape ── */
  const PinDots = () => (
    <div className="w-full mb-8 relative z-10 flex justify-center gap-3 lg:gap-5 min-h-[80px]">
      {[0, 1, 2, 3].map((idx) => (
        <div
          key={idx}
          className={`size-16 lg:size-20 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all duration-500 ${
            inputCode.length === idx
              ? 'border-primary ring-[6px] ring-primary/10 bg-primary/5 scale-105'
              : 'border-white/5 bg-black/60 text-white shadow-[inset_0_4px_24px_rgba(0,0,0,0.8)]'
          }`}
        >
          {inputCode[idx] ? (
            <div className="size-4 lg:size-5 rounded-full bg-white shadow-[0_0_20px_white] animate-in zoom-in-0 duration-300" />
          ) : (
            <div className="size-4 lg:size-5 rounded-full bg-white/[0.02]" />
          )}
        </div>
      ))}
    </div>
  );

  const NumPad = () => (
    <div className="grid grid-cols-3 gap-3 lg:gap-4 w-full max-w-[340px] mb-2 relative z-10">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'delete'].map((key, i) => (
        <button
          key={i}
          onClick={() => {
            if (key === 'delete') handleBackspace();
            else if (key === 'C') handleClear();
            else handleKeyPress(key);
          }}
          className={`h-14 lg:h-16 flex items-center justify-center rounded-2xl text-2xl lg:text-3xl font-black transition-all border border-white/5 active:scale-90 shadow-2xl cursor-pointer ${
            key === 'delete' || key === 'C'
              ? 'text-slate-500 hover:text-white bg-white/5 hover:bg-white/10'
              : 'bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-white/10'
          }`}
        >
          {key === 'delete' ? (
            <span className="material-symbols-outlined text-2xl lg:text-3xl">backspace</span>
          ) : key}
        </button>
      ))}
    </div>
  );

  const VerifiedPanel = () => (
    <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 py-4">
      <div className="size-36 lg:size-44 rounded-[2rem] bg-blue-900/40 border-2 border-blue-500/45 flex items-center justify-center mb-8 shadow-[0_20px_60px_rgba(59,130,246,0.3)] relative overflow-hidden">
        {authenticatedUser?.photo ? (
          <img src={authenticatedUser.photo} className="size-full object-cover rounded-[1.8rem] p-1.5" alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="material-symbols-outlined text-6xl text-blue-400 font-variation-fill">verified_user</span>
        )}
      </div>
      <h2 className="text-3xl lg:text-[40px] font-black uppercase tracking-tight text-white mb-2 leading-none text-center">
        IDENTITY VERIFIED
      </h2>
      <p className="text-slate-400 text-xs sm:text-sm font-extrabold uppercase tracking-[0.3em] mb-12 text-center opacity-90">
        {(authenticatedUser?.name || 'Authorized User').toUpperCase()}
      </p>
      <div className="flex flex-col gap-4 w-full px-4">
        <button
          onClick={onConfirmAction}
          disabled={isApiLoading}
          className={`w-full py-7 lg:py-8 rounded-3xl text-xl lg:text-2xl font-black uppercase tracking-[0.155em] shadow-2xl active:scale-95 border-t border-white/20 flex items-center justify-center gap-4 transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
            mode === 'CHECK_IN'
              ? 'bg-white text-black hover:bg-slate-100'
              : 'bg-primary text-white hover:brightness-110'
          }`}
        >
          {isApiLoading ? (
            <span className="size-7 border-4 border-current/30 border-t-current rounded-full animate-spin" />
          ) : (
            <>
              <span className="material-symbols-outlined text-3xl lg:text-4xl">
                {mode === 'CHECK_IN' ? 'login' : 'logout'}
              </span>
              {mode === 'CHECK_IN' ? 'CONFIRM CHECK IN' : 'CONFIRM CHECK OUT'}
            </>
          )}
        </button>
        {apiError && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-2xl px-4 py-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="material-symbols-outlined text-red-500 text-base shrink-0">error</span>
            <p className="text-red-400 text-[10px] font-bold">{apiError}</p>
          </div>
        )}
        <button
          onClick={() => { handleClear(); setApiError(null); }}
          className="w-full py-4 text-[10px] lg:text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 hover:text-slate-300 transition-all focus:outline-none cursor-pointer"
        >
          Cancel & Start Over
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative text-white font-display">

      <header className="flex items-center justify-between p-4 lg:p-6 border-b border-white/5 bg-black/40 backdrop-blur-xl relative z-30 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl font-black">arrow_back</span>
          </button>
          <div className="flex flex-col translate-y-[2px]">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tighter leading-none">
              Check In / Out
            </h1>
            <p className="text-[#137fec] text-[9px] font-bold uppercase tracking-widest mt-1.5 leading-none">
              Boardroom Guest Access
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-start items-center px-3 lg:px-10 gap-8 relative z-10 max-w-[1440px] mx-auto w-full pb-8 overflow-y-auto custom-scrollbar">

        {isPortrait ? (
          /* Portrait Layout */
          <div className="w-full max-w-[520px] flex flex-col items-center gap-6 my-auto animate-in fade-in duration-300">

            {/* Check In / Out toggle */}
            <div
              className="bg-white/5 p-1.5 rounded-3xl border border-white/10 grid grid-cols-2 gap-3 backdrop-blur-lg w-full"
              style={{ opacity: isAuthenticated ? 0.3 : 1, pointerEvents: isAuthenticated ? 'none' : 'auto' }}
            >
              <button
                onClick={() => { setMode('CHECK_IN'); handleClear(); }}
                className={`flex flex-col items-center justify-center aspect-[1.3] p-4 rounded-2xl transition-all duration-500 group relative overflow-hidden text-center cursor-pointer ${
                  mode === 'CHECK_IN' ? 'bg-primary/20 text-white border border-primary/40 shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className={`size-16 sm:size-20 rounded-2xl flex items-center justify-center border transition-all mb-3 ${mode === 'CHECK_IN' ? 'bg-primary text-white border-primary/20 shadow-[0_0_20px_rgba(19,127,236,0.35)]' : 'bg-white/5 border-white/5'}`}>
                  <span className="material-symbols-outlined text-4xl sm:text-5xl font-variation-fill">login</span>
                </div>
                <span className="text-xs sm:text-sm lg:text-base font-black uppercase tracking-widest leading-none">Check In</span>
              </button>

              <button
                disabled={!isMeetingStarted}
                onClick={() => { setMode('CHECK_OUT'); handleClear(); }}
                className={`flex flex-col items-center justify-center aspect-[1.3] p-4 rounded-2xl transition-all duration-500 group relative overflow-hidden text-center ${
                  !isMeetingStarted
                    ? 'opacity-30 cursor-not-allowed text-slate-600 border border-transparent'
                    : mode === 'CHECK_OUT'
                      ? 'bg-primary/20 text-white border border-primary/40 shadow-xl cursor-pointer'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent cursor-pointer'
                }`}
                title={!isMeetingStarted ? 'No meeting is currently running' : 'Check Out'}
              >
                <div className={`size-16 sm:size-20 rounded-2xl flex items-center justify-center border transition-all mb-3 ${
                  !isMeetingStarted
                    ? 'bg-white/[0.02] border-white/5 text-slate-600'
                    : mode === 'CHECK_OUT'
                      ? 'bg-primary text-white border-primary/20 shadow-[0_0_20px_rgba(19,127,236,0.35)]'
                      : 'bg-white/5 border-white/5'
                }`}>
                  <span className="material-symbols-outlined text-4xl sm:text-5xl font-variation-fill">logout</span>
                </div>
                <span className="text-xs sm:text-sm lg:text-base font-black uppercase tracking-widest leading-none">Check Out</span>
                {!isMeetingStarted && (
                  <span className="text-[10px] font-black uppercase text-rose-500 tracking-tight mt-1 animate-pulse">Not Started</span>
                )}
              </button>
            </div>

            {/* PIN Pad card */}
            <div
              className={`w-full border rounded-3xl p-6 lg:p-10 backdrop-blur-3xl shadow-2xl flex flex-col items-center relative group min-h-[500px] transition-all duration-500 ${
                isAuthenticated
                  ? 'bg-blue-950/70 border-blue-500/40 shadow-[0_20px_60px_rgba(30,58,138,0.6)]'
                  : 'bg-[#0c182b]/60 border-white/10'
              }`}
            >
              {isAuthenticated ? <VerifiedPanel /> : (
                <>
                  <PinDots />
                  <NumPad />
                  {error && (
                    <div className="mt-4 bg-red-500/25 border border-red-500/40 px-5 py-2 rounded-2xl text-red-500 text-[9px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                      Access Denied
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        ) : (
          /* Landscape Layout */
          <div className="w-full flex flex-row items-center justify-center gap-8 lg:gap-16 pt-4 animate-in fade-in duration-300">

            {/* Left column */}
            <div
              className="flex-1 flex flex-col gap-6 max-w-[520px] w-full"
              style={{ opacity: isAuthenticated ? 0.3 : 1, pointerEvents: isAuthenticated ? 'none' : 'auto' }}
            >
              <div className="bg-white/5 p-1.5 rounded-3xl border border-white/10 grid grid-cols-2 gap-3 backdrop-blur-lg w-full">
                <button
                  onClick={() => { setMode('CHECK_IN'); handleClear(); }}
                  className={`flex flex-col items-center justify-center aspect-[1.3] p-4 rounded-2xl transition-all duration-500 group relative overflow-hidden text-center cursor-pointer ${
                    mode === 'CHECK_IN' ? 'bg-primary/20 text-white border border-primary/40 shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`size-16 sm:size-20 rounded-2xl flex items-center justify-center border transition-all mb-3 ${mode === 'CHECK_IN' ? 'bg-primary text-white border-primary/20 shadow-[0_0_20px_rgba(19,127,236,0.35)]' : 'bg-white/5 border-white/5'}`}>
                    <span className="material-symbols-outlined text-4xl sm:text-5xl font-variation-fill">login</span>
                  </div>
                  <span className="text-xs sm:text-sm lg:text-base font-black uppercase tracking-widest leading-none">Check In</span>
                </button>

                <button
                  disabled={!isMeetingStarted}
                  onClick={() => { setMode('CHECK_OUT'); handleClear(); }}
                  className={`flex flex-col items-center justify-center aspect-[1.3] p-4 rounded-2xl transition-all duration-500 group relative overflow-hidden text-center ${
                    !isMeetingStarted
                      ? 'opacity-30 cursor-not-allowed text-slate-600 border border-transparent'
                      : mode === 'CHECK_OUT'
                        ? 'bg-primary/20 text-white border border-primary/40 shadow-xl cursor-pointer'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent cursor-pointer'
                  }`}
                  title={!isMeetingStarted ? 'No meeting is currently running' : 'Check Out'}
                >
                  <div className={`size-16 sm:size-20 rounded-2xl flex items-center justify-center border transition-all mb-3 ${
                    !isMeetingStarted
                      ? 'bg-white/[0.02] border-white/5 text-slate-600'
                      : mode === 'CHECK_OUT'
                        ? 'bg-primary text-white border-primary/20 shadow-[0_0_20px_rgba(19,127,236,0.35)]'
                        : 'bg-white/5 border-white/5'
                  }`}>
                    <span className="material-symbols-outlined text-4xl sm:text-5xl font-variation-fill">logout</span>
                  </div>
                  <span className="text-xs sm:text-sm lg:text-base font-black uppercase tracking-widest leading-none">Check Out</span>
                  {!isMeetingStarted && (
                    <span className="text-[10px] font-black uppercase text-rose-500 tracking-tight mt-1 animate-pulse">Not Started</span>
                  )}
                </button>
              </div>

            </div>

            {/* Right column — PIN pad */}
            <div className="w-full max-w-[520px] flex flex-col items-center">
              <div
                className={`w-full border rounded-3xl p-6 lg:p-10 backdrop-blur-3xl shadow-2xl flex flex-col items-center relative group min-h-[500px] transition-all duration-500 ${
                  isAuthenticated
                    ? 'bg-blue-950/70 border-blue-500/40 shadow-[0_20px_60px_rgba(30,58,138,0.6)]'
                    : 'bg-[#0c182b]/60 border-white/10'
                }`}
              >
                {isAuthenticated ? <VerifiedPanel /> : (
                  <>
                    <PinDots />
                    <NumPad />
                    {error && (
                      <div className="mt-4 bg-red-500/25 border border-red-500/40 px-5 py-2 rounded-2xl text-red-500 text-[9px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                        Access Denied
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Face Feedback Survey Modal */}
      {showFaceSurvey && (
        <div className="fixed top-[73px] sm:top-[81px] bottom-0 left-0 right-0 z-[150] bg-black/90 backdrop-blur-[65px] flex items-center justify-center p-4 lg:p-6 overflow-y-auto animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
          <div className="w-full max-w-2xl bg-[#091526]/95 border border-blue-500/20 rounded-3xl p-6 lg:p-8 flex flex-col items-center shadow-[0_0_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/20 via-blue-500 to-blue-500/20" />
            <div className="flex flex-col items-center mb-6">
              <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tighter mb-1 uppercase text-center leading-none">Session Insight</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Please rate your briefing experience</p>
            </div>

            <div className="flex flex-col gap-8 w-full">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-2">
                  <span className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] lg:text-[11px]">1. Room Infrastructure</span>
                  {ratings.room && <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Selected</span>}
                </div>
                <div className="flex justify-around items-center py-4">
                  <FaceButton icon="sentiment_very_satisfied" color="text-emerald-500" label="Excellent" active={ratings.room === 'EXCELLENT'} onClick={() => setRatings(prev => ({ ...prev, room: 'EXCELLENT' }))} />
                  <FaceButton icon="sentiment_neutral" color="text-amber-500" label="Acceptable" active={ratings.room === 'NEUTRAL'} onClick={() => setRatings(prev => ({ ...prev, room: 'NEUTRAL' }))} />
                  <FaceButton icon="sentiment_very_dissatisfied" color="text-red-500" label="Subpar" active={ratings.room === 'POOR'} onClick={() => setRatings(prev => ({ ...prev, room: 'POOR' }))} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-2">
                  <span className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] lg:text-[11px]">2. Event Experience</span>
                  {ratings.event && <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Selected</span>}
                </div>
                <div className="flex justify-around items-center py-4">
                  <FaceButton icon="sentiment_very_satisfied" color="text-emerald-500" label="Productive" active={ratings.event === 'PRODUCTIVE'} onClick={() => setRatings(prev => ({ ...prev, event: 'PRODUCTIVE' }))} />
                  <FaceButton icon="sentiment_neutral" color="text-amber-500" label="Ordinary" active={ratings.event === 'NEUTRAL'} onClick={() => setRatings(prev => ({ ...prev, event: 'NEUTRAL' }))} />
                  <FaceButton icon="sentiment_very_dissatisfied" color="text-red-500" label="Difficult" active={ratings.event === 'POOR'} onClick={() => setRatings(prev => ({ ...prev, event: 'POOR' }))} />
                </div>
              </div>
            </div>

            <div className="mt-8 w-full max-w-sm flex flex-col gap-4">
              <button
                onClick={submitFeedback}
                className="w-full bg-blue-500 text-white py-4 rounded-2xl text-lg font-black shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-[0.15em] border-t border-white/20"
              >
                Confirm &amp; Finish
              </button>
              <button
                onClick={submitFeedback}
                className="text-slate-500 hover:text-white font-bold uppercase tracking-[0.3em] text-[10px] transition-colors text-center cursor-pointer"
              >
                Skip Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[160] bg-black/98 backdrop-blur-[100px] flex items-center justify-center p-8 animate-in fade-in duration-700">
          <div className="bg-[#0b1e36] w-full max-w-xl rounded-3xl border border-blue-500/20 p-12 lg:p-16 flex flex-col items-center shadow-2xl relative">
            <div className="size-40 lg:size-48 rounded-full bg-blue-500/10 border-8 border-blue-500/20 flex items-center justify-center mb-10 shadow-[0_0_80px_rgba(59,130,246,0.25)]">
              <span className="material-symbols-outlined text-blue-500 text-7xl lg:text-[100px] font-bold animate-in zoom-in duration-700 font-variation-fill animate-pulse">verified</span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tighter mb-4 uppercase text-center">Verified</h2>
            <p className="text-slate-300 text-center text-xl lg:text-2xl font-medium leading-relaxed max-w-sm mb-12">
              Sync complete. Your session status has been updated.
            </p>
            <button
              onClick={() => { setShowSuccessModal(false); onBack(); }}
              className="w-full bg-blue-500 text-white py-8 lg:py-10 rounded-3xl text-xl lg:text-2xl font-black shadow-2xl shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest border-t border-white/20"
            >
              Finish
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

const FaceButton: React.FC<{
  icon: string;
  color: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}> = ({ icon, color, label, active, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 group transition-all duration-300 cursor-pointer"
  >
    <div className={`transition-all duration-500 ${
      active
        ? `${color} scale-125 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.25)]`
        : 'text-slate-600 group-hover:text-slate-300 group-hover:scale-110'
    }`}>
      <span className="material-symbols-outlined text-6xl lg:text-7xl font-variation-fill">{icon}</span>
    </div>
    <span className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] transition-colors mt-2 ${
      active ? color : 'text-slate-500 group-hover:text-slate-300'
    }`}>
      {label}
    </span>
  </button>
);

export default CheckInOutView;
