import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Mark } from './Brand';

/**
 * The consent gate, and the one screen wearing an ink bar.
 *
 * Nothing about anyone's family health is collected until this is
 * accepted. The checkbox is not a formality: the button stays disabled
 * while it is closed, because a gate you can walk past is not a gate.
 */
export default function Consent({ memberId }: { memberId: Id<'members'> }) {
  const copy = useQuery(api.members.consentCopy, {});
  const consent = useMutation(api.members.consent);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <main className="wrap stack">
      <div className="chrome">
        <Mark />
        <span className="wordmark">Preventah</span>
      </div>

      <h1>Before you pick anything.</h1>

      <section className="window plated roomy">
        <p className="bar ink">What you are agreeing to</p>

        {copy === undefined ? (
          <p className="muted">Loading.</p>
        ) : (
          <ul>
            {copy.lines.map((line) => (
              <li key={line} style={{ marginBottom: 10 }}>
                {line}
              </li>
            ))}
          </ul>
        )}

        <label className="check" htmlFor="agree">
          <input
            id="agree"
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

      <p className="tiny pinBottom">
        You can withdraw this at any time. Withdrawing clears the conditions you picked rather
        than keeping them warm for later.
      </p>
    </main>
  );
}
