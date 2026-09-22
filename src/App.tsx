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

  // A sign-in that resolved during this visit.
  //
  // `isAuthenticated` is the truth, but it is the truth a moment later:
  // it goes true when the client has the token, which is after the call
  // that got it came back. Anything drawn from `authed` alone therefore
  // has a window where a person who has just signed in is shown the
  // signed-out header, which reads as a sign-in that did not take. This
  // closes that window from the other end.
  const [justAuthed, setJustAuthed] = useState(false);

  useDocumentMeta(route);

  const me = useQuery(api.members.today, session ? { memberId: session.memberId } : 'skip');

  // A member id that no longer resolves means a wiped deployment or a
  // stale browser. Drop it rather than showing a permanently empty app.
  useEffect(() => {
    if (session && me === null && !authed) identity.release();
  }, [session, me, authed, identity]);

  const leave = () => {
    identity.release();
    setJustAuthed(false);
    go('/');
  };

  // Setup is finished when there is consent and at least one condition.
  // Until then the app would be three empty cards and a board with no
  // rows, which is what /start exists to avoid.
  const onboarded = Boolean(session && me && isOnboarded(me));

  // Identity has settled once auth has resolved and, where there is a
  // member, its day has loaded too. Bouncing before that would send an
  // onboarded person to /start for a frame.
  const settled = !identity.loading && (!session || me !== undefined);

  // The mark always goes to the front door. It used to go to Today,
  // which is a tab, so tapping the logo inside the app went nowhere.
  const home: Route = '/';

  // Someone who already has a session has no business looking at the
  // sign-in form. This is the other half of the bug where a successful
  // sign-in left you staring at the page you had just used.
  useEffect(() => {
    if (!authed || !settled) return;
    if (route !== '/signin' && route !== '/signup') return;
    go(onboarded ? '/today' : '/start');
  }, [authed, settled, route, onboarded, go]);

  // Signing in sends everyone to /start, because at the moment it
  // resolves nobody knows yet whether there is a household behind the
  // account. Once that does settle, someone who is already set up has no
  // onboarding left to do and belongs in the app.
  useEffect(() => {
    if (!justAuthed || route !== '/start' || !settled || !onboarded) return;
    go('/today');
  }, [justAuthed, route, settled, onboarded, go]);

  // Whoever the app is acting for, by any of the three ways it can be.
  const signedIn = authed || justAuthed || Boolean(session);

  // Signing in is over the moment the call comes back. It does not wait
  // on `isAuthenticated`, because waiting on it is what left people on
  // the form wondering whether the button had done anything.
  const onSignedIn = () => {
    setJustAuthed(true);
    go('/start');
  };

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
            <h1>{justAuthed ? 'You’re in.' : 'Welcome back.'}</h1>
            <SignIn
              mode="signIn"
              onSwitch={(to) => go(to === 'signUp' ? '/signup' : '/signin')}
              onSignedIn={onSignedIn}
              justAuthed={justAuthed}
            />
          </>
        );
      case '/signup':
        return (
          <>
            <h1>{justAuthed ? 'You’re in.' : 'Create your account.'}</h1>
            <SignIn
              mode="signUp"
              onSwitch={(to) => go(to === 'signUp' ? '/signup' : '/signin')}
              onSignedIn={onSignedIn}
              justAuthed={justAuthed}
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
        signedIn={signedIn}
        header={
          <SiteHeader
            go={go}
            signedIn={signedIn}
            justAuthed={justAuthed && (route === '/signin' || route === '/signup')}
            hasHousehold={onboarded}
            onSignOut={leave}
          />
        }
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
        signedIn={signedIn}
        bare
        header={
          <SiteHeader
            go={go}
            signedIn={signedIn}
            hasHousehold={onboarded}
            showHowItWorks
            onSignOut={leave}
          />
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
          justAuthed={justAuthed}
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
          justAuthed={justAuthed}
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
          justAuthed={justAuthed}
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
