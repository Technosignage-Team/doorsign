import { Preferences } from '@capacitor/preferences';

const ACTIVATION_KEY_STORAGE = 'activation_key';
const STATIC_KEY = (import.meta as any).env?.VITE_STATIC_ACTIVATION_KEY as string | undefined;

export async function setActivationKey(key: string) {
  if (STATIC_KEY) return; // locked in static mode
  await Preferences.set({ key: ACTIVATION_KEY_STORAGE, value: key });
}

export async function getActivationKey(): Promise<string | null> {
  if (STATIC_KEY) return STATIC_KEY;
  const { value } = await Preferences.get({ key: ACTIVATION_KEY_STORAGE });
  return value || null;
}
