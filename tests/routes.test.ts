import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { httpRouter } from 'convex/server';

import { SITE_ASSETS, INDEX_PATH } from '../convex/siteAssets.ts';

/**
 * The site's route table.
 *
 * A `pathPrefix: '/'` catch-all passes the client-side validation in
 * convex/server but left the deployment answering "No content found" at
 * the root, which is the edge's message and not the router's own 404, so
 * the request never reached the module. These tests pin the routing that
 * replaced it.
 */

/**
 * Only the executable lines. The file's own comment explains why
 * `pathPrefix: '/'` is wrong, so scanning the whole source would match
 * the warning and fail on the fix.
 */
const HTTP_ROUTES = readFileSync(new URL('../convex/http.ts', import.meta.url), 'utf8')
  .split('\n')
  .filter((line) => line.trimStart().startsWith('http.route('))
  .join('\n');

/** The client routes convex/http.ts serves the shell for. */
const PAGE_ROUTES = [
  '/today', '/conditions', '/board', '/mail', '/profile',
  '/about', '/faq', '/privacy', '/terms', '/contact', '/signin', '/signup', '/app', '/start', '/404',
];

/** Mirrors the registration in convex/http.ts, against the real router. */
function buildRouter() {
  const http = httpRouter();
  const handler = { isHttp: true, isRegistered: true } as never;
  http.route({ path: '/', method: 'GET', handler });
  for (const path of PAGE_ROUTES) {
    http.route({ path, method: 'GET', handler });
  }
  http.route({ pathPrefix: '/assets/', method: 'GET', handler });
  for (const path of Object.keys(SITE_ASSETS)) {
    if (path === '/' || path.startsWith('/assets/')) continue;
    http.route({ path, method: 'GET', handler });
  }
  return http;
}

test('every asset key is absolute, and the index is among them', () => {
  const keys = Object.keys(SITE_ASSETS);
  assert.ok(keys.length > 0, 'no assets embedded: run npm run build');
  for (const key of keys) {
    assert.ok(key.startsWith('/'), `asset key ${key} is not absolute`);
  }
  assert.ok(INDEX_PATH.startsWith('/'), 'INDEX_PATH is not absolute');
  assert.ok(INDEX_PATH in SITE_ASSETS, `${INDEX_PATH} is not an embedded asset`);
  assert.ok(
    keys.some((key) => key.startsWith('/assets/')),
    'no /assets/ entries embedded',
  );
});

test('GET / resolves, which is the bug that shipped', () => {
  const match = buildRouter().lookup('/', 'GET');
  assert.notEqual(match, null, 'GET / is not routed');
  assert.equal(match![2], '/', 'GET / did not match the exact route');
});

test('the index and every fingerprinted asset resolve', () => {
  const http = buildRouter();
  assert.notEqual(http.lookup(INDEX_PATH, 'GET'), null, `${INDEX_PATH} is not routed`);
  for (const key of Object.keys(SITE_ASSETS)) {
    assert.notEqual(http.lookup(key, 'GET'), null, `${key} is not routed`);
  }
});

test('every client route is served, so a reload does not 404', () => {
  const http = buildRouter();
  for (const path of PAGE_ROUTES) {
    const match = http.lookup(path, 'GET');
    assert.notEqual(match, null, `${path} is not routed`);
    assert.equal(match![2], path, `${path} did not match an exact route`);
  }
});

test('http.ts and the client agree on the route list', () => {
  const http = readFileSync(new URL('../convex/http.ts', import.meta.url), 'utf8');
  const site = readFileSync(new URL('../src/site.ts', import.meta.url), 'utf8');
  for (const path of PAGE_ROUTES) {
    assert.ok(http.includes(`'${path}'`), `convex/http.ts does not register ${path}`);
    if (path !== '/404') {
      assert.ok(site.includes(`'${path}'`), `src/site.ts does not know ${path}`);
    }
  }
});

test('the public files a crawler asks for are embedded and routed', () => {
  const http = buildRouter();
  for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/manifest.webmanifest',
                      '/og.png', '/favicon-32.png', '/icon-192.png', '/icon-512.png',
                      '/apple-touch-icon.png']) {
    assert.ok(path in SITE_ASSETS, `${path} is not embedded: run npm run build`);
    assert.notEqual(http.lookup(path, 'GET'), null, `${path} is not routed`);
  }
});

test('an unrouted path stays unrouted rather than silently serving HTML', () => {
  const http = buildRouter();
  assert.equal(http.lookup('/does-not-exist', 'GET'), null);
  assert.equal(http.lookup('/', 'POST'), null);
});

test('http.ts registers the root exactly and never prefixes on /', () => {
  assert.ok(
    /http\.route\(\{\s*path:\s*'\/'\s*,\s*method:\s*'GET'/.test(HTTP_ROUTES),
    "http.ts does not register path: '/' exactly",
  );
  assert.ok(
    !/pathPrefix:\s*['"]\/['"]/.test(HTTP_ROUTES),
    "http.ts still uses pathPrefix: '/', which is what broke the root",
  );
  assert.ok(
    /pathPrefix:\s*'\/assets\/'/.test(HTTP_ROUTES),
    "http.ts does not register the /assets/ prefix",
  );
});
