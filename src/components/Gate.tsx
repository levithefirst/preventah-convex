import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { saveSession, type Session } from '../session';
import { CopyButton } from './Brand';

/**
 * Choosing how you start.
 *
 * Three labels, one model. "Just me" and "Start a household" call the
 * same mutation and write the same rows; solo is a household of one, so
 * there is no second codepath, no mode flag and no screen that hides the
 * board. The only difference is whether the join code is shown large or
 * folded away until someone wants it.
 */

type Mode = 'solo' | 'household' | 'join';

const MODES: { mode: Mode; label: string; hint: string }[] = [
  { mode: 'solo', label: 'Just me', hint: 'A household of one. Add family whenever you like.' },
  { mode: 'household', label: 'Start a household', hint: 'Get a code and share it with the house.' },
  { mode: 'join', label: 'Join with a code', hint: 'Someone already started one.' },
];

export default function Gate({ onReady }: { onReady: (session: Session) => void }) {
  const create = useMutation(api.households.create);
  const join = useMutation(api.households.join);

  const [mode, setMode] = useState<Mode>('solo');
  const [householdName, setHouseholdName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ session: Session; joinCode: string; solo: boolean } | null>(
    null,
  );

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'join') {
        const result = await join({ joinCode, memberName });
        if (!result.ok) {
          setError(result.reason);
          return;
        }
        const session = { memberId: result.memberId, householdId: result.householdId };
        saveSession(session);
        onReady(session);
        return;
      }

      const solo = mode === 'solo';
      const name = solo
        ? `${memberName.trim() || 'My'}${/s$/i.test(memberName.trim()) ? "'" : "'s"} plan`
        : householdName;
      const result = await create({ householdName: name, memberName });
      const session = { memberId: result.memberId, householdId: result.householdId };
      saveSession(session);
      setCreated({ session, joinCode: result.joinCode, solo });
    } catch {
      // The typed inputs survive a failed submit: nothing is cleared here.
      setError('That did not go through. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <>
        <h1>{created.solo ? "You're set up." : 'Your household is open.'}</h1>

        {created.solo ? (
          <section className="window plated roomy">
            <p className="bar mint">Ready</p>
            <p>
              Everything works the same as it does for a family: the same three actions, the same
              board, with one row on it. Nobody else can see it.
            </p>
            <details className="fold">
              <summary>Invite family later</summary>
              <p className="muted">
                This is your join code. Anyone who types it joins your household and appears on
                the board. You do not need it to use the app yourself.
              </p>
              <div className="codeRow">
                <span className="code small">{created.joinCode}</span>
                <CopyButton value={created.joinCode} label="Copy code" />
              </div>
            </details>
          </section>
        ) : (
          <section className="window plated roomy">
            <p className="bar mint">Join code</p>
            <p className="code">{created.joinCode}</p>
            <div className="codeRow">
              <CopyButton value={created.joinCode} label="Copy code" />
            </div>
            <p className="muted">
              Anyone in the house uses this to join. It is how you enter a household, not how you
              sign in: treat it like a door number, and give it only to people you would let in.
            </p>
          </section>
        )}

        <button className="btn primary block" onClick={() => onReady(created.session)}>
          Go to today
        </button>
      </>
    );
  }

  const soloOrHousehold = mode !== 'join';

  return (
    <>
      <h1>Three prevention actions a day, for a household.</h1>
      <p className="lede">
        Pick the conditions that run in your family. Get one thing to eat, one to move and one to
        keep. Check one off and the rest of the house sees it.
      </p>

      <div className="choices" role="group" aria-label="How do you want to start?">
        {MODES.map((option) => (
          <button
            key={option.mode}
            className="choice"
            aria-pressed={mode === option.mode}
            onClick={() => {
              setMode(option.mode);
              setError(null);
            }}
          >
            <span className="choiceLabel">{option.label}</span>
            <span className="choiceHint">{option.hint}</span>
          </button>
        ))}
      </div>

      <section className="window plated roomy">
        <p className="bar cream">{MODES.find((m) => m.mode === mode)?.label}</p>

        {mode === 'household' && (
          <label className="field" htmlFor="householdName">
            <span>Household name</span>
            <input
              id="householdName"
              value={householdName}
              onChange={(event) => setHouseholdName(event.target.value)}
              placeholder="Ours"
            />
          </label>
        )}

        {mode === 'join' && (
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
              aria-describedby={error ? 'gateError' : undefined}
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

        {error && (
          <p className="alert" id="gateError" role="alert">
            {error}
          </p>
        )}

        <button className="btn primary block" disabled={busy} onClick={() => void submit()}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" /> Working
            </>
          ) : soloOrHousehold ? (
            'Create and continue'
          ) : (
            'Join household'
          )}
        </button>
      </section>

      <p className="tiny">
        A join code is how you enter a household, not how you sign in.
      </p>
    </>
  );
}
