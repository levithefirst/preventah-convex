import { useEffect, useRef, useState } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import type { Route } from '../site';
import { Mark } from './Brand';

/**
 * The header every public page wears: the landing, the auth pages and
 * the legal ones. Shared rather than rebuilt per page, so a sign-in
 * screen is never a logo floating on its own.
 *
 * It never wraps. Below 720px the links move into a Menu, because a
 * header that folds into a second cramped row reads as broken. The two
 * text links are the same size, weight and underline, sitting on one
 * baseline; the mint button is the only object that looks different,
 * and it says the same thing as the primary call to action in the hero.
 */
export default function SiteHeader({
  go,
  authed,
  hasHousehold,
  showHowItWorks = false,
}: {
  go: (to: Route) => void;
  authed: boolean;
  hasHousehold: boolean;
  showHowItWorks?: boolean;
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

  const primaryLabel = hasHousehold ? 'Open app' : 'Start';
  const primaryTo: Route = hasHousehold ? '/app' : '/start';

  const close = () => setOpen(false);
  const leave = () => {
    close();
    void signOut().finally(() => go('/'));
  };

  return (
    <header className="landHeader">
      <button className="home" onClick={() => go('/')} aria-label="Preventah, go home">
        <Mark size={40} />
        <span className="wordmark">Preventah</span>
      </button>

      <button
        ref={buttonRef}
        className="btn landMenuButton"
        aria-expanded={open}
        aria-controls="siteMenu"
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        {open ? 'Close' : 'Menu'}
      </button>

      <nav className="landNav" aria-label="Site">
        {showHowItWorks && (
          <a className="navLink" href="#how">
            How it works
          </a>
        )}
        {authed ? (
          <>
            <button className="navLink" onClick={() => go('/profile')}>
              Profile
            </button>
            <button className="navLink" onClick={leave}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <button className="navLink" onClick={() => go('/signin')}>
              Sign in
            </button>
            <button className="navLink" onClick={() => go('/signup')}>
              Sign up
            </button>
          </>
        )}
        <button className="btn primary" onClick={() => go(primaryTo)}>
          {primaryLabel}
        </button>
      </nav>

      {open && (
        <div className="menu landMenu" id="siteMenu" ref={menuRef} role="menu">
          {showHowItWorks && (
            <a className="menuItem" role="menuitem" href="#how" onClick={close}>
              How it works
            </a>
          )}
          {authed ? (
            <>
              <button
                className="menuItem"
                role="menuitem"
                onClick={() => {
                  close();
                  go('/profile');
                }}
              >
                Profile
              </button>
              <button className="menuItem" role="menuitem" onClick={leave}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                className="menuItem"
                role="menuitem"
                onClick={() => {
                  close();
                  go('/signin');
                }}
              >
                Sign in
              </button>
              <button
                className="menuItem"
                role="menuitem"
                onClick={() => {
                  close();
                  go('/signup');
                }}
              >
                Sign up
              </button>
            </>
          )}
          <button
            className="menuItem"
            role="menuitem"
            onClick={() => {
              close();
              go('/about');
            }}
          >
            What this is
          </button>
          <button
            className="menuItem"
            role="menuitem"
            onClick={() => {
              close();
              go(primaryTo);
            }}
          >
            {primaryLabel}
          </button>
        </div>
      )}
    </header>
  );
}
