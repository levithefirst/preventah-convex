import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import Google from '@auth/core/providers/google';

/**
 * Accounts.
 *
 * Password is always available. Google is added only when both halves of
 * its credential are present on the deployment, because a provider
 * configured with half a credential fails at the redirect rather than at
 * startup, which is the worst place to find out.
 *
 * Sessions are signed with JWT_PRIVATE_KEY, which this file does not
 * read: the library does, at token time. Until
 * .github/workflows/init-auth.yml has been run, signing in throws and
 * convex/authStatus.ts reports the app as not ready, so the UI hides the
 * sign-in surface rather than offering a button that cannot work.
 */

const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, ...(googleConfigured ? [Google] : [])],
});
