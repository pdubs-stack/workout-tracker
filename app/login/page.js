'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        window.location.href = '/';
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Incorrect passcode.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wt-login-wrap">
      <form className="wt-card wt-login-card" onSubmit={handleSubmit}>
        <h1 className="wt-title wt-login-title">⚔ Questlog: Iron &amp; Ink</h1>
        <p className="wt-login-sub">Enter your passcode to access your quest log.</p>
        <input
          type="password"
          className="wt-login-input"
          placeholder="Passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          autoFocus
        />
        {error && <p className="wt-login-error">{error}</p>}
        <button className="wt-btn wt-btn-primary wt-login-btn" type="submit" disabled={loading}>
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
