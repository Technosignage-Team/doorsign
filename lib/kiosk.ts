import { registerPlugin } from '@capacitor/core';

interface KioskPlugin {
  start(): Promise<void>;
  stop(): Promise<void>;
}

const Kiosk = registerPlugin<KioskPlugin>('Kiosk');

export async function startKioskLockTask(): Promise<void> {
  try {
    await Kiosk.start();
  } catch (e) {
    console.warn('[Kiosk] startLockTask unavailable:', e);
  }
}

export async function stopKioskLockTask(): Promise<void> {
  try {
    await Kiosk.stop();
  } catch (e) {
    console.warn('[Kiosk] stopLockTask unavailable:', e);
  }
}
