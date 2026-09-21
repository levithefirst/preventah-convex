import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { saveSession, type Session } from '../session';
import type { Me } from '../types';
import { CopyButton, Mark } from './Brand';

/**
 * Onboarding, in four steps, one visible at a time.
 *
 * This exists because the alternative was dropping someone straight onto
 * Today with three cards drawn from nothing and a board with no rows.
 * Nobody reaches the app until there is a household, consent, a name and
 * at least one condition, so the first Today anyone sees is a real one.
 */

type Shape = 'solo' | 'household' | 'join';

const HEADING: Record<number, string> = {
  1: 'Who is this for?',
  2: 'Before you pick anything.',
  3: 'What should the board call you?',
  4: 'What runs in your family?',
};

export default function Start({
  session,
  me,
  onSession,
  onDone,
}: {
  session: Session | null;
  me: Me | null;
  onSession: (next: Session) => void;
  onDone: () => void;
}) {
  // The step is derived from what actually exists, not from a counter, so
  // a reload in the middle lands back where it left off.
  const step = !session ? 1 : me === null ? 1 : me.needsConsent ? 2 : !me.name.trim() ? 3 : 4;

  return (
    <>
      <div className="chrome">
        <button className="home" onClick={onDone} aria-label="Preventah, go home">
          <Mark size={40} />
          <span className="wordmark">Preventah</span>
        </button>
      </div>

      <h1>{HEADING[step]}</h1>

      <p className="progress" aria-live="polite">
        Step {step} of 4
      </p>
      <div className="progressBar" role="presentation">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={n <= step ? 'progressPip on' : 'progressPip'} />
        ))}
      </div>

      {step === 1 && <StepShape onSession={onSession} />}
      {step === 2 && session && <StepConsent memberId={session.memberId} />}
      {step === 3 && session && me && <StepName me={me} />}
      {step === 4 && session && me && <StepConditions me={me} onDone={onDone} />}
    </>
  );
}

const SHAPES: { shape: Shape; label: string; hint: string }[] = [
  { shape: 'solo', label: 'Just me', hint: 'A household of one. Add family whenever you like.' },
  { shape: 'household', label: 'Start a household', hint: 'Get a code and share it with the house.' },
  { shape: 'join', label: 'I have a code', hint: 'Someone has already started one.' },
];

function StepShape({ onSession }: { onSession: (next: Session) => void }) {
  const create = useMutation(api.households.create);
  const join = useMutation(api.households.join);
  const [shape, setShape] = useState<Shape>('solo');
  const [householdName, setHouseholdName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<{ value: string; session: Session; solo: boolean } | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (shape === 'join') {
        const result = await join({ joinCode, memberName });
        if (!result.ok) {
          setError(result.reason);
          return;
        }
        onSession({ memberId: result.memberId, householdId: result.householdId });
        return;
      }
      const solo = shape === 'solo';
      const trimmed = memberName.trim();
      const name = solo ? `${trimmed || 'My'}${/s$/i.test(trimmed) ? "'" : "'s"} plan` : householdName;
      const result = await create({ householdName: name, memberName });
      const next = { memberId: result.memberId, householdId: result.householdId };
      saveSession(next);
      setCode({ value: result.joinCode, session: next, solo });
    } catch {
      setError('That did not go through. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (code) {
    return (
      <section className="window plated roomy">
        <p className="bar mint">{code.solo ? 'Ready' : 'Your join code'}</p>
        {code.solo ? (
          <>
            <p>
              Everything works the same as it does for a family: the same three actions, the same
              board, with one row on it.
            </p>
            <details className="fold">
              <summary>Invite family later</summary>
              <p className="muted">Anyone who types this code joins your household.</p>
              <div className="codeRow">
                <span className="code small">{code.value}</span>
                <CopyButton value={code.value} label="Copy code" />
              </div>
            </details>
          </>
        ) : (
          <>
            <p className="code">{code.value}</p>
            <div className="codeRow">
              <CopyButton value={code.value} label="Copy code" />
            </div>
            <p className="muted">
              Anyone in the house uses this to join. It is how you enter a household, not how you
              sign in.
            </p>
          </>
        )}
        <button className="btn primary block" onClick={() => onSession(code.session)}>
          Continue
        </button>
      </section>
    );
  }

  return (
    <section className="window plated roomy">
      <p className="bar cream">You, or the house?</p>

      <div className="choices" role="group" aria-label="How do you want to start?">
        {SHAPES.map((option) => (
          <button
            key={option.shape}
            className="choice"
            aria-pressed={shape === option.shape}
            onClick={() => {
              setShape(option.shape);
              setError(null);
            }}
          >
            <span className="choiceLabel">{option.label}</span>
            <span className="choiceHint">{option.hint}</span>
          </button>
        ))}
      </div>

      {shape === 'household' && (
        <label className="field" htmlFor="startHousehold">
          <span>Household name</span>
          <input
            id="startHousehold"
            value={householdName}
            onChange={(event) => setHouseholdName(event.target.value)}
            placeholder="Ours"
          />
        </label>
      )}

      {shape === 'join' && (
        <label className="field" htmlFor="startCode">
          <span>Join code</span>
          <input
            id="startCode"
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

      <label className="field" htmlFor="startName">
        <span>Your name</span>
        <input
          id="startName"
          value={memberName}
          onChange={(event) => setMemberName(event.target.value)}
          placeholder="Your first name"
          autoComplete="given-name"
        />
      </label>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <button className="btn primary block" disabled={busy} onClick={() => void submit()}>
        {busy ? (
          <>
            <span className="spinner" aria-hidden="true" /> Working
          </>
        ) : (
          'Continue'
        )}
      </button>
    </section>
  );
}

function StepConsent({ memberId }: { memberId: Session['memberId'] }) {
  const copy = useQuery(api.members.consentCopy, {});
  const consent = useMutation(api.members.consent);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <section className="window plated roomy">
      <p className="bar ink">What you are agreeing to</p>
      {copy === undefined ? (
        <p className="muted">Loading.</p>
      ) : (
        <ul>
          {copy.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <label className="check" htmlFor="startAgree">
        <input
          id="startAgree"
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <span>I have read this and I understand it.</span>
      </label>
      <button
        className="btn primary block"
        style={{ marginTop: 12 }}
        disabled={busy || !agreed || copy === undefined}
        onClick={() => {
          setBusy(true);
          void consent({ memberId, accepted: true }).finally(() => setBusy(false));
        }}
      >
        Continue
      </button>
    </section>
  );
}

function StepName({ me }: { me: Me }) {
  const setProfile = useMutation(api.members.setProfile);
  const [name, setName] = useState(me.name);
  const [busy, setBusy] = useState(false);

  return (
    <section className="window plated roomy">
      <p className="bar cream">What the board calls you</p>
      <label className="field" htmlFor="boardName">
        <span>Your name</span>
        <input
          id="boardName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="given-name"
        />
      </label>
      <p className="muted">
        This is what the rest of the household sees next to your check-ins. Nothing else about you
        appears there.
      </p>
      <button
        className="btn primary block"
        disabled={busy || name.trim().length === 0}
        onClick={() => {
          setBusy(true);
          void setProfile({ memberId: me.memberId, email: me.email, name: name.trim() }).finally(
            () => setBusy(false),
          );
        }}
      >
        Continue
      </button>
    </section>
  );
}

function StepConditions({ me, onDone }: { me: Me; onDone: () => void }) {
  const [q, setQ] = useState('');
  const catalog = useQuery(api.catalog.search, { q, category: null, limit: 40 });
  const setConditions = useMutation(api.members.setConditions);

  const selected = new Set(me.conditions.map((condition) => condition.id));
  const atCap = selected.size >= me.maxSelections;
  const unpicked = catalog?.results.filter((entry) => !selected.has(entry.id)) ?? [];

  const toggle = (id: string) => {
    const next = selected.has(id)
      ? [...selected].filter((value) => value !== id)
      : [...selected, id];
    void setConditions({ memberId: me.memberId, conditionIds: next });
  };

  return (
    <section className="stack">
      <div className="window plated">
        <p className="bar cream">What runs in your family</p>
        <p className="muted">
          Pick at least one. Up to {me.maxSelections}. Nobody else in the household can see which
          ones.
        </p>
      </div>

      <div className="window">
        <p className="bar mint">On your list</p>
        {me.conditions.length === 0 ? (
          <p className="empty">None yet. Search below and add one.</p>
        ) : (
          <ul className="rail">
            {me.conditions.map((condition) => (
              <li key={condition.id}>
                <span className="railName">{condition.name}</span>
                <button
                  className="btn railRemove"
                  onClick={() => toggle(condition.id)}
                  aria-label={`Remove ${condition.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="window">
        <label className="field" htmlFor="startSearch">
          <span>Search conditions</span>
          <input
            id="startSearch"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Heart, diabetes, bone"
            autoComplete="off"
          />
        </label>
        <div className="chips">
          {unpicked.slice(0, 12).map((entry) => (
            <button
              key={entry.id}
              className="chip"
              disabled={atCap}
              onClick={() => toggle(entry.id)}
            >
              + {entry.name}
            </button>
          ))}
        </div>
        {catalog !== undefined && unpicked.length === 0 && (
          <p className="empty">Nothing else matches that.</p>
        )}
      </div>

      <button
        className="btn primary block"
        disabled={me.conditions.length === 0}
        onClick={onDone}
      >
        {me.conditions.length === 0 ? 'Pick at least one' : "Go to today's three"}
      </button>
    </section>
  );
}
