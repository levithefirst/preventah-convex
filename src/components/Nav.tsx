import { useEffect, useRef, useState } from 'react';
import { APP_ROUTES, type Route } from '../site';
import { Mark } from './Brand';

/**
 * The signed-in header.
 *
 * The mark and the wordmark are a link home, which is the bug this
 * replaced: there was previously no way back except leaving the
 * household. On a phone the five destinations collapse into one Menu
 * button rather than wrapping into a broken row, and the menu is
 * keyboard-usable: Escape closes it and focus returns to the button.
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
  home,
}: {
  route: Route;
  go: (to: Route) => void;
  home: Route;
}) {
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

  return (
    <header className="chrome sticky">
      <button className="home" onClick={() => go(home)} aria-label="Preventah, go home">
        <Mark />
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
        </div>
      )}
    </header>
  );
}
