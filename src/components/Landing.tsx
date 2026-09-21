import type { Route } from '../site';
import Character from './Character';

/**
 * The marketing home.
 *
 * One idea, said once: this helps a household act on the illnesses that
 * already run in it. Everything that was explaining the product by
 * counting to three has gone, along with the numbered plates and the
 * black band, because a page that lists its own features three ways is
 * a page that does not trust the first way.
 */
export default function Landing({
  go,
  hasHousehold,
}: {
  go: (to: Route) => void;
  hasHousehold: boolean;
}) {
  const primaryLabel = hasHousehold ? 'Open app' : 'Start';
  const primaryTo: Route = hasHousehold ? '/app' : '/start';

  return (
    <>
      <section className="heroSplit">
        <div className="heroCopy">
          <h1>Prevent the diseases that run in your family.</h1>
          <p className="lede">
            Pick what runs in yours. Do one thing today. Your household sees it.
          </p>

          <div className="btnRow heroCtas">
            <button className="btn primary" onClick={() => go(primaryTo)}>
              {primaryLabel}
            </button>
            {hasHousehold ? (
              <button className="btn" onClick={() => go('/start')}>
                Start a new household
              </button>
            ) : (
              <button className="btn" onClick={() => go('/about')}>
                What this is
              </button>
            )}
          </div>

          <p className="heroLinks">
            <button className="link" onClick={() => go('/start')}>
              Join with a code
            </button>
          </p>

          <p className="howLine" id="how">
            Create or join a household. Choose conditions. Check in.
          </p>
        </div>

        <div className="heroArt">
          <Character />
        </div>
      </section>
    </>
  );
}
