import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  BellRing,
  Clock,
  Gamepad2,
  Send,
  UserPlus,
  Users,
  Award,
  Compass,
  Flame,
  Plus,
  Minus,
  Check,
  X
} from 'lucide-react';
import { buildPersonalizedDailyReminders } from '../../../server/reminderEngine.mjs';

function format12Hour(hour24, minute) {
  const h = Number(hour24) || 0;
  const m = Number(minute) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function LingoTimePickerModal({ title, hour24, minute, onSave, onClose }) {
  const initialPeriod = hour24 >= 12 ? 'PM' : 'AM';
  const initialH12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const [h12, setH12] = useState(initialH12);
  const [min, setMin] = useState(minute);
  const [period, setPeriod] = useState(initialPeriod);

  const presets = [
    { label: '7:30 AM', h24: 7, m: 30 },
    { label: '9:00 AM', h24: 9, m: 0 },
    { label: '1:00 PM', h24: 13, m: 0 },
    { label: '6:00 PM', h24: 18, m: 0 },
    { label: '7:30 PM', h24: 19, m: 30 },
    { label: '9:00 PM', h24: 21, m: 0 }
  ];

  function applyPreset(p) {
    setPeriod(p.h24 >= 12 ? 'PM' : 'AM');
    setH12(p.h24 % 12 === 0 ? 12 : p.h24 % 12);
    setMin(p.m);
  }

  function handleConfirm() {
    let h24 = h12 % 12;
    if (period === 'PM') h24 += 12;
    onSave(h24, min);
  }

  return (
    <div
      className="lingo-time-picker-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div className="ltp-card">
        <button type="button" className="ltp-close" onClick={onClose} aria-label="Close time picker">
          <X size={17} />
        </button>

        <span className="ltp-eyebrow">REMINDER SCHEDULE</span>
        <h3 className="ltp-title">{title}</h3>

        <div className="ltp-display-pill">
          <Clock size={18} />
          <strong>
            {String(h12).padStart(2, '0')} : {String(min).padStart(2, '0')} {period}
          </strong>
        </div>

        <div className="ltp-controls-row">
          <div className="ltp-stepper">
            <span className="ltp-step-label">HOUR</span>
            <button type="button" onClick={() => setH12(v => (v >= 12 ? 1 : v + 1))} aria-label="Increase hour">
              <Plus size={16} />
            </button>
            <b>{String(h12).padStart(2, '0')}</b>
            <button type="button" onClick={() => setH12(v => (v <= 1 ? 12 : v - 1))} aria-label="Decrease hour">
              <Minus size={16} />
            </button>
          </div>

          <span className="ltp-colon">:</span>

          <div className="ltp-stepper">
            <span className="ltp-step-label">MIN</span>
            <button type="button" onClick={() => setMin(v => (v + 5) % 60)} aria-label="Increase minutes">
              <Plus size={16} />
            </button>
            <b>{String(min).padStart(2, '0')}</b>
            <button type="button" onClick={() => setMin(v => (v - 5 + 60) % 60)} aria-label="Decrease minutes">
              <Minus size={16} />
            </button>
          </div>

          <div className="ltp-ampm-col">
            <span className="ltp-step-label">PERIOD</span>
            <button
              type="button"
              className={period === 'AM' ? 'active' : ''}
              onClick={() => setPeriod('AM')}
            >
              AM
            </button>
            <button
              type="button"
              className={period === 'PM' ? 'active' : ''}
              onClick={() => setPeriod('PM')}
            >
              PM
            </button>
          </div>
        </div>

        <div className="ltp-presets">
          {presets.map(p => (
            <button
              key={p.label}
              type="button"
              className="ltp-preset-chip"
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="ltp-footer">
          <button type="button" className="ltp-cancel-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="ltp-save-btn" onClick={handleConfirm}>
            <Check size={16} /> Save Time
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      className={`lingo-switch ${checked ? 'on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="lingo-switch-thumb" />
    </button>
  );
}

export function RemindersSettingsPage({
  user,
  progress,
  notifPrefs,
  notifPermission,
  onUpdatePrefs,
  onEnableDeviceAlerts,
  onSendTestAlert,
  onBack,
  notify
}) {
  const [editingSlot, setEditingSlot] = useState(null); // 'journey' | 'motivation' | null

  const reminders = useMemo(
    () => buildPersonalizedDailyReminders({ user, progress }),
    [
      user?.username,
      user?.name,
      progress?.completed?.length,
      progress?.checkpoints?.length,
      progress?.streak,
      progress?.todayWords,
      progress?.goal,
      progress?.xp,
      progress?.gems
    ]
  );

  const cats = notifPrefs?.categories || {};
  const isOsGranted = notifPermission === 'granted';

  function toggleCategory(key, value) {
    onUpdatePrefs({
      ...notifPrefs,
      categories: {
        ...cats,
        [key]: value
      }
    });
    notify?.('Notification preference updated.');
  }

  const activityRows = [
    {
      key: 'gameInvites',
      icon: Gamepad2,
      title: 'Incoming Game Challenges',
      desc: 'Push alert when a friend invites you to a match or when you accept.'
    },
    {
      key: 'challengeSent',
      icon: Send,
      title: 'Sent Challenges & Joins',
      desc: 'Confirmation when you send an invite or when a player accepts your room.'
    },
    {
      key: 'friendRequests',
      icon: UserPlus,
      title: 'Friend Requests & Accepts',
      desc: 'Alert when someone sends or accepts a friend request.'
    },
    {
      key: 'communityUpdates',
      icon: Users,
      title: 'Communities & Groups',
      desc: 'Private community invites, new members & role updates.'
    },
    {
      key: 'achievements',
      icon: Award,
      title: 'Badges & Reward Chests',
      desc: 'Alerts when you unlock a new badge or milestone reward.'
    }
  ];

  return (
    <div className="reminders-page-view">
      {/* Top Bar */}
      <header className="reminders-topbar">
        <button type="button" className="reminders-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
        <span className={`reminders-status-pill ${isOsGranted && notifPrefs.enabled ? 'on' : ''}`}>
          {isOsGranted ? (notifPrefs.enabled ? 'Phone Alerts On' : 'Paused') : notifPermission === 'denied' ? 'Blocked' : 'Setup Needed'}
        </span>
      </header>

      <div className="reminders-page-heading">
        <span className="reminders-eyebrow">NOTIFICATIONS &amp; SCHEDULES</span>
        <h1>Reminders &amp; Alerts</h1>
        <p>Choose which Lingo notifications push to your phone status bar and when daily reminders arrive.</p>
      </div>

      {/* Master Control Card */}
      <section className="rem-card master">
        <div className="rem-master-row">
          <div className="rem-icon-badge lime"><BellRing size={20} /></div>
          <div className="rem-master-info">
            <strong>Push Notifications to Phone</strong>
            <p>Deliver app alerts directly to your phone&apos;s notification bar.</p>
          </div>
          <ToggleSwitch
            checked={Boolean(notifPrefs.enabled)}
            label="Toggle all phone notifications"
            onChange={val => {
              if (val && !isOsGranted) {
                onEnableDeviceAlerts();
              } else {
                onUpdatePrefs({ ...notifPrefs, enabled: val });
                notify?.(val ? 'Phone notifications turned on.' : 'Phone notifications paused.');
              }
            }}
          />
        </div>

        <div className="rem-master-actions">
          {!isOsGranted && (
            <button type="button" className="rem-btn primary" onClick={onEnableDeviceAlerts}>
              Allow Phone Permission
            </button>
          )}
          <button type="button" className="rem-btn secondary" onClick={onSendTestAlert}>
            Send Test Notification
          </button>
        </div>
      </section>

      {/* Daily Personalized Reminders (2 short summaries + custom Lingo time picker) */}
      <section className="rem-section">
        <span className="rem-section-label">DAILY PERSONALIZED REMINDERS</span>

        <div className="rem-card">
          <div className="rem-row">
            <div className="rem-icon-badge sky"><Compass size={19} /></div>
            <div className="rem-row-body">
              <div className="rem-row-head">
                <strong>Continue Your Journey</strong>
                <ToggleSwitch
                  checked={cats.dailyJourney !== false && notifPrefs.enabled}
                  label="Toggle Continue Your Journey reminder"
                  onChange={val => toggleCategory('dailyJourney', val)}
                />
              </div>
              <p className="rem-preview-msg">
                <b>{reminders.journey.title}</b> — {reminders.journey.body}
              </p>
              <button
                type="button"
                className="rem-time-chip"
                onClick={() => setEditingSlot('journey')}
              >
                <Clock size={14} />
                <span>Daily at {format12Hour(notifPrefs.journeyHour, notifPrefs.journeyMinute)}</span>
                <em>Change</em>
              </button>
            </div>
          </div>
        </div>

        <div className="rem-card">
          <div className="rem-row">
            <div className="rem-icon-badge lime"><Flame size={19} /></div>
            <div className="rem-row-body">
              <div className="rem-row-head">
                <strong>Daily Motivation</strong>
                <ToggleSwitch
                  checked={cats.dailyMotivation !== false && notifPrefs.enabled}
                  label="Toggle Daily Motivation reminder"
                  onChange={val => toggleCategory('dailyMotivation', val)}
                />
              </div>
              <p className="rem-preview-msg">
                <b>{reminders.motivation.title}</b> — {reminders.motivation.body}
              </p>
              <button
                type="button"
                className="rem-time-chip"
                onClick={() => setEditingSlot('motivation')}
              >
                <Clock size={14} />
                <span>Daily at {format12Hour(notifPrefs.motivationHour, notifPrefs.motivationMinute)}</span>
                <em>Change</em>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Social & App Event Push Preferences */}
      <section className="rem-section">
        <span className="rem-section-label">APP ACTIVITY PUSH ALERTS</span>
        <div className="rem-card list">
          {activityRows.map(row => {
            const Icon = row.icon;
            const checked = cats[row.key] !== false && notifPrefs.enabled;
            return (
              <div key={row.key} className="rem-toggle-row">
                <div className="rem-mini-icon"><Icon size={17} /></div>
                <div className="rem-toggle-text">
                  <strong>{row.title}</strong>
                  <small>{row.desc}</small>
                </div>
                <ToggleSwitch
                  checked={checked}
                  label={`Toggle ${row.title}`}
                  onChange={val => toggleCategory(row.key, val)}
                />
              </div>
            );
          })}
        </div>
      </section>

      {editingSlot && (
        <LingoTimePickerModal
          title={editingSlot === 'journey' ? 'Continue Your Journey Time' : 'Daily Motivation Time'}
          hour24={editingSlot === 'journey' ? notifPrefs.journeyHour : notifPrefs.motivationHour}
          minute={editingSlot === 'journey' ? notifPrefs.journeyMinute : notifPrefs.motivationMinute}
          onClose={() => setEditingSlot(null)}
          onSave={(h24, m) => {
            const next = editingSlot === 'journey'
              ? { ...notifPrefs, journeyHour: h24, journeyMinute: m }
              : { ...notifPrefs, motivationHour: h24, motivationMinute: m };
            onUpdatePrefs(next);
            setEditingSlot(null);
            notify?.(`Reminder set for ${format12Hour(h24, m)}!`);
          }}
        />
      )}
    </div>
  );
}
