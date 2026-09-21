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

  // The catalog below never repeats what is already on the rail, so a
  // selection appears in exactly one place on the screen.
  const unpicked = catalog?.results.filter((entry) => !selected.has(entry.id)) ?? [];

  // Source links for the selected set, taken from the member's own
  // conditions rather than from the search results, so typing in the
  // search box cannot shrink the list. Nothing is fetched or invented.
  const help = me.conditions.filter((condition) => condition.sourceUrl !== '');

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

        <p className="tiny">Up to {me.maxSelections}. Remove one to add another.</p>
      </div>

      <div className="window">
        <p className="bar mint">On your list</p>
        {me.conditions.length === 0 ? (
          <p className="empty">None yet. Add from the catalog below.</p>
        ) : (
          <ul className="rail">
            {me.conditions.map((condition) => (
              <li key={condition.id}>
                <span className="railName">{condition.name}</span>
                <button
                  className="btn railRemove"
                  onClick={() => toggle(condition.id)}
                  aria-label={`Remove ${condition.name}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {help.length > 0 && (
        <div className="window">
          <p className="bar cream">Get help</p>
          <p className="muted">
            Where to read further on what you track, from the same public-health sources the
            daily actions cite. Preventah publishes no helpline of its own and no clinic
            directory: anything a source says about when to seek care is on the source's own
            page, which is where it stays accurate.
          </p>
          <ul className="helpList">
            {help.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.name}</strong>
                <a href={entry.sourceUrl} target="_blank" rel="noreferrer">
                  {entry.sourceName}
                </a>
              </li>
            ))}
          </ul>
          <p className="tiny">
            General lifestyle guidance, not medical advice. If something is wrong now, contact a
            clinician or your local emergency number rather than this app.
          </p>
        </div>
      )}

      <div className="window">
        <p className="bar cream">Catalog</p>
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
      ) : unpicked.length === 0 ? (
        <p className="window empty">
          {catalog.results.length === 0
            ? 'Nothing matches that. Try a shorter word.'
            : 'Everything matching is already on your list.'}
        </p>
      ) : (
        unpicked.map((entry) => {
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
