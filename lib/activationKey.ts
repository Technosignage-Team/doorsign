import { Preferences } from '@capacitor/preferences';

const ACTIVATION_KEY_STORAGE = 'activation_key';

export async function setActivationKey(key: string) {
  await Preferences.set({ key: ACTIVATION_KEY_STORAGE, value: key });
}

export async function getActivationKey(): Promise<string | null> {
  const { value } = await Preferences.get({ key: ACTIVATION_KEY_STORAGE });
  return value || null;
}
