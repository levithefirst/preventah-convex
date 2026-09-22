/**
 * Does a session this deployment issues survive its own validation?
 *
 * Read-only against config, but not against data: proving the end of the
 * chain needs a real token, and the only way to be issued one is to sign
 * up. It therefore creates one throwaway account per run, under an
 * @example.invalid address that can never receive mail, and signs in as
 * nobody. That is the cost of an answer; nothing else here writes.
 *
 * The token itself is never printed. What is printed is its issuer, its
 * audience, its algorithm, and whether it verifies against the JWKS the
 * deployment publishes, which is exactly the check the websocket
 * handshake performs before deciding `isAuthenticated`.
 */
import { createLocalJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from 'jose';

const SITE = 'https://qualified-hummingbird-614.convex.site';
const CLOUD = 'https://qualified-hummingbird-614.convex.cloud';

const stamp = process.env.GITHUB_RUN_ID ?? String(Date.now());
const email = `authdoctor+${stamp}@example.invalid`;
const password = `Probe-${stamp}-aaaa`;

async function callAction(path, args) {
  const response = await fetch(`${CLOUD}/api/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args, format: 'json' }),
  });
  const body = await response.json();
  return { httpStatus: response.status, body };
}

console.log('--- authHealth:report');
const health = await callAction('authHealth:report', {});
console.log('http status =', health.httpStatus);
console.log(JSON.stringify(health.body, null, 1));

console.log('\n--- auth:signIn (password, signUp, throwaway account)');
const signIn = await callAction('auth:signIn', {
  provider: 'password',
  params: { email, password, name: 'Auth Doctor', flow: 'signUp' },
});
console.log('http status =', signIn.httpStatus);
console.log('convex status =', signIn.body?.status);

if (signIn.body?.status !== 'success') {
  // An error message from the auth module describes the refusal, not any
  // credential: the throwaway password above is the only one in play.
  console.log('errorMessage =', signIn.body?.errorMessage);
  process.exit(0);
}

const value = signIn.body.value ?? {};
const tokens = value.tokens ?? null;
console.log('redirect returned =', value.redirect !== undefined);
console.log('tokens returned   =', tokens !== null);
if (!tokens) {
  console.log('VERDICT: auth:signIn succeeded but issued no tokens.');
  process.exit(0);
}
console.log('refreshToken present =', Boolean(tokens.refreshToken));

const header = decodeProtectedHeader(tokens.token);
const claims = decodeJwt(tokens.token);
console.log('token alg =', header.alg, ' kid =', header.kid ?? '(none)');
console.log('token iss =', claims.iss);
console.log('token aud =', claims.aud);

const jwks = await (await fetch(`${SITE}/.well-known/jwks.json`)).json();
try {
  await jwtVerify(tokens.token, createLocalJWKSet(jwks), {
    issuer: claims.iss,
    audience: 'convex',
  });
  console.log('VERDICT: the published JWKS verifies this token. Signing keys are a pair.');
} catch (error) {
  console.log('VERDICT: the published JWKS does NOT verify this token.');
  console.log('reason =', error instanceof Error ? error.message : String(error));
}
