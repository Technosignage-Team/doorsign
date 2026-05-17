import { registerPlugin } from '@capacitor/core';

/**
 * LED color codes from the screen vendor doc:
 *   0x04 → 红色   (red)
 *   0x05 → 蓝色   (blue)
 *   0x06 → 绿色   (green)
 *   0x0b → 七色混闪 (seven-color flashing)
 *
 * NOTE: On some hardware revisions the firmware has green and blue swapped
 * relative to the doc. Use the LED Test panel in Settings to verify and the
 * `setAvailableCode` / `setBusyCode` helpers below (or localStorage keys
 * `led.availableCode` / `led.busyCode`) to override at runtime — no rebuild.
 */
export const LedCode = {
  RED:   '0x04',
  BLUE:  '0x05',
  GREEN: '0x06',
  FLASH: '0x0b',
} as const;

export type LedColor = keyof typeof LedCode;

interface LedPlugin {
  setColor(options: { code: string }): Promise<{ success: boolean; method?: string }>;
}

const Led = registerPlugin<LedPlugin>('Led');

const LS_AVAILABLE = 'led.availableCode';
const LS_BUSY = 'led.busyCode';

/** Default codes — overridden by localStorage if the user picks differently. */
const DEFAULT_AVAILABLE = LedCode.GREEN; // doc says green = free
const DEFAULT_BUSY = LedCode.RED;        // doc says red   = booked

export function getAvailableCode(): string {
  try { return localStorage.getItem(LS_AVAILABLE) || DEFAULT_AVAILABLE; }
  catch { return DEFAULT_AVAILABLE; }
}
export function getBusyCode(): string {
  try { return localStorage.getItem(LS_BUSY) || DEFAULT_BUSY; }
  catch { return DEFAULT_BUSY; }
}
export function setAvailableCode(code: string): void {
  try { localStorage.setItem(LS_AVAILABLE, code); } catch { /* ignore */ }
  // forget cache so the next call actually re-sends
  lastCode = null;
}
export function setBusyCode(code: string): void {
  try { localStorage.setItem(LS_BUSY, code); } catch { /* ignore */ }
  lastCode = null;
}

// Remember the last color we asked for, so we can ignore redundant writes.
let lastCode: string | null = null;

async function writeColor(code: string): Promise<void> {
  try {
    const res = await Led.setColor({ code });
    lastCode = code;
    // eslint-disable-next-line no-console
    console.log('[LED] setColor', code, res);
  } catch (e) {
    // non-LED device or sysfs not writable — log and ignore
    // eslint-disable-next-line no-console
    console.warn('[LED] setColor failed for', code, e);
  }
}

/** Room is free → "available" color (default green 0x06). */
export async function setLedAvailable(): Promise<void> {
  const code = getAvailableCode();
  if (lastCode === code) return;
  await writeColor(code);
}

/** Room is occupied → "busy" color (default red 0x04). */
export async function setLedBusy(): Promise<void> {
  const code = getBusyCode();
  if (lastCode === code) return;
  await writeColor(code);
}

/** Solid BLUE (0x05). */
export async function setLedBlue(): Promise<void> {
  if (lastCode === LedCode.BLUE) return;
  await writeColor(LedCode.BLUE);
}

/** Seven-color flashing (0x0b). */
export async function setLedFlash(): Promise<void> {
  if (lastCode === LedCode.FLASH) return;
  await writeColor(LedCode.FLASH);
}

/** Generic helper — set any color by name. */
export async function setLed(color: LedColor): Promise<void> {
  await writeColor(LedCode[color]);
}

/** Generic helper — set any code (e.g. '0x06') directly. */
export async function setLedRaw(code: string): Promise<void> {
  await writeColor(code);
}

/** Force re-send the appropriate color for the current room state. */
export async function refreshLed(isAvailable: boolean): Promise<void> {
  lastCode = null;
  if (isAvailable) await setLedAvailable();
  else await setLedBusy();
}
