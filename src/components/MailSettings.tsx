import { useState } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Me } from '../types';
import { guessTimezone } from '../session';

/**
 * Where the morning plan goes.
 *
 * Optional on purpose: the loop works entirely in the app, and mail is an
 * addition rather than the product. The manual send exists so a demo, or
 * a sceptical new member, does not have to wait until 07:00 to see that
 * it works.
 */
export default function MailSettings({ me }: { me: Me }) {
  const setProfile = useMutation(api.members.setProfile);
  const sendNow = useAction(api.mail.sendMorningNow);
  const lastSend = useQuery(api.mail.lastSendFor, { memberId: me.memberId });
  const [email, setEmail] = useState(me.email ?? '');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section className="stack">
      <div className="window plated">
        <p className="bar cream">Morning plan</p>

        <p className="muted">
          Two sends, both optional. The day's three at 07:00 your local time, and a nudge at
          19:00 if the day before went by without a check-in.
        </p>

        <label className="field" htmlFor="email">
          <span>Email address</span>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
          />
        </label>

        <p className="muted">Timezone: {me.timezone}. Saving updates it to this device's.</p>

        <div className="btnRow" style={{ marginTop: 12 }}>
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => {
              setStatus(null);
              void setProfile({
                memberId: me.memberId,
                email: email.trim() === '' ? null : email.trim(),
                timezone: guessTimezone(),
              }).then(() => setStatus('Saved.'));
            }}
          >
            Save
          </button>
          <button
            className="btn"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setStatus(null);
              void sendNow({ memberId: me.memberId })
                .then((result) => setStatus(result.detail))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? 'Sending…' : "Send today's plan now"}
          </button>
        </div>

        {status && <p className="muted">{status}</p>}
      </div>

      <div className="window">
        <p className="bar cream">Last send</p>
        <p>{describeSend(lastSend)}</p>
        <p className="tiny">
          Nothing is emailed until an address is saved here, and the daily loop works without
          one.
        </p>
      </div>
    </section>
  );
}

type SendRow = { kind: string; dayKey: string; status: string; at: number } | null | undefined;

/** Plain language, not a status code. */
function describeSend(row: SendRow): string {
  if (row === undefined) return 'Checking…';
  if (row === null) return 'Nothing sent yet.';

  const what = row.kind === 'nudge' ? 'A nudge' : "A morning plan";
  const when = new Date(row.at).toLocaleString();

  switch (row.status) {
    case 'sent':
      return `${what} went out on ${when}.`;
    case 'failed':
      return `${what} was attempted on ${when} and did not go out. The reason is on the deployment, not in this screen.`;
    case 'pending':
      return `${what} is going out now.`;
    case 'skipped':
      return `${what} was skipped on ${when}.`;
    default:
      return `${what} was last touched on ${when}.`;
  }
}
