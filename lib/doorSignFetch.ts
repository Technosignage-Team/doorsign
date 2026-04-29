import { getActivationKey } from './activationKey';

// Always adds isDoorSign: true header and ActivationKey if available
export async function doorSignFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('isDoorSign', 'true');
  const activationKey = await getActivationKey();
  if (activationKey) headers.set('ActivationKey', activationKey);
  return fetch(input, { ...init, headers });
}
