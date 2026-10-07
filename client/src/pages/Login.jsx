import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../components/ui/Button.jsx';
import { useAuth } from '../lib/AuthContext.jsx';
import { useShortlist } from '../lib/ShortlistContext.jsx';
import useDocumentTitle from '../lib/useDocumentTitle.js';

function Field({ id, label, type = 'text', value, onChange, autoComplete, hint, required = true }) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow mb-2 block">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full border border-rule bg-paper-2/40 px-3 py-2.5 text-[0.95rem] focus:border-ink focus:outline-none"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const auth = useAuth();
  const shortlist = useShortlist();

  useDocumentTitle(mode === 'signin' ? 'Sign in' : 'Create an account');

  const pending = auth.login.isPending || auth.register.isPending;
  const error = auth.login.error ?? auth.register.error;

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (mode === 'signin') await auth.login.mutateAsync({ email, password });
      else await auth.register.mutateAsync({ email, password, name: name || undefined });
      navigate('/colleges');
    } catch {
      // The error is rendered from the mutation state below.
    }
  };

  if (auth.isSignedIn) {
    return (
      <div className="shell max-w-xl py-20">
        <h1 className="font-display text-display-md">You are signed in.</h1>
        <p className="mt-5 text-[0.95rem] leading-relaxed text-ink-soft">
          Signed in as <span className="text-ink">{auth.user.email}</span>. Your shortlist is
          synced to the server, so it will follow you to another browser.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button variant="ink" to="/colleges">
            Back to the catalogue
          </Button>
          <Button
            variant="quiet"
            onClick={() => auth.logout.mutate()}
            disabled={auth.logout.isPending}
          >
            {auth.logout.isPending ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell grid max-w-5xl gap-12 py-16 lg:grid-cols-[1fr_22rem] lg:py-24">
      <div>
        <p className="eyebrow mb-4">Optional, and only for the shortlist</p>
        <h1 className="font-display text-display-md">
          {mode === 'signin' ? 'Sign in.' : 'Create an account.'}
        </h1>
        <p className="mt-5 max-w-prose text-[0.95rem] leading-relaxed text-ink-soft">
          Everything on this site works without an account. Signing in does exactly one thing:
          it lifts your shortlist off this browser and onto the server, so it is still there on
          your phone.
        </p>

        <form onSubmit={submit} className="mt-10 max-w-md space-y-6">
          {mode === 'register' && (
            <Field
              id="name"
              label="Name"
              value={name}
              onChange={setName}
              autoComplete="name"
              required={false}
              hint="Optional"
            />
          )}

          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
          />

          <Field
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            hint={mode === 'register' ? 'At least 8 characters. A passphrase beats a puzzle.' : undefined}
          />

          {error && (
            <p role="alert" className="border-l-2 border-vermilion pl-4 text-[0.85rem] text-vermilion">
              {error.message ?? 'That did not work. Try again.'}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" variant="solid" size="lg" disabled={pending}>
              {pending
                ? 'One moment…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </Button>
            <button
              type="button"
              onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}
              className="link-underline font-mono text-[0.66rem] uppercase tracking-[0.14em] text-ink-soft"
            >
              {mode === 'signin' ? 'Create one instead' : 'I already have an account'}
            </button>
          </div>
        </form>
      </div>

      <aside className="theme-forest self-start border border-rule p-6">
        <h2 className="eyebrow mb-4 text-ink-faint">In the meantime</h2>
        <p className="text-[0.9rem] leading-relaxed text-ink-soft">
          Your shortlist already works — it is kept in this browser and survives a reload.
        </p>
        <p className="mt-5 font-display text-numeral text-paper">{shortlist.count}</p>
        <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ink-faint">
          {shortlist.count === 1 ? 'college saved' : 'colleges saved'}
        </p>
        <div className="mt-6">
          <Link
            to="/colleges"
            className="link-underline font-mono text-[0.66rem] uppercase tracking-[0.14em] text-paper"
          >
            Find some more
          </Link>
        </div>
      </aside>
    </div>
  );
}
