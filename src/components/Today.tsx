import { useEffect, useRef, useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Action, Me } from '../types';
import Sources from './Sources';

/**
 * Today: three windows, three tiers each, one tap to check in.
 *
 * The mint bar says this is a habit day. Done is mint and not-done is
 * cream, which is the whole status vocabulary: there is no red for a
 * missed action, because a missed action is not an error.
 */
export default function Today({ me }: { me: Me }) {
  return (
    <section className="stack">
      <Wording me={me} />

      {me.isBaseline && (
        <p className="window">
          This is the general plan. Pick the conditions that run in your family and today's three
          change to match.
        </p>
      )}

      {me.actions.map((action, index) => (
        <ActionCard key={action.id} action={action} me={me} plated={index === 0} />
      ))}

      {me.conditions.length > 0 && <Sources conditions={me.conditions} />}
    </section>
  );
}

/**
 * The wording line, and the one call that produces it.
 *
 * `me.rewrite` is null only until today's row exists, so this fires at
 * most once per member per day; after that the row short-circuits the
 * action before any network call, which is what makes the refresh button
 * free rather than another charge. The ref guards the second render of
 * StrictMode, and the server guards everything else.
 */
function Wording({ me }: { me: Me }) {
  const generate = useAction(api.plansGenerate.generate);
  const [busy, setBusy] = useState(false);
  const asked = useRef<string | null>(null);

  const needsGenerating = me.rewrite === null;

  useEffect(() => {
    if (!needsGenerating) return;
    const key = `${me.memberId}:${me.dayKey}`;
    if (asked.current === key) return;
    asked.current = key;
    setBusy(true);
    void generate({ memberId: me.memberId }).finally(() => setBusy(false));
  }, [needsGenerating, me.memberId, me.dayKey, generate]);

  const label =
    me.rewrite === 'openai'
      ? 'Wording tightened · sources unchanged'
      : 'Catalog wording';

  return (
    <p className="tiny">
      {busy && me.rewrite === null ? 'Tightening wording…' : label}
      {me.rewrite === 'openai' && me.model ? ` · ${me.model}` : ''}{' '}
      <button className="link" disabled={busy} onClick={() => {
        setBusy(true);
        void generate({ memberId: me.memberId }).finally(() => setBusy(false));
      }}>
        Refresh wording
      </button>
    </p>
  );
}

const BAR: Record<string, string> = {
  diet: 'Eat',
  exercise: 'Move',
  habit: 'Habit',
};

function ActionCard({ action, me, plated }: { action: Action; me: Me; plated: boolean }) {
  const check = useMutation(api.checkins.check);
  const undo = useMutation(api.checkins.undo);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const detailId = `detail-${action.id}`;

  return (
    <article className={plated ? 'window plated' : 'window'}>
      <p className="bar mint">{BAR[action.type] ?? action.type}</p>

      <h2>{action.title}</h2>
      <p>{action.description}</p>

      {action.safetyNote && <p className="safety">{action.safetyNote}</p>}

      <div className="tiers">
        {action.options.map((option) => (
          <button
            key={option.tier}
            className="tier"
            aria-pressed={action.doneTier === option.tier}
            onClick={() => {
              setError(null);
              void check({ memberId: me.memberId, actionId: action.id, tier: option.tier }).then(
                (result) => {
                  if (!result.ok) setError(result.reason);
                },
              );
            }}
          >
            <span className="tierLabel">{option.label}</span>
            <span className="tierTitle">{option.title}</span>
            <span className="tierCost">{option.costHint}</span>
          </button>
        ))}
      </div>

      {error && <p className="alert">{error}</p>}

      {action.doneTier && (
        <p className="muted">
          Done today at the {action.doneTier} tier.{' '}
          <button
            className="link"
            onClick={() => void undo({ memberId: me.memberId, actionId: action.id })}
          >
            Undo
          </button>
        </p>
      )}

      {/* The source is readable without opening anything. A citation you
          have to go looking for is not really a citation. */}
      <p className="sourceLine">
        Source:{' '}
        <a href={action.sourceUrl} target="_blank" rel="noreferrer">
          {action.sourceName}
        </a>
        {action.relatedConditions.length > 0
          ? ` · connects to ${action.relatedConditions.join(', ')}`
          : ' · general prevention'}
      </p>

      <button className="link" aria-expanded={open} aria-controls={detailId} onClick={() => setOpen(!open)}>
        {open ? 'Hide why and how' : 'Why this, and how'}
      </button>

      <div className={open ? 'disclosure open' : 'disclosure'} id={detailId}>
        <div className="disclosureInner">
          <div className="detail">
            <p>{action.why}</p>
            <ol>
              {action.howTo.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="muted">{action.benefit}</p>
            <p className="muted">Today's target: {action.target}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
