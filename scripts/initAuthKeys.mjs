/**
 * Sets the keys @convex-dev/auth signs sessions with.
 *
 * Run by .github/workflows/init-auth.yml, because the build environment
 * this project is developed in cannot reach convex.dev. It replicates
 * the library's own generateKeys: an RS256 pair, the private key
 * exported as PKCS8 with its newlines flattened to spaces, and the
 * public key as a JWKS with `use: "sig"`.
 *
 * Two rules it exists to enforce:
 *  - No key material is ever printed. Values go to the Convex CLI over
 *    stdin, never as an argv element and never through a shell, and any
 *    error output is redacted before it reaches the log.
 *  - Nothing is overwritten unless asked. Re-running without --force
 *    leaves existing keys alone, because rotating them silently would
 *    sign every live session out.
 */
import { spawn } from 'node:child_process';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

const SITE_URL = 'https://qualified-hummingbird-614.convex.site';
const force = process.argv.includes('--force');

/** Runs the Convex CLI, feeding `value` over stdin so it never appears in argv. */
function setEnv(name, value, { secret }) {
  return new Promise((resolve, reject) => {
    const args = ['convex', 'env', 'set', name];
    if (force) args.push('--force');

    const child = spawn('npx', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let out = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (out += chunk));

    child.on('error', reject);
    child.on('close', (code) => {
      // The CLI echoes the value back on success, so its output is never
      // forwarded verbatim for a secret.
      const safe = secret ? out.split(value).join('[redacted]') : out;
      if (code === 0) return resolve();
      reject(new Error(`convex env set ${name} exited ${code}\n${safe.trim()}`));
    });

    child.stdin.write(value);
    child.stdin.end();
  });
}

async function generateKeys() {
  // extractable is required from jose 6 on; on jose 5 it was the default.
  // Passing it explicitly works on both and changes nothing about the output.
  const keys = await generateKeyPair('RS256', { extractable: true });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  return {
    JWT_PRIVATE_KEY: privateKey.trimEnd().replace(/\n/g, ' '),
    JWKS: JSON.stringify({ keys: [{ use: 'sig', ...publicKey }] }),
  };
}

const { JWT_PRIVATE_KEY, JWKS } = await generateKeys();

await setEnv('JWT_PRIVATE_KEY', JWT_PRIVATE_KEY, { secret: true });
await setEnv('JWKS', JWKS, { secret: true });
await setEnv('SITE_URL', SITE_URL, { secret: false });

console.log('JWT_PRIVATE_KEY and JWKS set');
console.log(`SITE_URL set to ${SITE_URL}`);
