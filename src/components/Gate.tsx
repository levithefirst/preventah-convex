import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { saveSession, type Session } from '../session';
import { CopyButton, Mark } from './Brand';

/**
 * The Gate is the hero.
 *
 * There is no landing page above it and no marketing screen in front of
 * the product: the first thing anyone sees states the job in one sentence
 * and offers the two things they can actually do. From here it is consent,
 * then a check-in. Three taps.
 */
export default function Gate({ onReady }: { onReady: (session: Session) => void }) {
  const create = useMutation(api.households.create);
  const join = useMutation(api.households.join);

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ session: Session; joinCode: string } | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') {
        const result = await create({ householdName, memberName });
        const session = { memberId: result.memberId, householdId: result.householdId };
        saveSession(session);
        // Hold here rather than jumping straight in: the code is the one
        // thing a second person needs, and it is easiest to share now.
        setCreated({ session, joinCode: result.joinCode });
      } else {
        const result = await join({ joinCode, memberName });
        if (!result.ok) {
          setError(result.reason);
          return;
        }
        const session = { memberId: result.memberId, householdId: result.householdId };
        saveSession(session);
        onReady(session);
      }
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <main className="wrap stack">
        <div className="chrome">
          <Mark />
          <span className="wordmark">Preventah</span>
        </div>

        <h1>Your household is open.</h1>

        <section className="window plated">
          <p className="bar mint">Join code</p>
          <p className="code">{created.joinCode}</p>
          <div className="codeRow">
            <CopyButton value={created.joinCode} label="Copy code" />
          </div>
          <p className="muted">
            Anyone in the house uses this to join. It is not a password: treat it like a door
            number, not a key, and only give it to people you would hand the front door to.
          </p>
        </section>

        <button className="btn primary block" onClick={() => onReady(created.session)}>
          Continue
        </button>

        <p className="tiny">
          General lifestyle guidance from public-health sources. Not medical advice.
        </p>
      </main>
    );
  }

  return (
    <main className="wrap stack">
      <div className="chrome">
        <Mark />
        <span className="wordmark">Preventah</span>
      </div>

      <h1>Three prevention actions a day, at three budgets, for a household.</h1>
      <p className="lede">
        Pick the conditions that run in your family. Get three things to do today, each one
        available free. Check one off and the rest of the house sees it.
      </p>

      <div className="tabs" role="group" aria-label="Start or join">
        <button
          className="tab"
          aria-current={mode === 'create' ? 'page' : undefined}
          onClick={() => setMode('create')}
        >
          Start a household
        </button>
        <button
          className="tab"
          aria-current={mode === 'join' ? 'page' : undefined}
          onClick={() => setMode('join')}
        >
          Join with a code
        </button>
      </div>

      <section className="window plated">
        <p className="bar cream">{mode === 'create' ? 'New household' : 'Join a household'}</p>

        {mode === 'create' ? (
          <label className="field" htmlFor="householdName">
            <span>Household name</span>
            <input
              id="householdName"
              value={householdName}
              onChange={(event) => setHouseholdName(event.target.value)}
              placeholder="Ours"
            />
          </label>
        ) : (
          <label className="field" htmlFor="joinCode">
            <span>Join code</span>
            <input
              id="joinCode"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ABC234"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </label>
        )}

        <label className="field" htmlFor="memberName">
          <span>Your name</span>
          <input
            id="memberName"
            value={memberName}
            onChange={(event) => setMemberName(event.target.value)}
            placeholder="Your first name"
            autoComplete="given-name"
          />
        </label>

        {error && <p className="alert">{error}</p>}

        <button className="btn primary block" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Working...' : mode === 'create' ? 'Create household' : 'Join household'}
        </button>
      </section>

      <p className="tiny">
        No account, no password. A code in the browser is all that keeps you signed in, which is
        enough for a kitchen table and is not a security boundary.
      </p>
    </main>
  );
}
