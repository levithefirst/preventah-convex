import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Firecrawl source cards for one of the member's conditions.
 *
 * The cards render from a live query over the cache, so they appear the
 * moment the action finishes writing them. Fetching is restricted to
 * public-health domains server-side; a prevention app should not cite a
 * forum thread.
 */
export default function Sources({
  conditions,
}: {
  conditions: { id: string; name: string }[];
}) {
  const [conditionId, setConditionId] = useState(conditions[0]?.id ?? '');
  const cards = useQuery(api.sources.forCondition, conditionId ? { conditionId } : 'skip');
  const refresh = useAction(api.sources.refresh);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (conditions.length === 0) return null;

  return (
    <section className="window sources">
      <p className="bar cream">Read more</p>
      <h2>Current sources for what you track</h2>
      <div className="chips">
        {conditions.map((condition) => (
          <button
            key={condition.id}
            className="chip"
            aria-pressed={conditionId === condition.id}
            onClick={() => setConditionId(condition.id)}
          >
            {condition.name}
          </button>
        ))}
      </div>

      <button
        className="link"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          setStatus(null);
          void refresh({ conditionId, force: true })
            .then((result) => setStatus(result.detail))
            .finally(() => setBusy(false));
        }}
      >
        {busy ? 'Searching...' : 'Find current sources (Firecrawl)'}
      </button>

      {status && <p className="muted">{status}</p>}

      {/* Title, one clean sentence when there is one, and the link.
          The server strips markdown and page furniture; anything that
          did not survive that simply shows as title and link. */}
      <div className="sourceCards">
        {cards?.map((card) => (
          <article className="sourceCard" key={card.url}>
            <h3>{card.title}</h3>
            {card.snippet && <p className="muted">{card.snippet}</p>}
            <a href={card.url} target="_blank" rel="noreferrer">
              Open the source
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
