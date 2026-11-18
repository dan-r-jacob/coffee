import { useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '../components/ui';
import { USERNAME_RE, emailForUsername, normaliseUsername, usernameAvailable } from '../data/db';
import { appUrl, supabase } from '../lib/supabase';

const NETWORK = 'Couldn’t reach the server. Check your connection and try again.';
const MISMATCH = 'That username and password don’t match. Check them and try again.';

function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="pw-wrap">
      <input id={id} className={'input' + (invalid ? ' invalid' : '')} type={shown ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={e => onChange(e.target.value)} />
      <button type="button" className="link link-sm pw-toggle" aria-pressed={shown} aria-controls={id} onClick={() => setShown(s => !s)}>{shown ? 'Hide' : 'Show'}</button>
    </div>
  );
}

function Shell({ title, lede, onBack, children, foot }: { title: string; lede?: string; onBack?: () => void; children: ReactNode; foot?: ReactNode }) {
  return (
    <main className="wrap auth">
      {onBack ? (
        <div className="auth-bar"><button type="button" className="bar-btn" aria-label="Back to sign in" onClick={onBack}>{Icon.back()}</button></div>
      ) : <div className="auth-icon">{Icon.brewer()}</div>}
      <h1 className={onBack ? 'h1 mt-6' : 'display mt-7'}>{title}</h1>
      {lede ? <p className="lede">{lede}</p> : null}
      {children}
      {foot ? <div className="auth-foot">{foot}</div> : null}
    </main>
  );
}
const FormError = ({ msg }: { msg: string }) => (msg ? <p className="form-error" role="alert">{msg}</p> : null);

function SignIn({ go }: { go: (m: Mode, note?: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setBusy(true); setError('');
    try {
      const email = await emailForUsername(username);
      if (!email) { setError(MISMATCH); return; }
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        if (/confirm/i.test(err.message)) setError('Confirm your email first. Open the link we sent when you created your account.');
        else if (/invalid/i.test(err.message)) setError(MISMATCH);
        else setError(err.message);
      }
    } catch {
      setError(NETWORK);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="Welcome back" lede="Sign in to Brew Notes."
      foot={<><p className="small muted text-center">New to Brew Notes?</p><button type="button" className="btn btn-block" onClick={() => go('create')}>Create an account</button></>}>
      <form className="auth-form" onSubmit={submit} noValidate>
        <FormError msg={error} />
        <div className="field">
          <label className="label" htmlFor="si-user">Username</label>
          <input id="si-user" className="input" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="si-pass">Password</label>
          <PasswordInput id="si-pass" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <div className="flex justify-end">
          <button type="button" className="link link-sm" onClick={() => go('forgot')}>Forgot password?</button>
        </div>
        <button type="submit" className="btn btn-primary btn-block btn-tall mt-6" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </Shell>
  );
}

function CreateAccount({ go }: { go: (m: Mode, note?: string) => void }) {
  const [f, setF] = useState({ username: '', email: '', password: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF(x => ({ ...x, [k]: v })); setErrs(e => ({ ...e, [k]: '' })); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const u = normaliseUsername(f.username);
    const v: Record<string, string> = {};
    if (!USERNAME_RE.test(u)) v.username = 'Use 3 to 30 letters, numbers or underscores.';
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) v.email = 'Enter a valid email address.';
    if (f.password.length < 8) v.password = 'Use at least 8 characters.';
    setErrs(v);
    if (Object.keys(v).length) return;
    setBusy(true); setError('');
    try {
      if (!(await usernameAvailable(u))) { setErrs({ username: 'That username is taken. Try another.' }); return; }
      const { data, error: err } = await supabase.auth.signUp({ email: f.email.trim(), password: f.password, options: { data: { username: u }, emailRedirectTo: appUrl() } });
      if (err) {
        if (/registered|exists/i.test(err.message)) setError('An account with that email already exists. Sign in instead.');
        else if (/password/i.test(err.message)) setErrs({ password: err.message });
        else setError(err.message);
        return;
      }
      if (!data.session) go('checkEmail', f.email.trim());
    } catch {
      setError(NETWORK);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="Create an account" lede="Your coffees, recipes and brews stay private to you." onBack={() => go('signin')}>
      <form className="auth-form" onSubmit={submit} noValidate>
        <FormError msg={error} />
        <div className="field">
          <label className="label" htmlFor="ca-user">Username</label>
          <input id="ca-user" className={'input' + (errs.username ? ' invalid' : '')} type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={f.username} onChange={e => set('username')(e.target.value)} aria-describedby="ca-user-h" />
          {errs.username ? <div className="err" role="alert">{errs.username}</div> : <p id="ca-user-h" className="hint">Letters, numbers and underscores. This is what you’ll sign in with.</p>}
        </div>
        <div className="field">
          <label className="label" htmlFor="ca-email">Email</label>
          <input id="ca-email" className={'input' + (errs.email ? ' invalid' : '')} type="email" autoComplete="email" autoCapitalize="none" value={f.email} onChange={e => set('email')(e.target.value)} aria-describedby="ca-email-h" />
          {errs.email ? <div className="err" role="alert">{errs.email}</div> : <p id="ca-email-h" className="hint">Used to confirm your account and reset your password.</p>}
        </div>
        <div className="field">
          <label className="label" htmlFor="ca-pass">Password</label>
          <PasswordInput id="ca-pass" value={f.password} onChange={set('password')} autoComplete="new-password" invalid={!!errs.password} />
          {errs.password ? <div className="err" role="alert">{errs.password}</div> : <p className="hint">At least 8 characters.</p>}
        </div>
        <button type="submit" className="btn btn-primary btn-block btn-tall mt-4" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </Shell>
  );
}

function Forgot({ go }: { go: (m: Mode, note?: string) => void }) {
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError('Enter your username.'); return; }
    setBusy(true); setError('');
    try {
      const email = await emailForUsername(username);
      if (email) await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
      go('resetSent');
    } catch {
      setError(NETWORK);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="Reset your password" lede="We’ll email a reset link to the address on your account." onBack={() => go('signin')}>
      <form className="auth-form" onSubmit={submit} noValidate>
        <FormError msg={error} />
        <div className="field">
          <label className="label" htmlFor="fp-user">Username</label>
          <input id="fp-user" className="input" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-block btn-tall mt-2" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
    </Shell>
  );
}

function Notice({ title, children, go }: { title: string; children: ReactNode; go: (m: Mode) => void }) {
  return (
    <Shell title={title} onBack={() => go('signin')} foot={<button type="button" className="btn btn-primary btn-block btn-tall" onClick={() => go('signin')}>Back to sign in</button>}>
      <div className="notice mt-6">{children}</div>
    </Shell>
  );
}

type Mode = 'signin' | 'create' | 'forgot' | 'checkEmail' | 'resetSent';
export function AuthFlow() {
  const [mode, setMode] = useState<Mode>('signin');
  const [note, setNote] = useState('');
  const go = (m: Mode, n?: string) => { setMode(m); setNote(n || ''); window.scrollTo(0, 0); };
  if (mode === 'create') return <CreateAccount go={go} />;
  if (mode === 'forgot') return <Forgot go={go} />;
  if (mode === 'checkEmail') return <Notice title="Check your email" go={go}><p>We’ve sent a confirmation link to <strong>{note}</strong>. Open it to activate your account, then sign in with your username and password.</p></Notice>;
  if (mode === 'resetSent') return <Notice title="Check your email" go={go}><p>If that username has an account, we’ve emailed a link to reset its password. The link opens Brew Notes, where you can choose a new one.</p></Notice>;
  return <SignIn go={go} />;
}

export function ResetPassword({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { setError('Use at least 8 characters.'); return; }
    if (pw !== pw2) { setError('The two passwords don’t match.'); return; }
    setBusy(true); setError('');
    try {
      const { error: err } = await supabase.auth.updateUser({ password: pw });
      if (err) setError(err.message);
      else onDone();
    } catch {
      setError(NETWORK);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell title="Choose a new password">
      <form className="auth-form" onSubmit={submit} noValidate>
        <FormError msg={error} />
        <div className="field">
          <label className="label" htmlFor="rp-1">New password</label>
          <PasswordInput id="rp-1" value={pw} onChange={setPw} autoComplete="new-password" />
          <p className="hint">At least 8 characters.</p>
        </div>
        <div className="field">
          <label className="label" htmlFor="rp-2">Confirm new password</label>
          <PasswordInput id="rp-2" value={pw2} onChange={setPw2} autoComplete="new-password" />
        </div>
        <button type="submit" className="btn btn-primary btn-block btn-tall mt-2" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </Shell>
  );
}
