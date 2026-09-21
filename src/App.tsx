import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { clearSession, loadSession, type Session } from './session';
import { useDocumentMeta, useRoute } from './router';
import { APP_ROUTES, type Route } from './site';
import Gate from './components/Gate';
import Consent from './components/Consent';
import ConditionPicker from './components/ConditionPicker';
import Today from './components/Today';
import Board from './components/Board';
import MailSettings from './components/MailSettings';
import Profile from './components/Profile';
import Nav from './components/Nav';
import SiteFooter from './components/SiteFooter';
import { About, Contact, Faq, Home, NotFound, Privacy, Terms } from './components/Pages';
import { Disclaimer, Mark } from './components/Brand';

/**
 * The shell.
 *
 * Twelve routes, all registered server-side as well, so a reload or a
 * shared link lands where it points. Home is Today when there is a
 * household, the Gate when there is not, and the signed-out hero when
 * this browser has never been here.
 */

const isAppRoute = (route: Route): boolean => (APP_ROUTES as readonly string[]).includes(route);

export default function App() {
  const [route, go] = useRoute();
  const [session, setSession] = useState<Session | null>(() => loadSession());

  useDocumentMeta(route);

  const me = useQuery(api.members.today, session ? { memberId: session.memberId } : 'skip');

  // A member id that no longer resolves means a wiped deployment or a
  // stale browser. Drop it rather than showing a permanently empty app.
  useEffect(() => {
    if (session && me === null) {
      clearSession();
      setSession(null);
    }
  }, [session, me]);

  const leave = () => {
    clearSession();
    setSession(null);
    go('/');
  };

  const onboard = (next: Session) => {
    setSession(next);
    go('/today');
  };

  // Where the mark points. Today once there is a household, otherwise the
  // front door.
  const home: Route = session ? '/today' : '/';

  const publicPage = (() => {
    switch (route) {
      case '/about':
        return <About />;
      case '/faq':
        return <Faq />;
      case '/privacy':
        return <Privacy />;
      case '/terms':
        return <Terms />;
      case '/contact':
        return <Contact go={go} />;
      case '/404':
        return <NotFound go={go} />;
      default:
        return null;
    }
  })();

  // Public pages render the same whether or not anyone is signed in.
  if (publicPage) {
    return (
      <Shell route={route} go={go} home={home} signedIn={Boolean(session)}>
        {publicPage}
      </Shell>
    );
  }

  if (!session) {
    return (
      <Shell route={route} go={go} home={home} signedIn={false}>
        {route === '/' ? <Home go={(to) => go(to)} /> : <Gate onReady={onboard} />}
      </Shell>
    );
  }

  if (me === undefined) {
    return (
      <Shell route={route} go={go} home={home} signedIn>
        <p className="muted">Loading.</p>
      </Shell>
    );
  }
  if (me === null) {
    return (
      <Shell route={route} go={go} home={home} signedIn={false}>
        <Gate onReady={onboard} />
      </Shell>
    );
  }

  if (me.needsConsent) {
    return (
      <Shell route={route} go={go} home={home} signedIn>
        <Consent memberId={session.memberId} />
      </Shell>
    );
  }

  const screen = (() => {
    switch (route) {
      case '/conditions':
        return <ConditionPicker me={me} />;
      case '/board':
        return <Board householdId={session.householdId} />;
      case '/mail':
        return <MailSettings me={me} />;
      case '/profile':
        return <Profile me={me} householdId={session.householdId} onLeave={leave} />;
      default:
        return <Today me={me} />;
    }
  })();

  const current = isAppRoute(route) ? route : '/today';

  return (
    <Shell route={current} go={go} home={home} signedIn app>
      <Nav route={current} go={go} home={home} />
      <p className="chromeMeta">
        {me.name} &middot; {me.dayKey} &middot; {me.doneCount} of 3 done today
      </p>
      {screen}
      <Disclaimer />
    </Shell>
  );
}

function Shell({
  route,
  go,
  home,
  signedIn,
  app = false,
  children,
}: {
  route: Route;
  go: (to: Route) => void;
  home: Route;
  signedIn: boolean;
  app?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {!app && (
        <header className="chrome">
          <button className="home" onClick={() => go(home)} aria-label="Preventah, go home">
            <Mark />
            <span className="wordmark">Preventah</span>
          </button>
          {!signedIn && route !== '/' && (
            <button className="btn" onClick={() => go('/')}>
              Home
            </button>
          )}
        </header>
      )}
      <main className={app ? 'wrap wide' : 'wrap'} id="main">
        {children}
        {!app && <SiteFooter go={go} />}
      </main>
    </>
  );
}
