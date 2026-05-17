import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getBaseUrl } from '../lib/hostUrl';
import { doorSignFetch } from '../lib/doorSignFetch';
import jsQR from 'jsqr';
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
  const [activeTab, setActiveTab] = useState<TabMode>('GUEST');
  const [inputCode, setInputCode] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showFaceSurvey, setShowFaceSurvey] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<any>(null);
  
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Feedback Ratings
  const [ratings, setRatings] = useState({ room: '', event: '' });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);

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
    setIsApiLoading(true);
    const endpoint = mode === 'CHECK_IN'
      ? `${getBaseUrl()}/api/Bookings/attendees/${encodeURIComponent(inputCode)}/checkin`
      : `${getBaseUrl()}/api/Bookings/attendees/${encodeURIComponent(inputCode)}/checkout`;
    try {
      const res = await doorSignFetch(endpoint, { method: 'POST' });
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

  const stopScanner = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setIsInitializing(false);
    setCameraError(null);
  }, []);

  const startScanner = () => {
    setCameraError(null);
    setIsScanning(true);
  };

  useEffect(() => {
    if (!isScanning) return;
    let mounted = true;
    const scan = () => {
      if (!mounted || !videoRef.current || !canvasRef.current || !isScanning) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (video.readyState === video.HAVE_ENOUGH_DATA && context) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        if (code && code.data) {
          const detectedValue = code.data;
          context.beginPath();
          context.lineWidth = 4;
          context.strokeStyle = "#137fec";
          context.strokeRect(0, 0, canvas.width, canvas.height);
          setTimeout(() => {
            if (mounted) {
              setInputCode(detectedValue);
              stopScanner();
              handleAuth(detectedValue);
            }
          }, 300);
          return;
        }
      }
      requestRef.current = requestAnimationFrame(scan);
    };
    const initCamera = async () => {
      setIsInitializing(true);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('CAMERA API NOT SUPPORTED.');
        setIsInitializing(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (mounted && videoRef.current) {
          streamRef.current = stream;
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            if (mounted) {
              setIsInitializing(false);
              requestRef.current = requestAnimationFrame(scan);
            }
          };
        }
      } catch (err: any) {
        setCameraError('CAMERA ACCESS DENIED.');
        setIsInitializing(false);
      }
    };
    initCamera();
    return () => { mounted = false; stopScanner(); };
  }, [isScanning, handleAuth, stopScanner]);

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden relative text-white font-display">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#0a0a0a]" />
      <div className="absolute top-[-10%] left-[20%] size-[60%] bg-primary/10 blur-[120px] rounded-xl pointer-events-none" />
      
      <header className="relative z-30 flex items-center justify-between px-6 py-4 lg:px-16 shrink-0">
        <div className="w-40 lg:w-48">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-white transition-all group px-4 py-2 lg:px-5 lg:py-3 bg-white/5 border border-white/10 rounded-xl active:scale-95 backdrop-blur-md">
            <span className="material-symbols-outlined text-xl lg:text-2xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-[0.2em]">Return</span>
          </button>
        </div>

        <div className="bg-[#111]/80 p-1.5 rounded-xl border border-white/10 flex gap-1 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-3xl ring-1 ring-white/5 transition-opacity duration-300" style={{ opacity: isAuthenticated ? 0.3 : 1, pointerEvents: isAuthenticated ? 'none' : 'auto' }}>
          <button 
            onClick={() => { setActiveTab('GUEST'); handleClear(); }}
            className={`px-6 lg:px-12 py-2.5 lg:py-3 rounded-xl text-[9px] lg:text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
              activeTab === 'GUEST' ? 'bg-primary text-white shadow-[0_0_30px_rgba(19,127,236,0.4)] ring-1 ring-white/10 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Guest Pass
          </button>
          <button 
            onClick={() => { setActiveTab('EMPLOYEE'); handleClear(); }}
            className={`px-6 lg:px-12 py-2.5 lg:py-3 rounded-xl text-[9px] lg:text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
              activeTab === 'EMPLOYEE' ? 'bg-primary text-white shadow-[0_0_30px_rgba(19,127,236,0.4)] ring-1 ring-white/10 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Employee ID
          </button>
        </div>

        <div className="w-40 lg:w-48" />
      </header>

      <main className="flex-1 flex flex-row px-4 lg:px-12 gap-6 lg:gap-10 relative z-10 max-w-[1440px] mx-auto w-full pb-4 overflow-hidden">
        
        {/* Left Sidebar */}
        <div className="w-52 lg:w-64 flex flex-col gap-3 py-2 shrink-0 h-full transition-opacity duration-300" style={{ opacity: isAuthenticated ? 0.3 : 1, pointerEvents: isAuthenticated ? 'none' : 'auto' }}>
          <div className="bg-white/5 p-1.5 rounded-xl border border-white/5 flex flex-col gap-2 backdrop-blur-lg">
            <button 
              onClick={() => { setMode('CHECK_IN'); handleClear(); }}
              className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-500 group relative overflow-hidden ${
                mode === 'CHECK_IN' ? 'bg-primary/20 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className={`size-9 rounded-xl flex items-center justify-center border transition-all ${mode === 'CHECK_IN' ? 'bg-primary text-white border-primary/20' : 'bg-white/5 border-white/5'}`}>
                <span className="material-symbols-outlined text-lg font-variation-fill">login</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs lg:text-sm font-black uppercase tracking-tight">Check In</span>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Log Presence</span>
              </div>
            </button>

            <button 
              onClick={() => { setMode('CHECK_OUT'); handleClear(); }}
              className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-500 group relative overflow-hidden ${
                mode === 'CHECK_OUT' ? 'bg-primary/20 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className={`size-9 rounded-xl flex items-center justify-center border transition-all ${mode === 'CHECK_OUT' ? 'bg-primary text-white border-primary/20 shadow-[0_0_20px_rgba(19,127,236,0.3)]' : 'bg-white/5 border-white/5'}`}>
                <span className="material-symbols-outlined text-lg font-variation-fill">logout</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs lg:text-sm font-black uppercase tracking-tight">Check Out</span>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Log Exit</span>
              </div>
            </button>
          </div>

          <div className="mt-auto flex flex-col gap-4">
            <button 
              onClick={startScanner}
              className="w-full bg-[#111] border border-primary/40 text-white py-5 lg:py-8 rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-primary/10 hover:border-primary transition-all active:scale-95 group shadow-2xl relative overflow-hidden"
            >
              <div className="size-16 lg:size-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-1">
                 <span className="material-symbols-outlined text-3xl lg:text-4xl text-primary font-variation-fill">qr_code_2</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-lg lg:text-xl font-black uppercase tracking-[0.1em] text-white">SCAN QR</span>
              </div>
            </button>
          </div>
        </div>

        {/* Center Panel */}
        <div className="flex-1 flex flex-col items-center justify-center py-2 overflow-visible">
          <div className="w-full max-w-[480px] bg-white/[0.02] border border-white/10 rounded-xl p-5 lg:p-8 backdrop-blur-3xl shadow-[0_40px_120px_rgba(0,0,0,0.8)] flex flex-col items-center relative group min-h-0 transition-all duration-500">
            <div className="absolute top-0 right-0 size-64 bg-primary/5 blur-[100px] rounded-xl pointer-events-none -translate-y-32 translate-x-32" />
            
            {isAuthenticated ? (
              <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 py-4">
                 <div className="size-32 lg:size-40 rounded-xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(16,185,129,0.3)]">
                   {authenticatedUser?.photo ? (
                     <img src={authenticatedUser.photo} className="size-full object-cover rounded-xl" alt="" />
                   ) : (
                     <span className="material-symbols-outlined text-5xl text-emerald-500 font-variation-fill">verified_user</span>
                   )}
                 </div>
                 
                 <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tight text-white mb-2 leading-none text-center">
                   IDENTITY VERIFIED
                 </h2>
                 <p className="text-slate-500 text-sm font-black uppercase tracking-widest mb-12 opacity-80">
                   {authenticatedUser?.name || 'Authorized User'}
                 </p>

                 <div className="flex flex-col gap-4 w-full px-4">
                    <button 
                      onClick={onConfirmAction}
                      disabled={isApiLoading}
                      className={`w-full py-8 lg:py-10 rounded-xl text-2xl lg:text-3xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 border-t border-white/20 flex items-center justify-center gap-4 disabled:opacity-60 disabled:cursor-not-allowed ${
                        mode === 'CHECK_IN' ? 'bg-white text-black shadow-white/10' : 'bg-status-busy text-white shadow-status-busy/30'
                      }`}
                    >
                      {isApiLoading ? (
                        <span className="size-8 border-4 border-current/30 border-t-current rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-4xl">
                            {mode === 'CHECK_IN' ? 'login' : 'logout'}
                          </span>
                          {mode === 'CHECK_IN' ? 'CONFIRM CHECK IN' : 'CONFIRM CHECK OUT'}
                        </>
                      )}
                    </button>

                    {apiError && (
                      <div className="bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <span className="material-symbols-outlined text-red-500 text-base shrink-0">error</span>
                        <p className="text-red-400 text-[10px] font-bold">{apiError}</p>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => { handleClear(); setApiError(null); }}
                      className="w-full py-5 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                      Cancel & Start Over
                    </button>
                 </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center mb-6 text-center relative z-10">
                  <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl mb-6 shadow-xl backdrop-blur-md">
                    <span className="size-1.5 rounded-xl bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/70">Secure Terminal Online</span>
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-black uppercase tracking-tight text-white mb-2 leading-none">
                    VALIDATE ENTRY
                  </h2>
                  <p className="text-slate-500 text-[10px] lg:text-xs font-medium max-w-[280px] leading-relaxed opacity-80">
                    {activeTab === 'GUEST' ? 'Enter your unique 4-digit PIN.' : 'Enter your Employee ID number.'}
                  </p>
                </div>

                <div className="w-full mb-8 relative z-10 flex justify-center gap-3 lg:gap-5 min-h-[80px]">
                  {activeTab === 'GUEST' ? (
                    [0, 1, 2, 3].map((idx) => (
                      <div 
                        key={idx}
                        className={`size-16 lg:size-20 rounded-xl border-2 flex items-center justify-center text-2xl font-black transition-all duration-500 ${
                          inputCode.length === idx 
                          ? 'border-primary ring-[6px] ring-primary/10 bg-primary/5 scale-105' 
                          : 'border-white/5 bg-black/60 text-white shadow-[inset_0_4px_24px_rgba(0,0,0,0.8)]'
                        }`}
                      >
                        {inputCode[idx] ? (
                          <div className="size-4 lg:size-5 rounded-xl bg-white shadow-[0_0_20px_white] animate-in zoom-in-0 duration-300" />
                        ) : (
                          <div className="size-4 lg:size-5 rounded-xl bg-white/[0.02]" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="w-full bg-black/60 border-2 border-white/5 rounded-xl flex items-center justify-center p-4 shadow-[inset_0_4px_24px_rgba(0,0,0,0.8)] min-h-[80px]">
                      <span className={`text-4xl lg:text-5xl font-black tracking-widest transition-all duration-300 ${inputCode ? 'text-white' : 'text-white/10'}`}>
                        {inputCode || 'ID NUMBER'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 lg:gap-4 w-full max-w-[340px] mb-2 relative z-10">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'delete'].map((key, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (key === 'delete') handleBackspace();
                        else if (key === 'C') handleClear();
                        else handleKeyPress(key);
                      }}
                      className={`h-14 lg:h-16 flex items-center justify-center rounded-xl text-2xl lg:text-3xl font-black transition-all border border-white/5 active:scale-90 shadow-2xl ${
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

                {activeTab === 'EMPLOYEE' && (
                  <button 
                    onClick={() => handleAuth()}
                    disabled={!inputCode}
                    className="w-full max-w-[340px] mt-6 bg-white text-black py-5 rounded-xl text-lg font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-30 border-t border-white/20 relative z-10"
                  >
                    IDENTIFY
                  </button>
                )}
              </>
            )}

            {error && (
              <div className="mt-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-red-500/25 border border-red-500/40 px-5 py-2 rounded-xl text-red-500 text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
                   Access Denied
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Face Feedback Survey Modal */}
      {showFaceSurvey && (
        <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-white/5 flex flex-col items-center gap-1">
              <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2">
                <span className="material-symbols-outlined text-2xl">reviews</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Quick Feedback</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">How was your session?</p>
            </div>

            {/* Ratings */}
            <div className="flex flex-col divide-y divide-white/5">
              {/* Row 1 */}
              <div className="flex items-center px-8 py-5 gap-4">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-white font-black text-xs uppercase tracking-widest">Room Condition</span>
                  <span className="text-slate-500 text-[10px] font-medium">Infrastructure & cleanliness</span>
                </div>
                <div className="flex items-center gap-2">
                  {([
                    { v: 'EXCELLENT', icon: 'sentiment_very_satisfied', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
                    { v: 'NEUTRAL',   icon: 'sentiment_neutral',         color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30' },
                    { v: 'POOR',      icon: 'sentiment_very_dissatisfied',color: 'text-red-400',   bg: 'bg-red-400/10 border-red-400/30' },
                  ] as const).map(({ v, icon, color, bg }) => (
                    <button key={v} onClick={() => setRatings(prev => ({ ...prev, room: v }))}
                      className={`size-12 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                        ratings.room === v ? `${bg} ${color}` : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
                      }`}>
                      <span className="material-symbols-outlined text-2xl font-variation-fill">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex items-center px-8 py-5 gap-4">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-white font-black text-xs uppercase tracking-widest">Event Experience</span>
                  <span className="text-slate-500 text-[10px] font-medium">Productivity & overall feel</span>
                </div>
                <div className="flex items-center gap-2">
                  {([
                    { v: 'PRODUCTIVE', icon: 'rocket_launch',  color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' },
                    { v: 'NEUTRAL',    icon: 'meeting_room',   color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30' },
                    { v: 'POOR',       icon: 'error',          color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30' },
                  ] as const).map(({ v, icon, color, bg }) => (
                    <button key={v} onClick={() => setRatings(prev => ({ ...prev, event: v }))}
                      className={`size-12 rounded-xl border flex items-center justify-center transition-all active:scale-95 ${
                        ratings.event === v ? `${bg} ${color}` : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
                      }`}>
                      <span className="material-symbols-outlined text-2xl font-variation-fill">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-8 py-6 flex flex-col gap-3 border-t border-white/5">
              <button onClick={submitFeedback}
                className="w-full bg-primary text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">
                Confirm &amp; Finish
              </button>
              <button onClick={submitFeedback}
                className="w-full text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] hover:text-slate-300 transition-colors py-1">
                Skip Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[160] bg-black/98 backdrop-blur-[100px] flex items-center justify-center p-8 animate-in fade-in duration-700">
          <div className="bg-[#0b1a2d] w-full max-w-xl rounded-xl border border-white/10 p-12 lg:p-16 flex flex-col items-center shadow-2xl relative">
            <div className="size-40 lg:size-48 rounded-xl bg-emerald-500/10 border-8 border-emerald-500/20 flex items-center justify-center mb-10 shadow-[0_0_80px_rgba(16,185,129,0.2)]">
              <span className="material-symbols-outlined text-emerald-500 text-7xl lg:text-[100px] font-bold animate-in zoom-in duration-700 font-variation-fill">verified</span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tighter mb-4 uppercase text-center">Verified</h2>
            <p className="text-slate-400 text-center text-xl lg:text-2xl font-medium leading-relaxed max-w-sm mb-12">
              Sync complete. Your session status has been updated.
            </p>
            <button 
              onClick={() => { setShowSuccessModal(false); onBack(); }}
              className="w-full bg-emerald-500 text-white py-8 lg:py-10 rounded-xl text-xl lg:text-2xl font-black shadow-2xl shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all uppercase tracking-widest border-t border-white/20"
            >
              Finish
            </button>
          </div>
        </div>
      )}

      {/* Scanner Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-[60px] flex items-center justify-center p-8 animate-in fade-in duration-500">
           <div className="w-full max-w-4xl h-[80vh] bg-[#0b1a2d] rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
              <div className="p-8 flex items-center justify-between border-b border-white/5 bg-black/40 z-20">
                <h3 className="text-3xl font-black text-white uppercase tracking-tight">QR TERMINAL</h3>
                <button onClick={stopScanner} className="size-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-4xl">close</span>
                </button>
              </div>
              <div className="relative flex-1 bg-[#050505] overflow-hidden flex items-center justify-center">
                {isInitializing ? (
                  <div className="size-16 border-4 border-primary/20 border-t-primary rounded-xl animate-spin"></div>
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="size-80 border-2 border-primary/30 rounded-xl relative">
                         <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary shadow-[0_0_40px_#137fec] animate-scanner"></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
           </div>
        </div>
      )}

      <style>{`
        @keyframes scanner { 0% { top: 10%; opacity: 0.2; } 50% { top: 90%; opacity: 0.8; } 100% { top: 10%; opacity: 0.2; } }
        .animate-scanner { animation: scanner 2.5s infinite; }
      `}</style>
    </div>
  );
};

const FaceButton: React.FC<{ 
  icon: string; 
  color: string; 
  label: string; 
  active?: boolean;
  onClick: () => void 
}> = ({ icon, color, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-4 group transition-all"
  >
    <div className={`size-20 lg:size-24 rounded-xl border-2 flex items-center justify-center transition-all duration-500 shadow-xl ${
      active 
        ? `${color} bg-white/10 border-current shadow-[0_0_30px_currentColor] scale-110` 
        : `bg-white/5 border-white/10 text-slate-600 group-hover:text-slate-300 group-hover:border-white/20`
    }`}>
       <span className="material-symbols-outlined text-4xl lg:text-5xl font-variation-fill">{icon}</span>
    </div>
    <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors ${
      active ? color : 'text-slate-600 group-hover:text-slate-400'
    }`}>
      {label}
    </span>
  </button>
);

export default CheckInOutView;