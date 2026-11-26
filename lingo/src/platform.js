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
