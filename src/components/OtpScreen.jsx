// ---------------------------------------------------------------------------
// OtpScreen.jsx — "enter the 6-digit code we emailed you".
//
// Shown after registering, and also when someone with an unverified account
// tries to sign in. The account genuinely cannot be used until this passes:
// the check is on the server, not here.
//
// The countdown is a courtesy. The server enforces the real cooldown and
// returns 429 if asked too soon, so a user editing this page gains nothing.
// ---------------------------------------------------------------------------
import React, { useState, useEffect, useRef } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const RESEND_SECONDS = 60;

export default function OtpScreen({ email, onBack }) {
  const { verifyEmail, resendOtp, error, notice, clearMessages } = useAuth();

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const inputRef = useRef(null);

  // Put the cursor in the box on arrival — the only thing to do here.
  useEffect(() => { inputRef.current?.focus(); }, []);

  // One timer, cleaned up when the screen closes. Without the cleanup it
  // would keep ticking after the component is gone.
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const id = setInterval(() => setSecondsLeft((n) => (n > 0 ? n - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  // Digits only, six at most. Stops most typos before they reach the server.
  const handleChange = (e) => {
    clearMessages();
    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    await verifyEmail(email, code);
    setBusy(false);
    // On success AuthContext sets the user and this screen unmounts, so
    // there is nothing to do here. On failure the error is already shown.
  };

  const handleResend = async () => {
    setResending(true);
    const result = await resendOtp(email);
    setResending(false);
    setCode('');
    // Restart the countdown from the server's answer when it gave one.
    setSecondsLeft(result.retryAfterSeconds || RESEND_SECONDS);
    inputRef.current?.focus();
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark brand-mark-lg">T</div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-sub">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="otp-code">Verification code</label>
            <input
              id="otp-code"
              ref={inputRef}
              className={`input otp-input ${error ? 'input-error' : ''}`}
              value={code}
              onChange={handleChange}
              placeholder="000000"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              disabled={busy}
            />
            <p className="field-hint">The code expires 5 minutes after it was sent.</p>
          </div>

          {error && (
            <p className="auth-msg auth-msg-error">
              <Icon name="alert" size={15} /> {error}
            </p>
          )}
          {notice && !error && (
            <p className="auth-msg auth-msg-ok">
              <Icon name="check" size={15} /> {notice}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="auth-submit"
            disabled={busy || code.length !== 6}
          >
            {busy ? 'Verifying…' : 'Verify email'}
          </Button>

          <div className="otp-resend">
            {secondsLeft > 0 ? (
              <span className="field-hint">
                Didn't get it? You can ask for another in {secondsLeft}s.
              </span>
            ) : (
              <button
                type="button"
                className="link-btn"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Sending…' : 'Send a new code'}
              </button>
            )}
          </div>

          <div className="auth-links">
            <button type="button" className="link-btn" onClick={onBack} disabled={busy}>
              Use a different email
            </button>
          </div>
        </form>
      </div>

      <p className="foot-note">
        Check your spam folder if it hasn't arrived after a minute.
      </p>
    </div>
  );
}
