import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { getDailyPlan } from '../convex/lib/plans.ts';
import { withTiers, type TieredAction } from '../convex/lib/tiers.ts';
import { sanitizeConditionIds } from '../convex/lib/conditions.ts';
import { applyRewrite, buildPayload, validateRewrite } from '../convex/lib/rewrite.ts';
import { callOpenAI, MODELS, MAX_OUTPUT_TOKENS, isModelRejection } from '../convex/lib/openai.ts';

/**
 * The rewrite layer. Two things are being protected: the reader, who must
 * never be shown an invented drug or a diagnosis, and the account, which
 * has a fixed budget and must never be charged twice for one day.
 */

function catalogPlan(): TieredAction[] {
  const plan = getDailyPlan(['hypertension', 'type2_diabetes'], 3);
  return [plan.diet, plan.exercise, plan.habit].map(withTiers);
}

/** A faithful response: same ids, plain wording, no prices. */
function goodResponse(catalog: TieredAction[]) {
  return {
    actions: catalog.map((action) => ({
      id: action.id,
      title: 'Do the thing today.',
      oneLiner: 'A short, plain line about doing the thing.',
    })),
  };
}

// ---------------------------------------------------------------- shape

test('a faithful rewrite validates', () => {
  const catalog = catalogPlan();
  const result = validateRewrite(goodResponse(catalog), catalog);
  assert.equal(result.ok, true, JSON.stringify(result.violations));
  assert.equal(result.actions.length, 3);
});

test('malformed responses are rejected, never thrown on', () => {
  const catalog = catalogPlan();
  for (const bad of [null, undefined, 'a string', 42, {}, { actions: 'nope' }, { actions: [] }]) {
    const result = validateRewrite(bad, catalog);
    assert.equal(result.ok, false, `accepted ${JSON.stringify(bad)}`);
  }
});

test('an unknown or duplicated action id is rejected', () => {
  const catalog = catalogPlan();

  const renamed = goodResponse(catalog);
  renamed.actions[0].id = 'something_invented';
  assert.equal(validateRewrite(renamed, catalog).ok, false);

  const duped = goodResponse(catalog);
  duped.actions[1].id = duped.actions[0].id;
  assert.equal(validateRewrite(duped, catalog).ok, false);
});

test('the model is never asked for a price, and a stray one is ignored', () => {
  const catalog = catalogPlan();

  // Nothing about cost leaves the deployment.
  const payload = JSON.stringify(buildPayload(catalog));
  for (const word of ['tier', 'free', 'cheap', 'premium', 'cost', 'costHint']) {
    assert.ok(!payload.toLowerCase().includes(word), `payload mentions ${word}`);
  }

  // An older model reply that still volunteers tiers is accepted on its
  // title and one-liner alone; the extra key is simply not read.
  const withStrayTiers = {
    actions: goodResponse(catalog).actions.map((action) => ({
      ...action,
      tiers: [{ tier: 'free', title: 'Spend nothing.' }],
    })),
  };
  const result = validateRewrite(withStrayTiers, catalog);
  assert.equal(result.ok, true, JSON.stringify(result.violations));
  for (const action of result.actions) {
    assert.ok(!('tiers' in action), 'a tier survived validation');
  }
});

test('applying a rewrite leaves the resolver\u2019s tier data untouched', () => {
  const catalog = catalogPlan();
  const result = validateRewrite(goodResponse(catalog), catalog);
  const applied = applyRewrite(catalog, result.actions);
  for (let i = 0; i < catalog.length; i += 1) {
    assert.deepEqual(applied[i].options, catalog[i].options, 'a rewrite reached the tiers');
  }
});

test('runaway length is rejected', () => {
  const catalog = catalogPlan();
  const long = goodResponse(catalog);
  long.actions[0].title = 'x'.repeat(500);
  assert.equal(validateRewrite(long, catalog).ok, false);
});

// ------------------------------------------------------------- content

test('invented drugs, doses, labs and supplements are rejected', () => {
  const catalog = catalogPlan();
  const inventions = [
    'Take 500 mg of it today.',
    'Ask about starting a statin.',
    'Add a vitamin D supplement.',
    'Book an HbA1c blood test.',
    'Aim for 120/80 today.',
    'Take one tablet with food.',
  ];
  for (const invention of inventions) {
    const bad = goodResponse(catalog);
    bad.actions[0].oneLiner = invention;
    const result = validateRewrite(bad, catalog);
    assert.equal(result.ok, false, `accepted: ${invention}`);
  }
});

test('diagnosis and prediction wording is always rejected', () => {
  const catalog = catalogPlan();
  const claims = [
    'You have high blood pressure.',
    'You will develop diabetes without this.',
    'This treats the condition.',
    'This will cure it.',
  ];
  for (const claim of claims) {
    const bad = goodResponse(catalog);
    bad.actions[0].title = claim;
    assert.equal(validateRewrite(bad, catalog).ok, false, `accepted: ${claim}`);
  }
});

test('a URL the catalog did not supply is rejected', () => {
  const catalog = catalogPlan();
  const bad = goodResponse(catalog);
  bad.actions[0].oneLiner = 'Read more at https://example.com/cure';
  assert.equal(validateRewrite(bad, catalog).ok, false);
});

test('clinical words the catalog itself used are preserved, not punished', () => {
  const catalog = catalogPlan();
  const source = catalog[0];
  // Echo a phrase straight out of the catalog copy for this action.
  const echoed = source.title;
  const response = goodResponse(catalog);
  response.actions[0].title = echoed;
  assert.equal(validateRewrite(response, catalog).ok, true);
});

test('the catalog\u2019s own wording always validates, so the guard cannot fail closed', () => {
  // The banned vocabulary lives in safety notes and benefits, which are
  // never rewritten. If it ever leaks into a title or a first how-to step,
  // every faithful rewrite would be rejected and the layer would be dead
  // weight. This walks the rotation to catch that.
  const selections = [[], ['hypertension'], ['coronary_artery_disease', 'osteoporosis']];
  for (const conditionIds of selections) {
    for (let day = 0; day < 40; day += 1) {
      const plan = getDailyPlan(conditionIds, day);
      const catalog = [plan.diet, plan.exercise, plan.habit].map(withTiers);
      const echo = {
        actions: catalog.map((action) => ({
          id: action.id,
          title: action.title,
          oneLiner: action.howTo[0] ?? action.description,
          tiers: action.options.map((option) => ({ tier: option.tier, title: option.title })),
        })),
      };
      const result = validateRewrite(echo, catalog);
      assert.equal(
        result.ok,
        true,
        `day ${day} rejected its own catalog copy: ${JSON.stringify(result.violations)}`,
      );
    }
  }
});

// --------------------------------------------------------------- apply

test('applying a rewrite moves wording only, never sources or safety', () => {
  const catalog = catalogPlan();
  const result = validateRewrite(goodResponse(catalog), catalog);
  const applied = applyRewrite(catalog, result.actions);

  for (let i = 0; i < catalog.length; i += 1) {
    const before = catalog[i];
    const after = applied[i];
    assert.equal(after.id, before.id);
    assert.equal(after.type, before.type);
    assert.equal(after.sourceUrl, before.sourceUrl, 'source url moved');
    assert.equal(after.sourceName, before.sourceName, 'source name moved');
    assert.equal(after.safetyNote, before.safetyNote, 'safety note moved');
    assert.deepEqual(after.howTo, before.howTo, 'how-to moved');
    assert.equal(after.title, 'Do the thing today.');
    assert.equal(after.options[0].tier, 'free');
  }
});

test('no budget copy survives on any user-facing surface', () => {
  // The three plates were an earlier idea. This is the guard that stops
  // them creeping back into a screen or an email.
  const roots = [new URL('../src', import.meta.url).pathname];
  const banned = /\b(cheap|premium|costHint|three budgets|at three budgets)\b/i;
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|css|html)$/.test(entry)) {
        readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
          if (banned.test(line)) offenders.push(`${full}:${i + 1} ${line.trim()}`);
        });
      }
    }
  };
  roots.forEach(walk);
  assert.deepEqual(offenders, []);
});

test('the morning email offers actions rather than price options', () => {
  const source = readFileSync(new URL('../convex/mail.ts', import.meta.url), 'utf8');
  assert.ok(!/option\.costHint|option\.label|item\.options/.test(source), 'mail still writes tiers');
});

test('the server drops the tier options before the plan reaches a client', () => {
  const source = readFileSync(new URL('../convex/members.ts', import.meta.url), 'utf8');
  assert.match(source, /options: _options/, 'members.today no longer strips options');
  assert.ok(!/v\.array\(tierOption\)/.test(source), 'the today payload still declares tiers');
});

test('the prompt payload never carries the catalog or a condition list', () => {
  const payload = JSON.stringify(buildPayload(catalogPlan()));
  assert.ok(!payload.includes('hypertension'), 'condition id leaked into the payload');
  assert.ok(!payload.includes('riskContext'), 'catalog entry leaked into the payload');
  assert.ok(payload.length < 4000, `payload is ${payload.length} chars`);
});

// ---------------------------------------------------------- money rules

test('only the three cheap models are configured, in order', () => {
  assert.deepEqual([...MODELS], ['gpt-5-nano', 'gpt-4.1-nano', 'gpt-4o-mini']);
  assert.ok(MAX_OUTPUT_TOKENS <= 400, `max output is ${MAX_OUTPUT_TOKENS}`);
  for (const model of MODELS) {
    assert.ok(!/^o\d|latest|gpt-5(?!-nano)|gpt-4o(?!-mini)/.test(model), `${model} is not allowed`);
  }
});

/** Stubs global fetch and counts calls. Restores on return. */
async function withFetch(
  impl: (url: string, init: RequestInit) => Promise<Response>,
  run: () => Promise<unknown>,
): Promise<{ calls: number; bodies: Record<string, unknown>[]; result: unknown }> {
  const original = globalThis.fetch;
  const bodies: Record<string, unknown>[] = [];
  let calls = 0;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls += 1;
    bodies.push(JSON.parse(String(init.body)));
    return impl(url, init);
  }) as typeof fetch;
  try {
    const result = await run();
    return { calls, bodies, result };
  } finally {
    globalThis.fetch = original;
  }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const asOutcome = (value: unknown) => value as { actions: unknown; model: string | null; detail: string };

test('a 429 falls back to catalog without retrying', async () => {
  const catalog = catalogPlan();
  const { calls, result } = await withFetch(
    async () => json(429, { error: { message: 'rate limited' } }),
    () => callOpenAI('test-key', catalog),
  );
  assert.equal(calls, 1, 'retried a billable failure');
  assert.equal(asOutcome(result).actions, null);
});

test('a 401 falls back to catalog without retrying', async () => {
  const catalog = catalogPlan();
  const { calls, result } = await withFetch(
    async () => json(401, { error: { message: 'bad key' } }),
    () => callOpenAI('test-key', catalog),
  );
  assert.equal(calls, 1);
  assert.equal(asOutcome(result).actions, null);
});

test('a timeout falls back to catalog without retrying', async () => {
  const catalog = catalogPlan();
  const { calls, result } = await withFetch(
    async () => {
      throw new Error('The operation was aborted due to timeout');
    },
    () => callOpenAI('test-key', catalog),
  );
  assert.equal(calls, 1);
  assert.equal(asOutcome(result).actions, null);
});

test('non-JSON content falls back to catalog', async () => {
  const catalog = catalogPlan();
  const { result } = await withFetch(
    async () => json(200, { choices: [{ message: { content: 'not json at all' } }] }),
    () => callOpenAI('test-key', catalog),
  );
  assert.equal(asOutcome(result).actions, null);
  assert.match(asOutcome(result).detail, /not valid JSON/);
});

test('a 404 on the first model advances the chain and stops at a success', async () => {
  const catalog = catalogPlan();
  const { calls, bodies, result } = await withFetch(
    async (_url, init) => {
      const body = JSON.parse(String(init.body)) as { model: string };
      if (body.model === 'gpt-5-nano') return json(404, { error: { message: 'model not found' } });
      return json(200, {
        choices: [{ message: { content: JSON.stringify(goodResponse(catalog)) } }],
      });
    },
    () => callOpenAI('test-key', catalog),
  );
  assert.equal(calls, 2, 'did not advance exactly once');
  assert.equal(bodies[0].model, 'gpt-5-nano');
  assert.equal(bodies[1].model, 'gpt-4.1-nano');
  assert.equal(asOutcome(result).model, 'gpt-4.1-nano');
  assert.notEqual(asOutcome(result).actions, null);
});

test('the chain is never walked more than the configured models', async () => {
  const catalog = catalogPlan();
  const { calls, result } = await withFetch(
    async () => json(404, { error: { message: 'model not found' } }),
    () => callOpenAI('test-key', catalog),
  );
  assert.equal(calls, MODELS.length);
  assert.equal(asOutcome(result).actions, null);
});

test('the request stays inside the token ceiling and asks for JSON', async () => {
  const catalog = catalogPlan();
  const { bodies } = await withFetch(
    async () => json(200, { choices: [{ message: { content: JSON.stringify(goodResponse(catalog)) } }] }),
    () => callOpenAI('test-key', catalog),
  );
  const body = bodies[0] as Record<string, number | undefined> & { response_format?: unknown };
  const budget = body.max_completion_tokens ?? body.max_tokens;
  assert.ok(typeof budget === 'number' && budget <= 400, `token budget is ${budget}`);
  assert.deepEqual(body.response_format, { type: 'json_object' });
});

test('a model response that invents a drug is rejected end to end', async () => {
  const catalog = catalogPlan();
  const poisoned = goodResponse(catalog);
  poisoned.actions[0].oneLiner = 'Start 500 mg of metformin today.';
  const { result } = await withFetch(
    async () => json(200, { choices: [{ message: { content: JSON.stringify(poisoned) } }] }),
    () => callOpenAI('test-key', catalog),
  );
  assert.equal(asOutcome(result).actions, null, 'an invented drug reached the store');
  assert.match(asOutcome(result).detail, /rejected/);
});

// --------------------------------------------------------- house rules

test('the sanitizer is still the only diagnosis path', () => {
  assert.deepEqual(sanitizeConditionIds(['not_a_condition', 42, null]), []);
  assert.deepEqual(sanitizeConditionIds(['hypertension']), ['hypertension']);
});

test('no file under convex/ has a hyphen in its name', () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.includes('-')) offenders.push(full);
    }
  };
  walk(new URL('../convex', import.meta.url).pathname);
  assert.deepEqual(offenders, []);
});

test('the no-key path stores catalog rather than calling out', () => {
  const source = readFileSync(new URL('../convex/plansGenerate.ts', import.meta.url), 'utf8');
  const guard = source.indexOf('if (!apiKey)');
  const call = source.indexOf('callOpenAI(');
  assert.ok(guard > 0, 'no missing-key guard');
  assert.ok(call > guard, 'the key guard does not precede the call');
  assert.match(source.slice(guard, call), /rewrite: 'catalog'/);
});

test('the day is claimed before the call, so one member costs one call', () => {
  const source = readFileSync(new URL('../convex/plansGenerate.ts', import.meta.url), 'utf8');
  const claim = source.indexOf('plansGenerate.claim');
  const call = source.indexOf('callOpenAI(');
  assert.ok(claim > 0 && call > claim, 'the claim does not precede the call');
  assert.match(source, /if \(rowId === null\)/);
});
