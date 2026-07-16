import { getBaseUrl } from './hostUrl';

// Legacy resource/amenity image fields used to store a raw base64 payload
// (no `data:` prefix). The backend now stores a URL path instead, but old
// rows may still hold the raw base64 form, so both must keep working.
const BASE64_SIGNATURES: Array<[string, string]> = [
  ['/9j/', 'image/jpeg'],
  ['iVBORw0KGgo', 'image/png'],
  ['R0lGOD', 'image/gif'],
  ['UklGR', 'image/webp'],
  ['Qk0', 'image/bmp'],
];

/**
 * Normalizes a resource/amenity image field into something usable directly
 * as an <img src> or CSS url(): passes through data URIs and absolute URLs,
 * resolves server-relative paths against the configured host, and wraps
 * legacy raw base64 payloads in a data URI.
 *
 * Known base64 signatures are checked before the leading-slash path check
 * because raw JPEG base64 payloads start with "/9j/", which would otherwise
 * be mistaken for a server-relative URL path.
 */
export function resolveImageSrc(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base64Signature = BASE64_SIGNATURES.find(([prefix]) => trimmed.startsWith(prefix));
  if (base64Signature) return `data:${base64Signature[1]};base64,${trimmed}`;
  if (trimmed.startsWith('/')) return `${getBaseUrl()}${trimmed}`;
  return `data:image/png;base64,${trimmed}`;
}
