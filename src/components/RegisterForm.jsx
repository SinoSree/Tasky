// ---------------------------------------------------------------------------
// RegisterForm.jsx — the "create account" form (API mode only).
//
// The checks here mirror the server's rules in server/src/validators.
// That duplication is deliberate, not an accident:
//
//   in the browser → instant, friendly feedback while typing
//   on the server  → the rule that actually counts
//
// Anyone can bypass this file with DevTools. Nobody can bypass the server.
// If the two ever disagree, the server's answer arrives as `fieldErrors`
// and is shown in exactly the same place.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import Button from './Button.jsx';
import Icon from './Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const EMPTY = { username: '', email: '', mobile: '', password: '', confirmPassword: '' };

// Same rules as the backend, written for speed rather than completeness —
// the server does the thorough version (including real phone validation).
function checkField(name, value, all) {
  const v = (value || '').trim();

  switch (name) {
    case 'username':
      if (!v) return 'Username is required.';
      if (v.length < 3) return 'Username must be at least 3 characters.';
      if (v.length > 20) return 'Username cannot be longer than 20 characters.';
      if (!/^[A-Za-z]+$/.test(v)) return 'Username can only contain English letters (A–Z).';
      return '';

    case 'email':
      if (!v) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
      return '';

    case 'mobile':
      if (!v) return 'Mobile number is required.';
      if (!v.startsWith('+')) return 'Include the country code, starting with + (e.g. +919876543210).';
      if (!/^\+\d[\d\s-]{6,}$/.test(v)) return 'Enter a valid mobile number.';
      return '';

    case 'password':
      if (!value) return 'Password is required.';
      if (!/^\d+$/.test(value)) return 'Password must contain numbers only.';
      if (value.length < 8) return 'Password must be at least 8 digits.';
      return '';

    case 'confirmPassword':
      if (!value) return 'Confirm your password.';
      if (value !== all.password) return 'Passwords do not match.';
      return '';

    default:
      return '';
  }
}

export default function RegisterForm({ onSwitchToSignIn }) {
  const { register, error, clearMessages } = useAuth();

  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  // Which fields the user has finished with. Without this, an error appears
  // on "email" the moment they type the first letter, which feels hostile.
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);

  const setField = (name) => (e) => {
    const next = { ...values, [name]: e.target.value };
    setValues(next);
    clearMessages();

    // Re-check only fields already blurred, so messages correct themselves
    // live but never appear early.
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: checkField(name, next[name], next) }));
    }
    // Typing a new password should refresh the confirm message too.
    if (name === 'password' && touched.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: checkField('confirmPassword', next.confirmPassword, next),
      }));
    }
  };

  const handleBlur = (name) => () => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: checkField(name, values[name], values) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check everything, not just what was touched — someone can submit with
    // Enter without ever leaving the first field.
    const found = {};
    for (const name of Object.keys(EMPTY)) {
      const message = checkField(name, values[name], values);
      if (message) found[name] = message;
    }
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    const result = await register(values);
    setBusy(false);

    // The server found something we did not — a duplicate email, say, which
    // only it can know about.
    if (!result.ok && result.fieldErrors) setErrors(result.fieldErrors);
  };

  const field = (name, label, props = {}) => (
    <div className="field">
      <label className="field-label" htmlFor={`reg-${name}`}>{label}</label>
      <input
        id={`reg-${name}`}
        className={`input ${errors[name] ? 'input-error' : ''}`}
        value={values[name]}
        onChange={setField(name)}
        onBlur={handleBlur(name)}
        disabled={busy}
        {...props}
      />
      {errors[name]
        ? <p className="field-error">{errors[name]}</p>
        : props.hint && <p className="field-hint">{props.hint}</p>}
    </div>
  );

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {field('username', 'Username', {
        placeholder: 'Sino',
        autoComplete: 'username',
        hint: 'English letters only, 3–20 characters.',
      })}

      {field('email', 'Email', {
        type: 'email',
        placeholder: 'you@example.com',
        autoComplete: 'email',
      })}

      {field('mobile', 'Mobile number', {
        type: 'tel',
        placeholder: '+919876543210',
        autoComplete: 'tel',
        hint: 'Include your country code.',
      })}

      {field('password', 'Password', {
        type: 'password',
        placeholder: '••••••••',
        autoComplete: 'new-password',
        inputMode: 'numeric',
        hint: 'Numbers only, at least 8 digits.',
      })}

      {field('confirmPassword', 'Confirm password', {
        type: 'password',
        placeholder: '••••••••',
        autoComplete: 'new-password',
        inputMode: 'numeric',
      })}

      {/* Errors the server reported about the whole form, not one field. */}
      {error && (
        <p className="auth-msg auth-msg-error">
          <Icon name="alert" size={15} /> {error}
        </p>
      )}

      <Button type="submit" variant="primary" className="auth-submit" disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </Button>

      <div className="auth-links">
        <button type="button" className="link-btn" onClick={onSwitchToSignIn} disabled={busy}>
          Already have an account? Sign in
        </button>
      </div>
    </form>
  );
}
