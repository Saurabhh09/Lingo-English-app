import React, { useState } from 'react';
import { ShieldCheck, Lock, LogOut } from 'lucide-react';

export function ForcePasswordChangeScreen({ user, api, onSuccess, onSignOut }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 10 || newPassword.length > 128) {
      setError('Choose a new password with 10–128 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Your new password must be different from your current password.');
      return;
    }
    try {
      setBusy(true);
      const data = await api('/auth/change-password', { currentPassword, newPassword });
      onSuccess(data);
    } catch (err) {
      setError(err?.message || 'Unable to update password. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'var(--bg, #faf8f0)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        border: '2px solid #e5e0d0',
        borderRadius: '20px',
        padding: '28px 24px',
        boxShadow: '0 12px 32px rgba(24, 34, 24, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: '#ecfdf5',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#1f2937' }}>
              Please set a new password to keep your account safe
            </h1>
            <p style={{ fontSize: '0.85rem', margin: '4px 0 0', color: '#6b7280' }}>
              Account: <strong>@{user?.username}</strong>
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.92rem', lineHeight: 1.5, color: '#4b5563', margin: '0 0 18px' }}>
          As a security precaution, we require a new password (at least 10 characters) before continuing to your account.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ padding: '11px 12px', borderRadius: '12px', border: '1.5px solid #d1d5db', fontSize: '0.95rem' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
            New password (10+ characters)
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
              style={{ padding: '11px 12px', borderRadius: '12px', border: '1.5px solid #d1d5db', fontSize: '0.95rem' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
              style={{ padding: '11px 12px', borderRadius: '12px', border: '1.5px solid #d1d5db', fontSize: '0.95rem' }}
            />
          </label>

          {error && (
            <div role="alert" style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '0.86rem',
              fontWeight: 600
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
          >
            <Lock size={16} />
            {busy ? 'Updating password...' : 'Update password & continue'}
          </button>
        </form>

        <button
          type="button"
          onClick={onSignOut}
          disabled={busy}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '10px',
            background: 'transparent',
            border: 'none',
            color: '#6b7280',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </div>
  );
}
