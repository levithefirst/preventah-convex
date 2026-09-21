import { useAuthActions } from '@convex-dev/auth/react';
import { PURPOSE, type Route } from '../site';
import { Mark } from './Brand';
import Character from './Character';

/**
 * The marketing home, and nothing else.
 *
 * `/` used to mount the app, which is why Today looked like the landing
 * page: there was no landing page. This route never renders a tab, a
 * check-in or a crawl result. Its whole job is to say what the thing is
 * and offer one way in.
 */

const BAND = [
  {
    title: 'Conditions stay private',
    body: 'Your household sees that you checked in and how many conditions you track. Never which ones.',
    icon: (
      <>
        <rect x="6" y="14" width="24" height="18" rx="4" />
        <path d="M12 14v-4a6 6 0 0 1 12 0v4" />
      </>
    ),
  },
  {
    title: 'The board is live',
    body: 'A check-in on one phone reaches every other phone in the house without a refresh.',
    icon: (
      <>
        <circle cx="12" cy="13" r="5" />
        <circle cx="25" cy="13" r="5" />
        <path d="M4 32c0-5 4-8 8-8s8 3 8 8M17 32c0-5 4-8 8-8s8 3 8 8" />
      </>
    ),
  },
  {
    title: 'Sources you can open',
    body: 'Every action names the public-health page it came from and links straight to it.',
    icon: (
      <>
        <path d="M8 6h14l8 8v20H8z" />
        <path d="M22 6v8h8M14 22h12M14 28h8" />
      </>
    ),
  },
];

const STEPS = [
  { n: 1, title: 'Start or join', body: 'On your own or with the house. One person is a household of one.' },
  { n: 2, title: 'Pick what runs in your family', body: 'From a curated catalog, in plain language. Nobody else sees your list.' },
  { n: 3, title: 'Do one action today', body: 'One to eat, one to move, one to keep. Tap the one you did.' },
];

export default function Landing({
  go,
  authed,
  hasHousehold,
}: {
  go: (to: Route) => void;
  authed: boolean;
  hasHousehold: boolean;
}) {
  const { signOut } = useAuthActions();

  return (
    <>
      <header className="landHeader">
        <button className="home" onClick={() => go('/')} aria-label="Preventah, go home">
          <Mark size={40} />
          <span className="wordmark">Preventah</span>
        </button>

        <nav className="landNav" aria-label="Site">
          <a className="link" href="#how">
            How it works
          </a>
          {authed ? (
            <>
              <button className="link" onClick={() => go('/profile')}>
                Profile
              </button>
              <button className="btn" onClick={() => void signOut().finally(() => go('/'))}>
                Sign out
              </button>
            </>
          ) : (
            <button className="link" onClick={() => go('/signin')}>
              Sign in
            </button>
          )}
          <button className="btn primary" onClick={() => go(hasHousehold ? '/app' : '/start')}>
            {hasHousehold ? 'Open app' : 'Start'}
          </button>
        </nav>
      </header>

      <section className="heroSplit">
        <div className="heroCopy">
          <p className="eyebrow">Household prevention</p>
          <h1>Three things today. The whole household sees you did them.</h1>
          <p className="lede">
            {PURPOSE} Pick the conditions that run in your family, and Preventah turns them into
            one thing to eat, one to move and one to keep, each carrying the public-health source
            it came from.
          </p>

          <div className="btnRow heroCtas">
            <button className="btn primary" onClick={() => go(hasHousehold ? '/app' : '/start')}>
              {hasHousehold ? 'Open app' : 'Start'}
            </button>
            <button className="btn" onClick={() => go('/signin')}>
              Sign in
            </button>
          </div>

          <p className="heroLinks">
            <button className="link" onClick={() => go('/start')}>
              Join with a code
            </button>
          </p>
        </div>

        <div className="heroArt">
          <Character />
        </div>
      </section>

      <section className="how" id="how">
        <h2 className="sectionTitle">How it works</h2>
        <div className="howGrid">
          {STEPS.map((step) => (
            <div className="window" key={step.n}>
              <p className="stepNum">{step.n}</p>
              <h3>{step.title}</h3>
              <p className="muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="band">
        <h2 className="sectionTitle bandTitle">What it is careful about</h2>
        <div className="bandGrid">
          {BAND.map((card) => (
            <div className="bandCard" key={card.title}>
              <svg
                className="bandIcon"
                viewBox="0 0 38 38"
                aria-hidden="true"
                fill="none"
                stroke="#141414"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {card.icon}
              </svg>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
