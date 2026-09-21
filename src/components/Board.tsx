import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { CopyButton } from './Brand';

/**
 * The live household board.
 *
 * A plain useQuery subscription: when anyone checks an action off, every
 * other open copy updates without a refresh or a poll. Counts are plain
 * numbers rather than coloured badges, and a quiet day reads as quiet
 * rather than as a failure, which is the only reason a shared scoreboard
 * is safe to put in front of a family at all.
 */
export default function Board({ householdId }: { householdId: Id<'households'> }) {
  const board = useQuery(api.households.board, { householdId });

  if (board === undefined) return <p className="muted">Loading.</p>;
  if (board === null) return <p className="window empty">That household no longer exists.</p>;

  const active = board.members.filter((member) => member.doneToday > 0).length;

  return (
    <section className="stack">
      <div className="window plated">
        <p className="bar mint">Today</p>
        <h2>{board.householdName}</h2>
        <p className="muted">
          {board.dayKey} &middot; {board.totalDoneToday} check-in
          {board.totalDoneToday === 1 ? '' : 's'} from {active} of {board.members.length}{' '}
          {board.members.length === 1 ? 'person' : 'people'}
        </p>

        <div className="codeRow" style={{ marginTop: 12 }}>
          <span className="code" style={{ fontSize: 26, letterSpacing: '0.1em' }}>
            {board.joinCode}
          </span>
          <CopyButton value={board.joinCode} label="Copy join code" />
        </div>
        <p className="tiny">
          Anyone with the code can join. Members see that you checked in and how many conditions
          you track, never which ones.
        </p>
      </div>

      {board.totalDoneToday === 0 && (
        <p className="window empty">Waiting for someone to check in.</p>
      )}

      {board.members.map((member) => (
        <div className="window" key={member.memberId}>
          <div className="row">
            <div>
              <h2>{member.name}</h2>
              <p className="muted">
                {member.consented
                  ? `${member.conditionCount} condition${member.conditionCount === 1 ? '' : 's'} tracked`
                  : 'Has not consented yet'}
              </p>
            </div>
            <p className="score">
              <span className="big">{member.doneToday}/3</span>
              <span className="muted">
                {member.streak} day{member.streak === 1 ? '' : 's'} running
              </span>
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
