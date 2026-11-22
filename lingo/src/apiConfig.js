// Centralized API configuration for Lingo Play & Learn
// In web mode (Vercel / localhost), relative URLs (/api) are used seamlessly.
// In mobile APK mode (Capacitor), VITE_API_BASE_URL routes requests to the production backend.

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${API_BASE}${cleanPath}`;
}

export function isNativePlatform() {
  return typeof window !== 'undefined' && !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.platform === 'android' || window.Capacitor?.platform === 'ios');
}
