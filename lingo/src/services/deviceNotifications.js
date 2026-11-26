/**
 * Device Status-Bar & Daily Reminder Notification Bridge.
 * Supports @capacitor/local-notifications on Android and Web Notification API fallback,
 * honoring per-category user preferences for ALL app & daily reminder notifications.
 */

import { isNativePlatform } from '../apiConfig.js';
import { buildPersonalizedDailyReminders } from '../../server/reminderEngine.mjs';

const PREFS_KEY = 'lingo-device-notif-prefs';
const DELIVERED_IDS_KEY = 'lingo-os-delivered-notif-ids';
const WEB_DAILY_SENT_KEY = 'lingo-web-daily-reminder-date';

const JOURNEY_OS_ID = 9001;
const MOTIVATION_OS_ID = 9002;

export const DEFAULT_CATEGORY_PREFS = {
  gameInvites: true,
  challengeSent: true,
  friendRequests: true,
  communityUpdates: true,
  achievements: true,
  dailyJourney: true,
  dailyMotivation: true
};

const DEFAULT_PREFS = {
  enabled: true,
  journeyHour: 9,
  journeyMinute: 0,
  motivationHour: 19,
  motivationMinute: 30,
  categories: { ...DEFAULT_CATEGORY_PREFS }
};

let channelsReady = false;
let listenerAttached = false;

export function getNotificationPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS, categories: { ...DEFAULT_CATEGORY_PREFS } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFS,
      ...(parsed || {}),
      categories: {
        ...DEFAULT_CATEGORY_PREFS,
        ...(parsed?.categories || {})
      }
    };
  } catch {
    return { ...DEFAULT_PREFS, categories: { ...DEFAULT_CATEGORY_PREFS } };
  }
}

export function saveNotificationPrefs(next) {
  const current = getNotificationPrefs();
  const merged = {
    ...DEFAULT_PREFS,
    ...current,
    ...(next || {}),
    categories: {
      ...DEFAULT_CATEGORY_PREFS,
      ...(current.categories || {}),
      ...(next?.categories || {})
    }
  };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
  } catch { }
  return merged;
}

export function isNotificationCategoryEnabled(prefs, category) {
  if (!prefs?.enabled) return false;
  if (!category) return true;
  return prefs.categories?.[category] !== false;
}

function mapAppNotifCategory(n) {
  const t = String(n?.type || '').toLowerCase();
  const title = String(n?.title || '').toLowerCase();
  if (t === 'game_invitation') {
    return title.includes('accepted') ? 'challengeSent' : 'gameInvites';
  }
  if (t === 'friend_request' || t === 'friendship_update') return 'friendRequests';
  if (t === 'community_invitation' || t === 'community_update') return 'communityUpdates';
  if (t === 'badge' || t === 'reward') return 'achievements';
  return 'gameInvites';
}

function getDeliveredIdSet() {
  try {
    const raw = localStorage.getItem(DELIVERED_IDS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markDeliveredIds(ids) {
  try {
    const arr = [...ids].slice(-200);
    localStorage.setItem(DELIVERED_IDS_KEY, JSON.stringify(arr));
  } catch { }
}

function hashIdToInt(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 800000000) + 10000;
}

async function getNativePlugin() {
  if (!isNativePlatform()) return null;
  try {
    const mod = await import('@capacitor/local-notifications');
    return mod?.LocalNotifications || null;
  } catch {
    return null;
  }
}

export async function getDeviceNotificationPermissionState() {
  const native = await getNativePlugin();
  if (native) {
    try {
      const res = await native.checkPermissions();
      return res?.display || 'prompt';
    } catch {
      return 'prompt';
    }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return window.Notification.permission;
  }
  return 'unsupported';
}

export async function requestDeviceNotificationPermission() {
  const native = await getNativePlugin();
  if (native) {
    try {
      const res = await native.requestPermissions();
      await ensureChannels(native);
      return res?.display === 'granted';
    } catch {
      return false;
    }
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await window.Notification.requestPermission();
      return perm === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

async function ensureChannels(native) {
  if (!native || channelsReady) return;
  try {
    await native.createChannel({
      id: 'lingo-social',
      name: 'Friends, Challenges & Achievements',
      description: 'Game invitations, accepted/sent challenges, friend requests, and badges',
      importance: 5,
      visibility: 1,
      vibration: true
    });
    await native.createChannel({
      id: 'lingo-reminders',
      name: 'Daily Learning Reminders',
      description: 'Short personalized journey and daily motivation alerts',
      importance: 4,
      visibility: 1,
      vibration: true
    });
    channelsReady = true;
  } catch { }
}

export async function ensureDeviceNotificationSetup({ onAction } = {}) {
  const prefs = getNotificationPrefs();
  const native = await getNativePlugin();
  if (native) {
    try {
      let perm = await native.checkPermissions();
      if (prefs.enabled && perm?.display === 'prompt') {
        perm = await native.requestPermissions();
      }
      await ensureChannels(native);
      if (!listenerAttached && typeof onAction === 'function') {
        listenerAttached = true;
        native.addListener('localNotificationActionPerformed', event => {
          const extra = event?.notification?.extra || {};
          onAction(extra);
        }).catch(() => { });
      }
      return perm?.display || 'prompt';
    } catch {
      return 'prompt';
    }
  }
  return await getDeviceNotificationPermissionState();
}

export async function dispatchDeviceNotification({ uniqueKey, title, body, channel = 'lingo-social', category = null, extra = {} }) {
  const prefs = getNotificationPrefs();
  if (!isNotificationCategoryEnabled(prefs, category)) return false;

  if (uniqueKey) {
    const seen = getDeliveredIdSet();
    if (seen.has(uniqueKey)) return false;
    seen.add(uniqueKey);
    markDeliveredIds(seen);
  }

  const native = await getNativePlugin();
  if (native) {
    try {
      const perm = await native.checkPermissions();
      if (perm?.display !== 'granted') return false;
      await ensureChannels(native);
      await native.schedule({
        notifications: [
          {
            id: hashIdToInt(uniqueKey || `${title}:${Date.now()}`),
            title,
            body,
            channelId: channel,
            smallIcon: 'ic_launcher',
            extra,
            schedule: { at: new Date(Date.now() + 250) }
          }
        ]
      });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
    try {
      new window.Notification(title, { body, tag: uniqueKey || undefined });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function deliverAppNotificationsToDevice(notifications = [], myUsername = '') {
  if (!Array.isArray(notifications) || notifications.length === 0) return 0;
  const prefs = getNotificationPrefs();
  if (!prefs.enabled) return 0;

  const seen = getDeliveredIdSet();
  let seeded = false;
  for (const n of notifications) {
    if (n.isRead && n.id) {
      const k = `app:${myUsername}:${n.id}`;
      if (!seen.has(k)) {
        seen.add(k);
        seeded = true;
      }
    }
  }
  if (seeded) markDeliveredIds(seen);

  let dispatched = 0;
  const unread = notifications.filter(n => !n.isRead).slice(0, 8);
  for (const n of unread) {
    const key = `app:${myUsername}:${n.id}`;
    if (seen.has(key)) continue;
    const category = mapAppNotifCategory(n);
    const sent = await dispatchDeviceNotification({
      uniqueKey: key,
      title: n.title || 'Lingo Update',
      body: n.message || '',
      channel: 'lingo-social',
      category,
      extra: { type: n.type, relatedEntityId: n.relatedEntityId, route: 'friends' }
    });
    if (sent) dispatched++;
  }
  return dispatched;
}

export function notifyChallengeSentOnDevice({ targetNames = [], topic = 'English Match', gameCode = '' } = {}) {
  const label = targetNames.length === 1
    ? targetNames[0]
    : targetNames.length > 1
      ? `${targetNames.length} players`
      : 'your friends';
  return dispatchDeviceNotification({
    uniqueKey: `sent:${gameCode}:${targetNames.join(',')}:${Date.now()}`,
    title: 'Challenge Sent!',
    body: `Invited ${label} to ${topic} (Room ${gameCode}).`,
    channel: 'lingo-social',
    category: 'challengeSent',
    extra: { route: 'games', gameCode }
  });
}

export function notifyChallengeAcceptedOnDevice({ senderName = 'Friend', topic = 'English Match', gameCode = '' } = {}) {
  return dispatchDeviceNotification({
    uniqueKey: `acc:${gameCode}:${Date.now()}`,
    title: 'Challenge Accepted!',
    body: `Joined ${senderName}'s ${topic} room (${gameCode}).`,
    channel: 'lingo-social',
    category: 'gameInvites',
    extra: { route: 'games', gameCode }
  });
}

export async function syncDailyDeviceReminders({ user, progress }) {
  if (!user || !progress) return false;
  const prefs = getNotificationPrefs();
  const reminders = buildPersonalizedDailyReminders({ user, progress });

  const native = await getNativePlugin();
  if (native) {
    try {
      await native.cancel({
        notifications: [{ id: JOURNEY_OS_ID }, { id: MOTIVATION_OS_ID }]
      }).catch(() => { });

      if (!prefs.enabled) return false;
      const perm = await native.checkPermissions();
      if (perm?.display !== 'granted') return false;
      await ensureChannels(native);

      const toSchedule = [];
      if (isNotificationCategoryEnabled(prefs, 'dailyJourney')) {
        toSchedule.push({
          id: JOURNEY_OS_ID,
          title: reminders.journey.title,
          body: reminders.journey.body,
          channelId: 'lingo-reminders',
          extra: { route: 'learn', type: 'daily_journey', lessonId: reminders.journey.nextLessonId },
          schedule: {
            on: { hour: Number(prefs.journeyHour ?? 9), minute: Number(prefs.journeyMinute ?? 0) },
            repeats: true,
            allowWhileIdle: true
          }
        });
      }
      if (isNotificationCategoryEnabled(prefs, 'dailyMotivation')) {
        toSchedule.push({
          id: MOTIVATION_OS_ID,
          title: reminders.motivation.title,
          body: reminders.motivation.body,
          channelId: 'lingo-reminders',
          extra: { route: reminders.motivation.targetPage || 'learn', type: 'daily_motivation' },
          schedule: {
            on: { hour: Number(prefs.motivationHour ?? 19), minute: Number(prefs.motivationMinute ?? 30) },
            repeats: true,
            allowWhileIdle: true
          }
        });
      }

      if (toSchedule.length) {
        await native.schedule({ notifications: toSchedule });
      }
      return true;
    } catch {
      return false;
    }
  }

  if (prefs.enabled && typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
    const todayKey = new Date().toISOString().slice(0, 10);
    const lastSent = localStorage.getItem(WEB_DAILY_SENT_KEY);
    if (lastSent !== todayKey) {
      const hr = new Date().getHours();
      const useJourney = hr < 15;
      if (isNotificationCategoryEnabled(prefs, useJourney ? 'dailyJourney' : 'dailyMotivation')) {
        const target = useJourney ? reminders.journey : reminders.motivation;
        try {
          new window.Notification(target.title, { body: target.body, tag: `lingo-daily-${todayKey}` });
          localStorage.setItem(WEB_DAILY_SENT_KEY, todayKey);
          return true;
        } catch { }
      }
    }
  }
  return false;
}

export async function sendTestDeviceNotification({ user, progress }) {
  const granted = await requestDeviceNotificationPermission();
  if (!granted) return { ok: false, reason: 'denied' };
  const reminders = buildPersonalizedDailyReminders({ user, progress });
  const sent = await dispatchDeviceNotification({
    uniqueKey: `test:${Date.now()}`,
    title: reminders.journey.title,
    body: reminders.journey.body,
    channel: 'lingo-social',
    category: null,
    extra: { route: 'learn' }
  });
  await syncDailyDeviceReminders({ user, progress });
  return { ok: sent, reason: sent ? 'sent' : 'failed' };
}
