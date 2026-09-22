import { useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Sign up, sign in, and Google.
 *
 * Two things this has to get right, both of which it previously got
 * wrong. A sign-in that succeeds must leave the page: staying on the
 * form is indistinguishable from nothing happening. And a sign-in that
 * fails must say what went wrong in the words the server used, rather
 * than a guess about what probably happened, because a guess that is
 * wrong sends someone hunting for a problem they do not have.
 *
 * Google is conditional on the deployment reporting it configured. The
 * password form never is.
 */

/**
 * How long to wait before calling a sign-in stuck.
 *
 * A Convex action queues until the client has a connection, so when the
 * deployment is unreachable `signIn` neither resolves nor rejects: it
 * simply never settles. That is the whole of "it does nothing and shows
 * no error" — there was no error to show, and no result either. A
 * deadline turns silence into a sentence.
 */
const SIGN_IN_TIMEOUT_MS = 20_000;

function withDeadline<T>(work: Promise<T>): Promise<T> {
  return Promise.race([
    work,
    new Promise<never>((_resolve, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              'That took too long and may not have reached the server. Check your connection and try again.',
            ),
          ),
        SIGN_IN_TIMEOUT_MS,
      ),
    ),
  ]);
}

/** Whatever the error actually was, as something a person can read. */
function messageFrom(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : String(error);
  const text = raw.trim();
  if (text.length === 0 || text === '[object Object]') {
    return 'Sign-in failed, and the server gave no reason. Try again in a moment.';
  }
  return text;
}
export default function SignIn({
  mode: initialMode,
  onSwitch,
  onSignedIn,
}: {
  mode: 'signUp' | 'signIn';
  onSwitch: (to: 'signUp' | 'signIn') => void;
  /** Called once a session exists, so the caller can leave this page. */
  onSignedIn: () => void;
}) {
  const { signIn } = useAuthActions();
  const status = useQuery(api.authStatus.status, {});

  const [mode, setMode] = useState<'signUp' | 'signIn'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'password' | 'google'>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy('password');
    try {
      // The inputs are deliberately not cleared on failure: retyping a
      // password because the network blinked is its own small insult.
      await withDeadline(signIn('password', { email, password, name, flow: mode }));
      onSignedIn();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="window plated roomy" id="signin">
      <p className="bar cream">{mode === 'signUp' ? 'Create an account' : 'Sign in'}</p>

      {status !== undefined && !status.ready && (
        <p className="note" role="status">
          Account signing is warming up on this deployment. The form works as soon as it is
          ready; if a sign-in fails right now, that is why.
        </p>
      )}

      {status?.googleReady && (
        <>
          <button
            className="btn block"
            disabled={busy !== null}
            onClick={() => {
              setError(null);
              setBusy('google');
              // A redirect provider usually navigates away before this
              // resolves; when it does come back, it is a real session.
              void withDeadline(signIn('google'))
                .then(() => {
                  setBusy(null);
                  onSignedIn();
                })
                .catch((err: unknown) => {
                  setError(messageFrom(err));
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
            aria-describedby={error ? 'authError passwordRule' : 'passwordRule'}
          />
        </label>
        <p className="tiny" id="passwordRule">
          At least 8 characters.
        </p>

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
          const next = mode === 'signUp' ? 'signIn' : 'signUp';
          setMode(next);
          setError(null);
          onSwitch(next);
        }}
      >
        {mode === 'signUp' ? 'I already have an account' : 'Create an account instead'}
      </button>
    </section>
  );
}
