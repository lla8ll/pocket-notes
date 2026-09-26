import { useState } from 'react';
import { ClassicNavigationBar } from '../components/ClassicControls';

export function SignIn({ onSignIn, onSignUp, onSkip, error, busy }: {
  onSignIn: (email: string, password: string) => void;
  onSignUp: (email: string, password: string) => void;
  onSkip: () => void;
  error: string;
  busy: boolean;
}) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const valid = email.includes('@') && password.length >= 6;

  function submit() {
    if (!valid || busy) return;
    if (mode === 'in') onSignIn(email.trim(), password);
    else onSignUp(email.trim(), password);
  }

  return <>
    <ClassicNavigationBar title="Pocket Notes" />
    <div className="notepad-binding" aria-hidden="true" />
    <div className="notes-list paper">
      <div className="auth-form">
        <p className="auth-form__lead">
          {mode === 'in' ? 'Sign in to sync your notes across devices.' : 'Create an account to keep your notes in the cloud.'}
        </p>
        <label className="auth-field">
          <span>Email</span>
          <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
            value={email} onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </label>
        {error && <p className="auth-form__message" role="alert">{error}</p>}
        <button type="button" className="sheet-action" onClick={submit} disabled={!valid || busy} aria-busy={busy}>
          {busy ? 'Please wait…' : mode === 'in' ? 'Sign In' : 'Create Account'}
        </button>
        <button type="button" className="auth-form__toggle" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Need an account? Sign up' : 'Have an account? Sign in'}
        </button>
        <button type="button" className="auth-form__skip" onClick={onSkip}>
          Continue offline on this device
        </button>
      </div>
    </div>
  </>;
}
