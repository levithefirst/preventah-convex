import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Me } from '../types';

/**
 * The condition picker.
 *
 * Search runs against the curated catalog on the server, so there is no
 * free-text path into anyone's health record: every selection is an id
 * the catalog already knows. Nothing here is colour-coded by severity.
 * A condition is not a warning.
 */
export default function ConditionPicker({ me }: { me: Me }) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const catalog = useQuery(api.catalog.search, { q, category, limit: 60 });
  const setConditions = useMutation(api.members.setConditions);

  const selected = new Set(me.conditions.map((condition) => condition.id));
  const atCap = selected.size >= me.maxSelections;

  function toggle(id: string) {
    const next = selected.has(id)
      ? [...selected].filter((value) => value !== id)
      : [...selected, id];
    void setConditions({ memberId: me.memberId, conditionIds: next });
  }

  return (
    <section className="stack">
      <div className="window plated">
        <p className="bar cream">Your family</p>

        <p className="muted">
          {selected.size} of {me.maxSelections} selected
          {catalog ? ` from ${catalog.total} conditions` : ''}. Your picks tune today's three
          actions. Nobody else in the household can see which ones.
        </p>

        <label className="field" htmlFor="conditionSearch">
          <span>Search conditions</span>
          <input
            id="conditionSearch"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Heart, diabetes, bone…"
            autoComplete="off"
          />
        </label>

        <div className="chips">
          <button
            className="chip"
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
          >
            All
          </button>
          {catalog?.categories.map((entry) => (
            <button
              key={entry.category}
              className="chip"
              aria-pressed={category === entry.category}
              onClick={() => setCategory(entry.category)}
            >
              {entry.label} ({entry.count})
            </button>
          ))}
        </div>
      </div>

      {catalog === undefined ? (
        <p className="muted">Loading.</p>
      ) : catalog.results.length === 0 ? (
        <p className="window empty">Nothing matches that. Try a shorter word.</p>
      ) : (
        catalog.results.map((entry) => {
          const isOn = selected.has(entry.id);
          return (
            <article className="window" key={entry.id}>
              <div className="row">
                <div>
                  <h2>{entry.name}</h2>
                  <p className="muted">
                    {entry.categoryLabel} &middot; family history {entry.familyHistoryRelevance}
                  </p>
                </div>
                <button
                  className="btn"
                  aria-pressed={isOn}
                  disabled={!isOn && atCap}
                  onClick={() => toggle(entry.id)}
                  style={isOn ? { background: 'var(--mint)' } : undefined}
                >
                  {isOn ? 'Remove' : atCap ? 'Full' : 'Add'}
                </button>
              </div>
              <p>{entry.description}</p>
              <p className="muted">{entry.riskContext}</p>
              <p className="sourceLine">
                Source:{' '}
                <a href={entry.sourceUrl} target="_blank" rel="noreferrer">
                  {entry.sourceName}
                </a>
              </p>
            </article>
          );
        })
      )}
    </section>
  );
}
