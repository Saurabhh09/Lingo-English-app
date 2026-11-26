import { isNativePlatform } from './apiConfig.js';

/**
 * UI platform detector. Kept separate from API/Capacitor transport logic in apiConfig.js
 * so dev-only ?platform=native / ?platform=web previews only affect UI rendering.
 */
export function isNativeUI() {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const override = new URLSearchParams(window.location.search).get('platform');
    if (override === 'native') return true;
    if (override === 'web') return false;
  }
  return isNativePlatform();
}

export function isIOSBrowser() {
  if (isNativeUI() || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Applies DOM platform attribute and relaxes user pinch-zoom only on web browsers.
 * Never mutates Android native WebView viewport constraints.
 */
export function configureWebPlatformDocument() {
  if (typeof document === 'undefined') return 'web';
  const native = isNativeUI();
  const mode = native ? 'native' : 'web';
  document.documentElement.dataset.platform = mode;
  if (!native) {
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) {
      vp.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
    }
  }
  return mode;
}
