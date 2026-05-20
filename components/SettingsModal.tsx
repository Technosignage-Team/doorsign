
import React, { useState } from 'react';
import { HomeLayout } from '../types';
import {
  setLed,
  LedCode,
  LedColor,
  getAvailableCode,
  getBusyCode,
  setAvailableCode,
  setBusyCode,
  ledShell,
  readLed,
} from '../lib/led';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: HomeLayout;
  onSelectLayout: (layout: HomeLayout) => void;
  currentSlotPrecision: 15 | 30;
  onSelectSlotPrecision: (precision: 15 | 30) => void;
  onOpenConfiguration: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentLayout,
  onSelectLayout,
  currentSlotPrecision,
  onSelectSlotPrecision,
  onOpenConfiguration,
}) => {
  const [ledStatus, setLedStatus] = useState<string>('');
  const [availableCode, setAvailableCodeState] = useState<string>(() => getAvailableCode());
  const [busyCode, setBusyCodeState] = useState<string>(() => getBusyCode());
  if (!isOpen) return null;

  const ledTest = async (color: LedColor) => {
    setLedStatus(`Sending ${color} (${LedCode[color]})…`);
    try {
      const res: any = await setLed(color);
      const method = res?.method ?? 'unknown';
      const trace = res?.trace ? `\nTrace: ${res.trace}` : '';
      setLedStatus(`✓ ${color} (${LedCode[color]}) sent via ${method}${trace}`);
    } catch (e: any) {
      const trace = e?.data?.trace ?? e?.trace ?? '';
      setLedStatus(`✗ ${color} (${LedCode[color]}) failed: ${e?.message ?? e}${trace ? `\nTrace: ${trace}` : ''}`);
    }
  };

  const runDiagnostic = async () => {
    setLedStatus('Running LED diagnostics…');
    const lines: string[] = [];
    // 1) try to read current LED value
    lines.push(`readLed → ${await readLed()}`);
    // 2) check which writers work
    try {
      const a = await ledShell(`ls -l /sys/devices/platform/led_con_h/zigbee_reset`, false);
      lines.push(`ls (sh) exit=${a.exit} ${a.stdout}${a.stderr ? ' err=' + a.stderr : ''}`);
    } catch (e: any) { lines.push(`ls (sh) threw ${e?.message}`); }
    try {
      const b = await ledShell(`echo w 0x06 > /sys/devices/platform/led_con_h/zigbee_reset`, false);
      lines.push(`write (sh) exit=${b.exit}${b.stderr ? ' err=' + b.stderr : ''}`);
    } catch (e: any) { lines.push(`write (sh) threw ${e?.message}`); }
    try {
      const c = await ledShell(`echo w 0x06 > /sys/devices/platform/led_con_h/zigbee_reset`, true);
      lines.push(`write (su) exit=${c.exit}${c.stderr ? ' err=' + c.stderr : ''}`);
    } catch (e: any) { lines.push(`write (su) threw ${e?.message}`); }
    try {
      const d = await ledShell(`id`, false);
      lines.push(`id (sh) → ${d.stdout || d.stderr}`);
    } catch (e: any) { lines.push(`id (sh) threw ${e?.message}`); }
    try {
      const e2 = await ledShell(`which su`, false);
      lines.push(`which su → ${e2.stdout || '(none)'}`);
    } catch (e: any) { lines.push(`which su threw ${e?.message}`); }
    setLedStatus(lines.join('\n'));
  };

  const bindAvailable = (color: LedColor) => {
    setAvailableCode(LedCode[color]);
    setAvailableCodeState(LedCode[color]);
    setLedStatus(`✓ Saved: room-FREE will now use ${color} (${LedCode[color]})`);
  };
  const bindBusy = (color: LedColor) => {
    setBusyCode(LedCode[color]);
    setBusyCodeState(LedCode[color]);
    setLedStatus(`✓ Saved: room-BUSY will now use ${color} (${LedCode[color]})`);
  };

  const codeToName = (code: string): LedColor | string => {
    const entry = (Object.entries(LedCode) as Array<[LedColor, string]>).find(([, c]) => c === code);
    return entry ? entry[0] : code;
  };

  const layouts = [
    { id: HomeLayout.SPLIT_SCREEN, name: 'Split Screen', desc: 'High-impact split view with vertical imagery', icon: 'view_agenda' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-3xl" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-card-dark rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="p-10 border-b border-white/5 flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-3xl font-black text-white">System Settings</h2>
            <p className="text-slate-300 font-bold uppercase tracking-widest text-xs mt-1">Appearance & Layout</p>
          </div>
          <button onClick={onClose} className="size-12 rounded-xl bg-white/5 text-slate-300 flex items-center justify-center hover:text-white hover:bg-white/10 transition-all">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        <main className="p-10 flex flex-col gap-10 overflow-y-auto custom-scrollbar min-h-0">
          <div>
            <h3 className="text-white text-xl font-black mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">grid_view</span>
              Home Dashboard Layout
            </h3>

            <div className="grid grid-cols-1 gap-4">
              {layouts.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => {
                    onSelectLayout(layout.id);
                  }}
                  className={`flex items-center gap-6 p-8 rounded-xl border-2 transition-all text-left group ${
                    currentLayout === layout.id
                      ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
                      : 'bg-white/5 border-transparent hover:border-white/20'
                  }`}
                >
                  <div className={`size-16 rounded-xl flex items-center justify-center transition-all ${
                    currentLayout === layout.id ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300 group-hover:text-white'
                  }`}>
                    <span className="material-symbols-outlined text-3xl">{layout.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-xl font-black ${currentLayout === layout.id ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                      {layout.name}
                    </p>
                    <p className="text-slate-300 font-medium text-sm mt-1">{layout.desc}</p>
                  </div>
                  {currentLayout === layout.id && (
                    <span className="material-symbols-outlined text-primary text-3xl">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white text-xl font-black mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">linear_scale</span>
              Timeline Precision
            </h3>
            <div className="bg-white/5 p-2 rounded-xl border border-white/5 flex gap-2">
               <button
                onClick={() => onSelectSlotPrecision(15)}
                className={`flex-1 py-6 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${currentSlotPrecision === 15 ? 'bg-primary text-white shadow-xl' : 'text-slate-300 hover:text-slate-200'}`}
               >
                 15 Minutes
               </button>
               <button
                onClick={() => onSelectSlotPrecision(30)}
                className={`flex-1 py-6 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${currentSlotPrecision === 30 ? 'bg-primary text-white shadow-xl' : 'text-slate-300 hover:text-slate-200'}`}
               >
                 30 Minutes
               </button>
            </div>
            <p className="mt-4 px-4 text-slate-300 text-[10px] font-medium leading-relaxed uppercase tracking-wider">
              Adjusts the density of the grid in the Timeline Schedule view. Higher precision allows for more detailed booking views.
            </p>
          </div>

          {/* LED Test Panel — tap a color to drive the hardware bar, then "Bind"
              the one that actually displays correctly to the FREE/BUSY state. */}
          <div className="pt-2 border-t border-white/5">
            <h3 className="text-white text-xl font-black mb-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">lightbulb</span>
              LED Test &amp; Binding
            </h3>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              Tap a color to send it to the door-sign LED bar. If the wrong color
              lights up, use the small <b>Free</b> / <b>Busy</b> buttons to bind
              whichever code actually matches what you want for each room state.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['RED', 'BLUE', 'GREEN', 'FLASH'] as LedColor[]).map((color) => {
                const bg =
                  color === 'RED'   ? 'bg-red-600' :
                  color === 'BLUE'  ? 'bg-blue-600' :
                  color === 'GREEN' ? 'bg-green-600' :
                  'bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400';
                const isFree = availableCode === LedCode[color];
                const isBusy = busyCode === LedCode[color];
                return (
                  <div key={color} className="flex flex-col gap-2">
                    <button
                      onClick={() => ledTest(color)}
                      className={`py-5 rounded-xl font-black uppercase tracking-widest text-xs text-white ${bg} hover:brightness-110 active:scale-95 transition-all shadow-lg`}
                    >
                      {color}<br />
                      <span className="text-[10px] opacity-70">{LedCode[color]}</span>
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => bindAvailable(color)}
                        className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                          isFree
                            ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
                        }`}
                        title="Use this code when the room is FREE"
                      >
                        {isFree ? '✓ Free' : 'Free'}
                      </button>
                      <button
                        onClick={() => bindBusy(color)}
                        className={`flex-1 py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                          isBusy
                            ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
                        }`}
                        title="Use this code when the room is BUSY"
                      >
                        {isBusy ? '✓ Busy' : 'Busy'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
              <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                <span className="opacity-70 mr-1">FREE →</span>
                <b>{codeToName(availableCode)}</b> ({availableCode})
              </div>
              <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200">
                <span className="opacity-70 mr-1">BUSY →</span>
                <b>{codeToName(busyCode)}</b> ({busyCode})
              </div>
            </div>

            <button
              onClick={runDiagnostic}
              className="mt-3 w-full py-3 rounded-lg text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-200 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
            >
              Run LED Diagnostics
            </button>

            {ledStatus && (
              <pre className="mt-4 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-[11px] font-mono whitespace-pre-wrap break-words max-h-60 overflow-auto custom-scrollbar">
{ledStatus}
              </pre>
            )}
          </div>

          {/* Configuration entry */}
          <div className="pt-2 border-t border-white/5">
            <button
              onClick={onOpenConfiguration}
              className="w-full flex items-center gap-5 p-6 rounded-xl bg-white/5 border border-white/8 hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
            >
              <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                <span className="material-symbols-outlined text-primary text-2xl">tune</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-black text-base">Configuration</p>
                <p className="text-slate-400 text-xs mt-0.5">Connection URL & activation key</p>
              </div>
              <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors">chevron_right</span>
            </button>
          </div>

          <div className="border-t border-white/5 opacity-50">
             <div className="flex items-center justify-between text-slate-300 text-xs font-black uppercase tracking-widest pt-6">
                <span>Display Version 2.6.0</span>
                <span>EVEREST ROOM CORE</span>
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsModal;
