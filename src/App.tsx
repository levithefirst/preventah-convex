import { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Session } from './session';
import { useIdentity } from './useIdentity';
import { useDocumentMeta, useRoute } from './router';
import { APP_ROUTES, type Route } from './site';
import type { Me } from './types';
import Consent from './components/Consent';
import ConditionPicker from './components/ConditionPicker';
import Today from './components/Today';
import Board from './components/Board';
import MailSettings from './components/MailSettings';
import Profile from './components/Profile';
import Nav from './components/Nav';
import SiteFooter from './components/SiteFooter';
import { About, Contact, Faq, NotFound, Privacy, Terms } from './components/Pages';
import Landing from './components/Landing';
import Start from './components/Start';
import SignIn from './components/SignIn';
import { Disclaimer } from './components/Brand';
import SiteHeader from './components/SiteHeader';

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
  const identity = useIdentity();
  const { session, authed } = identity;

  useDocumentMeta(route);

  const me = useQuery(api.members.today, session ? { memberId: session.memberId } : 'skip');

  // A member id that no longer resolves means a wiped deployment or a
  // stale browser. Drop it rather than showing a permanently empty app.
  useEffect(() => {
    if (session && me === null && !authed) identity.release();
  }, [session, me, authed, identity]);

  const leave = () => {
    identity.release();
    go('/');
  };

  // Setup is finished when there is consent and at least one condition.
  // Until then the app would be three empty cards and a board with no
  // rows, which is what /start exists to avoid.
  const onboarded = Boolean(session && me && isOnboarded(me));

  // The mark always goes to the front door. It used to go to Today,
  // which is a tab, so tapping the logo inside the app went nowhere.
  const home: Route = '/';

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
      case '/signin':
        return (
          <>
            <h1>Welcome back.</h1>
            <SignIn
              mode="signIn"
              onSwitch={(to) => go(to === 'signUp' ? '/signup' : '/signin')}
            />
          </>
        );
      case '/signup':
        return (
          <>
            <h1>Create your account.</h1>
            <SignIn
              mode="signUp"
              onSwitch={(to) => go(to === 'signUp' ? '/signup' : '/signin')}
            />
          </>
        );
      case '/404':
        return <NotFound go={go} />;
      default:
        return null;
    }
  })();

  // Public pages render the same whether or not anyone is signed in, and
  // wear the same header as the landing rather than a floating logo.
  if (publicPage) {
    return (
      <Shell
        route={route}
        go={go}
        home={home}
        signedIn={Boolean(session)}
        header={<SiteHeader go={go} authed={authed} hasHousehold={onboarded} />}
      >
        {publicPage}
      </Shell>
    );
  }

  // The marketing home never mounts a tab, a check-in or a crawl result.
  if (route === '/') {
    return (
      <Shell
        route={route}
        go={go}
        home={home}
        signedIn={authed}
        bare
        header={
          <SiteHeader go={go} authed={authed} hasHousehold={onboarded} showHowItWorks />
        }
      >
        <Landing go={go} hasHousehold={onboarded} />
      </Shell>
    );
  }

  if (route === '/start') {
    return (
      <Shell route={route} go={go} home={home} signedIn={authed} bare>
        <Start
          session={session}
          me={me ?? null}
          authed={authed}
          onSession={(next) => identity.adopt(next)}
          onDone={() => go('/today')}
          go={go}
        />
      </Shell>
    );
  }

  // Anything else in the app needs a finished setup behind it.
  if (!session || (me !== undefined && me !== null && !isOnboarded(me))) {
    return (
      <Shell route={route} go={go} home={home} signedIn={authed} bare>
        <Start
          session={session}
          me={me ?? null}
          authed={authed}
          onSession={(next) => identity.adopt(next)}
          onDone={() => go('/today')}
          go={go}
        />
      </Shell>
    );
  }

  if (identity.loading || me === undefined) {
    return (
      <Shell route={route} go={go} home={home} signedIn>
        <p className="muted">Loading.</p>
      </Shell>
    );
  }
  if (me === null) {
    return (
      <Shell route={route} go={go} home={home} signedIn={authed} bare>
        <Start
          session={null}
          me={null}
          authed={authed}
          onSession={(next) => identity.adopt(next)}
          onDone={() => go('/today')}
          go={go}
        />
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
        return <Profile
            me={me}
            householdId={session.householdId}
            onLeave={leave}
            authed={authed}
            go={go}
          />;
      default:
        return <Today me={me} />;
    }
  })();

  const current = isAppRoute(route) ? route : '/today';

  return (
    <Shell route={current} go={go} home={home} signedIn app>
      <Nav route={current} go={go} authed={authed} />
      <p className="chromeMeta">
        {me.name} &middot; {me.dayKey} &middot; {me.doneCount} of 3 done today
      </p>
      {screen}
      <Disclaimer />
    </Shell>
  );
}

/** Consent given, and at least one condition chosen. */
function isOnboarded(me: Me): boolean {
  return !me.needsConsent && me.conditions.length > 0;
}

function Shell({
  route,
  go,
  home,
  signedIn: _signedIn,
  app = false,
  bare = false,
  header,
  children,
}: {
  route: Route;
  go: (to: Route) => void;
  home: Route;
  signedIn: boolean;
  app?: boolean;
  bare?: boolean;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {!app && header}
      <main className={app ? 'wrap wide' : bare ? 'wrap bare' : 'wrap sitePage'} id="main">
        {children}
        {!app && <SiteFooter go={go} />}
      </main>
    </>
  );
}
