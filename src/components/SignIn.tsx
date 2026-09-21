import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Sign up, sign in, and Google.
 *
 * Nothing renders until the deployment reports that it can actually sign
 * a session. The keys live on the deployment rather than in the repo, so
 * between this code shipping and the init-auth workflow being run there
 * is a window where a sign-in button would throw; during it the app
 * keeps working the way it did before accounts existed.
 */
export default function SignIn() {
  const { signIn } = useAuthActions();
  const status = useQuery(api.authStatus.status, {});

  const [mode, setMode] = useState<'signUp' | 'signIn'>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'password' | 'google'>(null);

  if (status === undefined || !status.ready) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy('password');
    try {
      // The inputs are deliberately not cleared on failure: retyping a
      // password because the network blinked is its own small insult.
      await signIn('password', { email, password, name, flow: mode });
    } catch {
      setError(
        mode === 'signUp'
          ? 'That did not work. The address may already have an account, or the password may be too short.'
          : 'That email and password did not match an account.',
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="window plated roomy" id="signin">
      <p className="bar cream">{mode === 'signUp' ? 'Create an account' : 'Sign in'}</p>

      {status.googleReady && (
        <>
          <button
            className="btn block"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setBusy('google');
              void signIn('google').catch(() => {
                setError('Google sign-in did not complete.');
                setBusy(null);
              });
            }}
          >
            {busy === 'google' ? (
              <>
                <span className="spinner" aria-hidden="true" /> Opening Google
              </>
            ) : (
              'Continue with Google'
            )}
          </button>
          <p className="orRule">
            <span>or</span>
          </p>
        </>
      )}

      <form onSubmit={(event) => void submit(event)}>
        {mode === 'signUp' && (
          <label className="field" htmlFor="authName">
            <span>First name</span>
            <input
              id="authName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="given-name"
              required
            />
          </label>
        )}

        <label className="field" htmlFor="authEmail">
          <span>Email</span>
          <input
            id="authEmail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            inputMode="email"
            required
            aria-describedby={error ? 'authError' : undefined}
          />
        </label>

        <label className="field" htmlFor="authPassword">
          <span>Password</span>
          <input
            id="authPassword"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            aria-describedby={error ? 'authError' : undefined}
          />
        </label>

        {error && (
          <p className="alert" id="authError" role="alert">
            {error}
          </p>
        )}

        <button className="btn primary block" type="submit" disabled={busy !== null}>
          {busy === 'password' ? (
            <>
              <span className="spinner" aria-hidden="true" />{' '}
              {mode === 'signUp' ? 'Creating' : 'Signing in'}
            </>
          ) : mode === 'signUp' ? (
            'Create account'
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <button
        className="link"
        onClick={() => {
          setMode(mode === 'signUp' ? 'signIn' : 'signUp');
          setError(null);
        }}
      >
        {mode === 'signUp' ? 'I already have an account' : 'Create an account instead'}
      </button>
    </section>
  );
}
