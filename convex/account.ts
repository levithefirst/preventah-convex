import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';

/**
 * The bridge between an account and the member row it owns.
 *
 * Before accounts existed, a member id in localStorage was the identity.
 * It still works for anyone who never signs in, but the moment someone
 * does, the account becomes the identity and the browser's copy is only
 * a hint about which member to claim.
 */

/** Name and email for the profile screen. Read from the auth user row. */
export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      name: v.union(v.string(), v.null()),
      email: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { name: user.name ?? null, email: user.email ?? null };
  },
});

/** The member this account owns, if it has claimed one. */
export const myMember = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({ memberId: v.id('members'), householdId: v.id('households') }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const member = await ctx.db
      .query('members')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    return member ? { memberId: member._id, householdId: member.householdId } : null;
  },
});

/**
 * Claims a member row left behind by the pre-account flow.
 *
 * Runs at most once per account and only on a member nobody owns, so a
 * shared or guessed id cannot be used to take over someone else's row.
 * Idempotent: calling it again with anything once the account already
 * has a member is a no-op.
 */
export const attachLocalMember = mutation({
  args: { memberId: v.id('members') },
  returns: v.object({ ok: v.boolean(), detail: v.string() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false, detail: 'Not signed in.' };

    const already = await ctx.db
      .query('members')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique();
    if (already) {
      return { ok: true, detail: 'This account already has a member.' };
    }

    const member = await ctx.db.get(args.memberId);
    if (!member) return { ok: false, detail: 'That member no longer exists.' };
    if (member.userId) {
      return { ok: false, detail: 'That member already belongs to another account.' };
    }

    await ctx.db.patch(args.memberId, { userId });

    // Give the account a display name if it arrived without one, using
    // the name the member already chose rather than asking again.
    const user = await ctx.db.get(userId);
    if (user && !user.name && member.name) {
      await ctx.db.patch(userId, { name: member.name });
    }

    return { ok: true, detail: 'Attached.' };
  },
});
