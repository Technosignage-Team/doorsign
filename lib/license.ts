import { Preferences } from '@capacitor/preferences';

const LICENSE_KEY = 'sw_license';
const DEVICE_ID_KEY = 'sw_device_id';

export interface LicenseInfo {
  licenseKey: string;
  tenantKey: string;
  companyName: string;
  plan: string;
  activationKey: string;
  signType: string;
  status: string;
  activatedAt: string;
  expiryDate: string;
  deviceInfo: string;
}

export async function getDeviceId(): Promise<string> {
  try {
    const { value } = await Preferences.get({ key: DEVICE_ID_KEY });
    if (value) return value;
    const id = 'doorsign-' + Math.random().toString(36).slice(2, 11);
    await Preferences.set({ key: DEVICE_ID_KEY, value: id });
    return id;
  } catch {
    // Fallback for browser/web mode where Capacitor Preferences may not be ready
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'doorsign-' + Math.random().toString(36).slice(2, 11);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }
}

export async function setLicense(info: LicenseInfo): Promise<void> {
  await Preferences.set({ key: LICENSE_KEY, value: JSON.stringify(info) });
}

export async function getLicense(): Promise<LicenseInfo | null> {
  const { value } = await Preferences.get({ key: LICENSE_KEY });
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

/** Days remaining until expiry. Negative = already expired. */
export function daysUntilExpiry(license: LicenseInfo): number {
  const expiry = new Date(license.expiryDate).getTime();
  const now = Date.now();
  return Math.floor((expiry - now) / (1000 * 60 * 60 * 24));
}

export function isLicenseExpired(license: LicenseInfo): boolean {
  return daysUntilExpiry(license) < 0;
}

export function isLicenseExpiringSoon(license: LicenseInfo, withinDays = 30): boolean {
  const days = daysUntilExpiry(license);
  return days >= 0 && days <= withinDays;
}
