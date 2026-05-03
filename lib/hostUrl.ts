import { Preferences } from '@capacitor/preferences';

const HOST_URL_KEY = 'host_url';
let _cached = '';

export async function setHostUrl(url: string): Promise<void> {
  const normalized = url.replace(/\/+$/, '');
  _cached = normalized;
  await Preferences.set({ key: HOST_URL_KEY, value: normalized });
}

export async function loadHostUrl(): Promise<string> {
  if (_cached) return _cached;
  const { value } = await Preferences.get({ key: HOST_URL_KEY });
  _cached = value ?? '';
  return _cached;
}

export function getBaseUrl(): string {
  return _cached;
}
