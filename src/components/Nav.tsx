import { useEffect, useRef, useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { APP_ROUTES, type Route } from '../site';
import { Mark } from './Brand';

/**
 * The signed-in header.
 *
 * The mark and wordmark go Home, at `/`, on every screen. They used to go
 * to Today, which is why tapping them felt broken: Today is a tab, and a
 * logo that lands on a tab gives you no way out of the app.
 *
 * Account actions sit with the destinations rather than buried in
 * Profile. On a phone the whole set collapses into one Menu that closes
 * on Escape and returns focus to its button.
 */

const LABEL: Record<string, string> = {
  '/today': 'Today',
  '/conditions': 'Conditions',
  '/board': 'Board',
  '/mail': 'Mail',
  '/profile': 'Profile',
};

export default function Nav({
  route,
  go,
  authed,
}: {
  route: Route;
  go: (to: Route) => void;
  authed: boolean;
}) {
  const { signOut } = useAuthActions();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const visit = (to: Route) => {
    setOpen(false);
    go(to);
  };

  const leave = () => {
    setOpen(false);
    void signOut().finally(() => go('/'));
  };

  return (
    <header className="chrome sticky">
      <button className="home" onClick={() => go('/')} aria-label="Preventah, go home">
        <Mark size={40} />
        <span className="wordmark">Preventah</span>
      </button>

      <span className="screenName">{LABEL[route] ?? 'Preventah'}</span>

      <button
        ref={buttonRef}
        className="btn menuButton"
        aria-expanded={open}
        aria-controls="navMenu"
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        {open ? 'Close' : 'Menu'}
      </button>

      <nav className="tabs desktopTabs" aria-label="Sections">
        {APP_ROUTES.map((path) => (
          <button
            key={path}
            className="tab"
            aria-current={route === path ? 'page' : undefined}
            onClick={() => go(path)}
          >
            {LABEL[path]}
          </button>
        ))}
        {authed ? (
          <button className="tab" onClick={leave}>
            Sign out
          </button>
        ) : (
          <>
            <button className="tab" onClick={() => go('/signin')}>
              Sign in
            </button>
            <button className="tab" onClick={() => go('/signup')}>
              Sign up
            </button>
          </>
        )}
      </nav>

      {open && (
        <div className="menu" id="navMenu" ref={menuRef} role="menu">
          {APP_ROUTES.map((path) => (
            <button
              key={path}
              className="menuItem"
              role="menuitem"
              aria-current={route === path ? 'page' : undefined}
              onClick={() => visit(path)}
            >
              {LABEL[path]}
            </button>
          ))}
          {authed ? (
            <button className="menuItem" role="menuitem" onClick={leave}>
              Sign out
            </button>
          ) : (
            <>
              <button className="menuItem" role="menuitem" onClick={() => visit('/signin')}>
                Sign in
              </button>
              <button className="menuItem" role="menuitem" onClick={() => visit('/signup')}>
                Sign up
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
