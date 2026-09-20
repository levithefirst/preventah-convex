import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { clearSession, loadSession, type Session } from './session';
import Gate from './components/Gate';
import Consent from './components/Consent';
import ConditionPicker from './components/ConditionPicker';
import Today from './components/Today';
import Board from './components/Board';
import MailSettings from './components/MailSettings';
import { Disclaimer, Mark } from './components/Brand';

/**
 * App chrome: a mark, the household's day, and four tabs. That is the
 * whole navigation. There is no marketing header above it and no route
 * below it that is not one of these four.
 */

type Tab = 'today' | 'conditions' | 'board' | 'mail';

const TABS: Tab[] = ['today', 'conditions', 'board', 'mail'];

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [tab, setTab] = useState<Tab>('today');

  const me = useQuery(api.members.today, session ? { memberId: session.memberId } : 'skip');

  // A member id that no longer resolves means a wiped deployment or a
  // stale browser. Drop it rather than showing a permanently empty app.
  useEffect(() => {
    if (session && me === null) {
      clearSession();
      setSession(null);
    }
  }, [session, me]);

  if (!session) return <Gate onReady={setSession} />;
  if (me === undefined || me === null) {
    return (
      <main className="wrap">
        <p className="muted">Loading.</p>
      </main>
    );
  }

  if (me.needsConsent) return <Consent memberId={session.memberId} />;

  const leave = () => {
    clearSession();
    setSession(null);
  };

  return (
    <main className="wrap">
      <div className="chrome">
        <Mark />
        <span className="wordmark">Preventah</span>
        <p className="chromeMeta">
          {me.name} &middot; {me.dayKey} &middot; {me.doneCount} of 3 done today
        </p>
      </div>

      <h1 className="srOnly">
        {tab === 'today'
          ? "Today's three actions"
          : tab === 'conditions'
            ? 'Conditions in your family'
            : tab === 'board'
              ? 'Household board'
              : 'Morning plan by email'}
      </h1>

      <nav className="tabs sections" aria-label="Sections">
        {TABS.map((name) => (
          <button
            key={name}
            className="tab"
            aria-current={tab === name ? 'page' : undefined}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      {tab === 'today' && <Today me={me} />}
      {tab === 'conditions' && <ConditionPicker me={me} />}
      {tab === 'board' && <Board householdId={session.householdId} />}
      {tab === 'mail' && <MailSettings me={me} />}

      <Disclaimer onLeave={leave} />
    </main>
  );
}
