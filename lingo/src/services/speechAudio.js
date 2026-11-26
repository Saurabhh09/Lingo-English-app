/**
 * Cross-platform Audio/Speech & Share/Clipboard helpers.
 * Fixes Android WebView cases where window.speechSynthesis is absent or muted,
 * navigator.clipboard rejects, or window.location.origin resolves to https://localhost.
 */

import { isNativePlatform } from '../apiConfig.js';

const DEFAULT_PUBLIC_WEB_ORIGIN = 'https://lingo-ruby-three.vercel.app';

let audioCtx = null;

function playGentleAudioCue() {
  try {
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) return false;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => { });
    }
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.11);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
    return true;
  } catch {
    return false;
  }
}

export function speakEnglishText(text, { audioUrl = null, rate = 0.85, onUnavailable = null } = {}) {
  const cleanText = String(text || '').trim();
  if (!cleanText && !audioUrl) return false;

  if (audioUrl) {
    try {
      const a = new Audio(audioUrl);
      a.play().catch(() => {
        speakEnglishText(cleanText, { rate, onUnavailable });
      });
      return true;
    } catch { }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function') {
    try {
      window.speechSynthesis.cancel();
      const utter = new window.SpeechSynthesisUtterance(cleanText);
      utter.lang = 'en-US';
      utter.rate = rate;
      let started = false;
      utter.onstart = () => { started = true; };
      utter.onerror = () => {
        if (!started) {
          playGentleAudioCue();
          onUnavailable?.();
        }
      };
      window.speechSynthesis.speak(utter);
      return true;
    } catch { }
  }

  playGentleAudioCue();
  onUnavailable?.();
  return false;
}

export async function copyTextReliably(text) {
  const value = String(text ?? '');
  if (!value) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { }

  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function getPublicShareOrigin() {
  if (isNativePlatform()) {
    return (import.meta.env.VITE_API_BASE_URL || DEFAULT_PUBLIC_WEB_ORIGIN).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return DEFAULT_PUBLIC_WEB_ORIGIN;
}
