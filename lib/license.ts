import { Preferences } from '@capacitor/preferences';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

const LICENSE_KEY = 'sw_license';
const DEVICE_ID_KEY = 'sw_device_id';

export const LICENSE_API = 'https://sw-subscription-1.onrender.com/api/license/activate';

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

/** True if the server has marked this license as anything other than active
 * (e.g. revoked, suspended, cancelled). Missing/empty status is treated as
 * active so cached licenses from before this field existed aren't locked out. */
export function isLicenseRevoked(license: LicenseInfo): boolean {
  return !!license.status && license.status.toLowerCase() !== 'active';
}

/**
 * Re-validates the stored license against the subscription server, persisting
 * any updated status/expiry. Returns the refreshed license, or null if the
 * check couldn't complete (offline, server error, no stored license, etc.) —
 * callers should keep using the previously cached license in that case.
 */
export async function refreshLicenseStatus(): Promise<LicenseInfo | null> {
  const current = await getLicense();
  if (!current?.licenseKey) return null;

  try {
    const deviceInfo = await getDeviceId();
    const body = { licenseKey: current.licenseKey, deviceInfo };

    let ok: boolean;
    let data: any;

    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url: LICENSE_API,
        headers: { 'Content-Type': 'application/json' },
        data: body,
      });
      ok = response.status >= 200 && response.status < 300;
      data = response.data;
    } else {
      const res = await fetch(LICENSE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      ok = res.ok;
      data = await res.json();
    }

    if (!ok || !data?.success || !data?.license) return null;

    const updated = data.license as LicenseInfo;
    await setLicense(updated);
    return updated;
  } catch {
    return null;
  }
}
