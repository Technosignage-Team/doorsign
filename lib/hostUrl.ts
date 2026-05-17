import { Preferences } from '@capacitor/preferences';

const HOST_URL_KEY = 'host_url';
const STATIC_URL = (import.meta as any).env?.VITE_STATIC_HOST_URL as string | undefined;
let _cached = STATIC_URL ?? '';

export async function setHostUrl(url: string): Promise<void> {
  if (STATIC_URL) return; // locked in static mode
  const normalized = url.replace(/\/+$/, '');
  _cached = normalized;
  await Preferences.set({ key: HOST_URL_KEY, value: normalized });
}

export async function loadHostUrl(): Promise<string> {
  if (STATIC_URL) return STATIC_URL;
  if (_cached) return _cached;
  const { value } = await Preferences.get({ key: HOST_URL_KEY });
  _cached = value ?? '';
  return _cached;
}

export function getBaseUrl(): string {
  return _cached;
}
