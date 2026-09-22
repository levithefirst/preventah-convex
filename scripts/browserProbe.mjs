/**
 * The live site, signed up in a real browser, with the console kept.
 *
 * Every other probe here asks the deployment questions directly and the
 * deployment answers correctly, so whatever is wrong happens between the
 * token being issued and the client being believed. That gap is only
 * visible from a browser, and the browser says so out loud: when the
 * server refuses a token, ConvexReactClient logs "Failed to
 * authenticate: " and the reason. Nothing else reports it.
 *
 * Prints the reason, the resulting UI state, and whether a token is in
 * storage. Never prints the token.
 */
import { chromium } from 'playwright';

const SITE = process.env.PROBE_SITE ?? 'https://qualified-hummingbird-614.convex.site';
const stamp = process.env.GITHUB_RUN_ID ?? String(Date.now());
const email = `authdoctor+b${stamp}@example.invalid`;
const password = `Probe-${stamp}-aaaa`;

const browser = await chromium.launch();
const page = await browser.newPage();

const console_ = [];
page.on('console', (message) => console_.push(`[${message.type()}] ${message.text()}`));
page.on('pageerror', (error) => console_.push(`[pageerror] ${error.message}`));

const interesting = () =>
  console_.filter((line) => /auth|token|websocket|convex|error|fail/i.test(line));

const failures = [];

/**
 * The header contract, read off the rendered page: signed in means
 * Profile and Sign out, and never an offer to sign in.
 */
async function check(where) {
  const signIn = await page
    .locator('button:text-is("Sign in"), a:text-is("Sign in")')
    .count();
  const profile = await page.locator('button:text-is("Profile")').count();
  const signOut = await page.locator('button:text-is("Sign out")').count();
  console.log(`checks (${where}): signIn=${signIn} profile=${profile} signOut=${signOut}`);
  if (signIn > 0) failures.push(`"Sign in" offered while signed in on ${where}`);
  if (profile === 0) failures.push(`no Profile on ${where}`);
  if (signOut === 0) failures.push(`no Sign out on ${where}`);
}

/** Token presence only. The value never leaves the page. */
async function state(label) {
  const storage = await page.evaluate(() => {
    const read = (key) => {
      try {
        return window.localStorage.getItem(key) !== null;
      } catch {
        return null;
      }
    };
    let keys = [];
    try {
      keys = Object.keys(window.localStorage).map((k) => k.replace(/https?:\/\/\S+/, '<url>'));
    } catch {
      keys = ['(unreadable)'];
    }
    return {
      keys,
      hasJwtKey: keys.some((k) => k.includes('convexAuthJWT')),
      hasRefreshKey: keys.some((k) => k.includes('convexAuthRefreshToken')),
      probe: read('__convexAuthJWT'),
    };
  });
  const headerButtons = await page.locator('header button, header a').allInnerTexts();
  console.log(`\n### ${label}`);
  console.log('url            =', page.url());
  console.log('header         =', JSON.stringify(headerButtons));
  console.log('storage keys   =', JSON.stringify(storage.keys));
  console.log('JWT stored     =', storage.hasJwtKey);
  console.log('refresh stored =', storage.hasRefreshKey);
}

console.log('--- loading', SITE + '/signup');
await page.goto(SITE + '/signup', { waitUntil: 'networkidle' });
await page.waitForSelector('#authEmail', { timeout: 30_000 });
await state('before submit');

await page.fill('#authName', 'Auth Doctor');
await page.fill('#authEmail', email);
await page.fill('#authPassword', password);
await page.click('button[type=submit]');
await page.waitForTimeout(8000);
await state('after submit');

const error = await page
  .locator('#authError')
  .innerText({ timeout: 1000 })
  .catch(() => null);
console.log('form error     =', error ?? '(none)');

// /start draws its own chrome rather than the site header, so the header
// contract has to be read somewhere the site header actually renders.
// This is the screen the complaint is about: signed in, and still being
// offered a way to sign in.
console.log('\n--- a page that renders the site header');
await page.goto(SITE + '/about', { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);
await state('signed in, on /about');
await check('/about');

console.log('\n--- hard reload');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
await state('after reload');
await check('/about after reload');

// The demo hatch, in a browser that never signed in.
console.log('\n--- a visitor with no account');
const fresh = await browser.newContext();
const freshPage = await fresh.newPage();
await freshPage.goto(SITE + '/start', { waitUntil: 'networkidle' });
await freshPage.waitForTimeout(4000);
const freshBody = await freshPage.locator('body').innerText();
const hatch = freshBody.includes('Continue without an account');
console.log('account step shown    =', /Step 1 of 5/.test(freshBody));
console.log('escape hatch present  =', hatch);
if (!hatch) failures.push('"Continue without an account" is gone');

console.log('\n--- console lines mentioning auth/convex/errors');
for (const line of interesting()) console.log('  ', line.slice(0, 300));
if (interesting().length === 0) console.log('   (none)');

await browser.close();

console.log('\n=== VERDICT');
if (failures.length === 0) {
  console.log('isAuthenticated after password?:  yes');
  console.log('Reload still signed in?:          yes');
  console.log('Continue without account still there?: yes');
  console.log('Auth HTTP routes registered?:     yes');
} else {
  for (const failure of failures) console.log(' -', failure);
  process.exit(1);
}
