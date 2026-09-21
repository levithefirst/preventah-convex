import { useState } from 'react';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import type { Me } from '../types';
import type { Id } from '../../convex/_generated/dataModel';
import { CopyButton } from './Brand';

/**
 * Profile: who this browser is, which household it belongs to, and the
 * way out of it.
 *
 * "Leave this household" lives here rather than under the footer, so
 * leaving is a deliberate trip to a settings screen instead of the only
 * link that happened to be at the bottom of every page.
 */
export default function Profile({
  me,
  householdId,
  onLeave,
  authed,
}: {
  me: Me;
  householdId: Id<'households'>;
  onLeave: () => void;
  authed: boolean;
}) {
  const board = useQuery(api.households.board, { householdId });
  const account = useQuery(api.account.me, authed ? {} : 'skip');
  const status = useQuery(api.authStatus.status, {});
  const { signOut } = useAuthActions();
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="stack">
      <div className="window plated">
        <p className="bar cream">You</p>
        <dl className="pairs">
          <dt>Name</dt>
          <dd>{me.name}</dd>
          <dt>Household</dt>
          <dd>{board?.householdName ?? '—'}</dd>
          <dt>People in it</dt>
          <dd>
            {board ? board.members.length : '—'}
            {board && board.members.length === 1 ? ' (just you)' : ''}
          </dd>
          <dt>Conditions tracked</dt>
          <dd>{me.conditions.length}</dd>
          <dt>Timezone</dt>
          <dd>{me.timezone}</dd>
          <dt>Morning plan</dt>
          <dd>{me.email ? 'On' : 'Off'}</dd>
        </dl>
      </div>

      {board && (
        <div className="window">
          <p className="bar cream">Invite someone</p>
          <p className="muted">
            Anyone who types this code joins your household and appears on the board. It is not a
            password and it is not how you sign in.
          </p>
          <div className="codeRow">
            <span className="code small">{board.joinCode}</span>
            <CopyButton value={board.joinCode} label="Copy code" />
          </div>
        </div>
      )}

      <div className="window">
        <p className="bar cream">Leaving</p>
        <p className="muted">
          This detaches this browser from the household. The household and everyone else in it
          carry on unchanged, and you can rejoin with the code.
        </p>
        {confirming ? (
          <div className="btnRow">
            <button className="btn" onClick={onLeave}>
              Yes, leave on this device
            </button>
            <button className="btn primary" onClick={() => setConfirming(false)}>
              Stay
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => setConfirming(true)}>
            Leave this household on this device
          </button>
        )}
      </div>

      <div className="window">
        <p className="bar ink">Account</p>
        {authed && account ? (
          <>
            <dl className="pairs">
              <dt>Signed in as</dt>
              <dd>{account.name ?? me.name}</dd>
              <dt>Email</dt>
              <dd>{account.email ?? '\u2014'}</dd>
            </dl>
            <p className="tiny">
              Your email is set by the account you signed in with and is not editable here.
            </p>
            <button className="btn" onClick={() => void signOut()}>
              Sign out
            </button>
          </>
        ) : status?.ready ? (
          <p className="muted">
            You are not signed in, so this browser is the only thing that remembers you. Clearing
            site data would mean rejoining with the code. Sign in from the home page to attach
            this household to an account.
          </p>
        ) : (
          <p className="muted">
            Accounts are not switched on for this deployment yet, so this browser is the only
            thing that remembers you. Clearing site data means rejoining with the code.
          </p>
        )}
      </div>
    </section>
  );
}
