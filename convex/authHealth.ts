import { v } from 'convex/values';
import { SignJWT, createLocalJWKSet, importPKCS8, jwtVerify } from 'jose';
import { action } from './_generated/server';

/**
 * Why a session that was issued is not accepted.
 *
 * The websocket handshake is where `isAuthenticated` is decided: the
 * client sends the JWT it was given and the deployment either validates
 * it or silently declines. Declining looks, from the browser, exactly
 * like never having signed in, and nothing in the UI can tell the
 * difference. This reproduces that validation here, where the answer can
 * be reported.
 *
 * It is read-only. It sets nothing, rotates nothing, and
 * returns booleans plus three values that are public by construction:
 * CONVEX_SITE_URL and SITE_URL are the deployment's own addresses, and
 * they are already printed in every canonical link the site serves. No
 * key material is returned, and none is logged. The failure string is
 * jose's own description of what went wrong ("signature verification
 * failed" and the like), which describes the mismatch without quoting
 * either side of it.
 *
 * It is public because CONVEX_DEPLOY_KEY is a deploy key and cannot run
 * internal functions (`deployment:functions:runInternalActions` is not
 * granted), so the only way to reach it is the unauthenticated HTTP API
 * every public function already answers on. What it discloses is whether
 * this deployment is configured, which anyone learns by pressing the
 * sign-in button once. Delete it once sign-in is fixed.
 */

/** What SITE_URL has to be for cookies and redirects to come back here. */
const EXPECTED_SITE_URL = 'https://qualified-hummingbird-614.convex.site';

export const report = action({
  args: {},
  returns: v.object({
    jwtPrivateKeySet: v.boolean(),
    jwksSet: v.boolean(),
    privateKeyImports: v.boolean(),
    jwksParses: v.boolean(),
    /** The decisive one: does a token this deployment signs verify here. */
    tokensVerifyAgainstJwks: v.boolean(),
    failure: v.union(v.string(), v.null()),
    convexSiteUrl: v.union(v.string(), v.null()),
    siteUrl: v.union(v.string(), v.null()),
    siteUrlMatchesExpected: v.boolean(),
    googleConfigured: v.boolean(),
  }),
  handler: async () => {
    const privateKeyPem = process.env.JWT_PRIVATE_KEY;
    const jwksJson = process.env.JWKS;
    const convexSiteUrl = process.env.CONVEX_SITE_URL ?? null;
    const siteUrl = process.env.SITE_URL ?? null;

    let privateKeyImports = false;
    let jwksParses = false;
    let tokensVerifyAgainstJwks = false;
    let failure: string | null = null;

    try {
      if (!privateKeyPem) throw new Error('JWT_PRIVATE_KEY is not set');
      if (!jwksJson) throw new Error('JWKS is not set');
      if (!convexSiteUrl) throw new Error('CONVEX_SITE_URL is not set');

      const signingKey = await importPKCS8(privateKeyPem, 'RS256');
      privateKeyImports = true;

      const keySet = createLocalJWKSet(JSON.parse(jwksJson) as Parameters<
        typeof createLocalJWKSet
      >[0]);
      jwksParses = true;

      // The same shape convex/auth issues: RS256, issuer CONVEX_SITE_URL,
      // audience "convex". If this does not verify, neither does a real
      // session token, and that is the whole bug.
      const probe = await new SignJWT({ sub: 'authHealth|probe' })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setIssuer(convexSiteUrl)
        .setAudience('convex')
        .setExpirationTime(new Date(Date.now() + 60_000))
        .sign(signingKey);

      await jwtVerify(probe, keySet, { issuer: convexSiteUrl, audience: 'convex' });
      tokensVerifyAgainstJwks = true;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }

    return {
      jwtPrivateKeySet: Boolean(privateKeyPem),
      jwksSet: Boolean(jwksJson),
      privateKeyImports,
      jwksParses,
      tokensVerifyAgainstJwks,
      failure,
      convexSiteUrl,
      siteUrl,
      siteUrlMatchesExpected: siteUrl === EXPECTED_SITE_URL,
      googleConfigured: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    };
  },
});
