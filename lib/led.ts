import { registerPlugin } from '@capacitor/core';

/**
 * LED color codes from the screen vendor doc:
 *   0x04 → 红色   (red)
 *   0x05 → 蓝色   (blue)
 *   0x06 → 绿色   (green)
 *   0x0b → 七色混闪 (seven-color flashing)
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

// Remember the last color we asked for, so we can ignore redundant writes
// (some drivers ignore back-to-back identical writes, or transition oddly).
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

/** Room is free → solid GREEN (0x06). */
export async function setLedAvailable(): Promise<void> {
  if (lastCode === LedCode.GREEN) return;
  await writeColor(LedCode.GREEN);
}

/** Room is occupied → solid RED (0x04). */
export async function setLedBusy(): Promise<void> {
  if (lastCode === LedCode.RED) return;
  await writeColor(LedCode.RED);
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

/** Generic helper if you need to set any color by name. */
export async function setLed(color: LedColor): Promise<void> {
  await writeColor(LedCode[color]);
}
