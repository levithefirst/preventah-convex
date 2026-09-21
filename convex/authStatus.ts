import { query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Whether accounts are usable yet.
 *
 * @convex-dev/auth signs sessions with a keypair that lives on the
 * deployment, not in the repository, and it throws at sign-in time when
 * that pair is missing. Rather than let someone press a button that
 * cannot work, the client asks this first and hides the sign-in surface
 * until the keys are in place.
 *
 * Only presence is reported. No value is returned, ever.
 */
export const status = query({
  args: {},
  returns: v.object({
    ready: v.boolean(),
    googleReady: v.boolean(),
  }),
  handler: async () => {
    const ready = Boolean(process.env.JWT_PRIVATE_KEY && process.env.JWKS);
    return {
      ready,
      googleReady:
        ready && Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    };
  },
});
