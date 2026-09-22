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
 * Only presence is reported for the keys. No key value is returned,
 * ever. The one value that does come back is the origin of SITE_URL,
 * which is the public address of this site and is already printed in
 * every canonical link on it; the path, query and everything else are
 * dropped, and nothing else about the environment is exposed.
 *
 * It is here because a session cookie set for one origin does not come
 * back on another, and from the outside that is indistinguishable from
 * a sign-in that worked and then did not count. The client compares and
 * says so.
 */
export const status = query({
  args: {},
  returns: v.object({
    ready: v.boolean(),
    googleReady: v.boolean(),
    siteOrigin: v.union(v.string(), v.null()),
  }),
  handler: async () => {
    const ready = Boolean(process.env.JWT_PRIVATE_KEY && process.env.JWKS);
    return {
      ready,
      googleReady:
        ready && Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
      siteOrigin: originOf(process.env.SITE_URL),
    };
  },
});

/** The origin of a URL, or null if it is unset or unparseable. */
function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
