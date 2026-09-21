import { useEffect, useRef, useState } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { clearSession, loadSession, saveSession, type Session } from './session';

/**
 * Who the app is acting as.
 *
 * Two eras coexist on purpose. A browser that has never signed in keeps
 * using the member id in localStorage, exactly as before accounts. The
 * moment someone signs in, their account decides, and the id in the
 * browser is downgraded from identity to a one-time hint about which
 * member row to claim.
 *
 * The claim runs once per account, guarded on the server as well: the
 * mutation refuses a member that already belongs to someone.
 */
export interface Identity {
  /** Null while loading, or when there is no member to act as yet. */
  session: Session | null;
  /** True once Convex Auth has a session for this browser. */
  authed: boolean;
  loading: boolean;
  /** Adopts a member created during this visit. */
  adopt: (next: Session) => void;
  /** Detaches this browser from its household. */
  release: () => void;
}

export function useIdentity(): Identity {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [local, setLocal] = useState<Session | null>(() => loadSession());

  const mine = useQuery(api.account.myMember, isAuthenticated ? {} : 'skip');
  const attach = useMutation(api.account.attachLocalMember);
  const attempted = useRef(false);

  // One attempt, ever, and only when the account has no member of its own.
  useEffect(() => {
    if (!isAuthenticated || mine === undefined || mine !== null) return;
    const carried = loadSession();
    if (!carried || attempted.current) return;
    attempted.current = true;
    void attach({ memberId: carried.memberId }).catch(() => {
      // A member owned by someone else simply is not adopted. The account
      // goes to the Gate and starts its own, which is the right outcome.
    });
  }, [isAuthenticated, mine, attach]);

  const session: Session | null = isAuthenticated
    ? mine
      ? { memberId: mine.memberId, householdId: mine.householdId }
      : null
    : local;

  return {
    session,
    authed: isAuthenticated,
    loading: isLoading || (isAuthenticated && mine === undefined),
    adopt: (next) => {
      saveSession(next);
      setLocal(next);
    },
    release: () => {
      clearSession();
      setLocal(null);
    },
  };
}
