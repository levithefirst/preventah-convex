import { useState } from 'react';
import { useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '../../convex/_generated/api';
import type { Me } from '../types';
import type { Id } from '../../convex/_generated/dataModel';
import { CopyButton } from './Brand';
import { inviteUrl } from '../site';

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
  go,
}: {
  me: Me;
  householdId: Id<'households'>;
  onLeave: () => void;
  authed: boolean;
  go: (to: '/signin' | '/signup' | '/') => void;
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
            Send this link to someone you live with. Opening it adds them to your household and
            puts them on the board.
          </p>
          <div className="codeRow">
            <CopyButton value={inviteUrl(board.joinCode)} label="Copy invite link" />
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
            <button className="btn" onClick={() => void signOut().finally(() => go('/'))}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              You are not signed in, so this browser is the only thing that remembers you.
              Clearing site data would mean rejoining with the code. Signing in attaches this
              household to an account and keeps it.
            </p>
            {status !== undefined && !status.ready && (
              <p className="tiny">Account signing is still warming up on this deployment.</p>
            )}
            <div className="btnRow">
              <button className="btn primary" onClick={() => go('/signin')}>
                Sign in
              </button>
              <button className="btn" onClick={() => go('/signup')}>
                Sign up
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
