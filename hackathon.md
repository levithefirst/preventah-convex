# Hackathon log

- **Project:** Preventah All Gas
- **Event:** Convex All Gas Hackathon
- **What it does:** Gives a household three prevention actions a day at free, cheap and premium spend tiers, and shows every member's check-ins on a live board.
- **Live app:** https://qualified-hummingbird-614.convex.site
- **Repo:** https://github.com/levithefirst/preventah-convex
- **Frontend:** Convex static hosting
- **Convex deployment:** https://qualified-hummingbird-614.convex.cloud
- **Components:** none
- **Convex features:** schema, tables, indexes, queries, mutations, actions, internal functions, HTTP actions, crons, realtime queries
- **Auth:** none
- **AI models:** gpt-5-nano, falling back to gpt-4.1-nano then gpt-4o-mini
- **Started:** 2026-09-19T17:58:00Z
- **Last updated:** 2026-09-21T03:05:00Z

## Log

### 2026-09-19 - working tree
Started the All Gas app as Vite + React on Convex, alongside an unrelated
Nimiq Mini App it was built next to and has since been separated from. Ported
the curated data layer rather than rewriting it: the 117-entry condition
catalog, the tagged prevention content, and the pure plan resolver became
`convex/lib/` (originally commits 05f9613 and aeddafd in that other repo). That resolver is
synchronous and total, so opening the app never waits on a network call.

### 2026-09-19 - working tree
Laid down the schema and the loop it backs (`convex/schema.ts`). Five tables:
households keyed by a six-character join code, members carrying consent state
and catalog ids, check-ins indexed by member/day and household/day, cached
source cards, and a mail log. Consent is a real gate: `conditionIds` stays
empty and `members.today` reports `needsConsent` until it is accepted.
Convex features: schema, tables, indexes.

### 2026-09-19 - working tree
Built the daily loop. `members.today` resolves the day's three actions and
marks which are already done; `lib/tiers.ts` derives free, cheap and premium
options per action, with the free tier always set to the action's own target
rather than a teaser. `checkins.check` recomputes the day's offer server-side
instead of trusting the client's action id, and re-checking an action swaps
the tier instead of double-counting. `households.board` is one subscribed
query, so a check-in on one phone reaches the rest of the household without a
poll. Convex features: queries, mutations, indexes, realtime queries.

### 2026-09-19 - working tree
Added Firecrawl source cards (`convex/sources.ts`). An action searches for
current public-health pages for a selected condition, filters results to an
allow-list of public-health domains, and caches them through an internal
mutation; the UI reads the cache from a live query. Degrades rather than
throws: a missing key, a refused call or an unparseable payload all leave the
cached cards in place and report why. Reads `FIRECRAWL_API_KEY` from the
deployment environment. Convex features: actions, internal mutations.

### 2026-09-19 - working tree
Added AgentMail sends and the crons that drive them (`convex/mail.ts`,
`convex/crons.ts`). A morning plan writes out the day's three actions and
their tiers; a nudge follows a day that went by without a check-in, worded to
stay gentle. Both claim a `mailLog` row before calling the API, so a retried
cron cannot mail twice. Both sweeps run hourly and filter on each member's
local clock, which serves several timezones from one cron instead of a job
per member. Reads `AGENTMAIL_API_KEY` and optionally `AGENTMAIL_INBOX_ID`
from the deployment environment; values are never in the repo. Convex
features: crons, internal actions, scheduled sweeps.

### 2026-09-19 - working tree
Put the frontend on the deployment itself. `scripts/embed-site.mjs` embeds the
Vite build into `convex/siteAssets.ts` and `convex/http.ts` serves it from the
HTTP router with an index fallback, so the SPA and its API share one origin on
`*.convex.site`. Fingerprinted assets are cached immutably, `index.html` is
not. Convex features: HTTP actions.

### 2026-09-19 - working tree
Wrote the screens: household create/join, the consent gate, the catalog picker
with category chips and search, today's three actions with tier buttons and an
expandable why/how, the live board, and the mail settings tab with a manual
send so a demo does not have to wait for 07:00. Added a smoke test over the
pure core (`tests/loop.test.ts`): a plan resolves for any input
including nonsense, the same selections and day always give the same plan,
every action offers all three tiers, and the sanitizer drops anything that is
not a catalog id. Ten tests pass. Writing that test caught a real bug:
`normalizeJoinCode` accepted `I` and `O`, which the code generator's alphabet
deliberately omits because they get misheard; it now strips them rather than
guessing at a substitution.

### 2026-09-19 - working tree
Not yet deployed. This session's network policy blocks every `convex.dev`
host, so `convex login`, `convex env set` and `convex deploy` could not run
from here. `convex/_generated/` was produced locally from the Convex CLI's own
codegen templates so the project typechecks and builds offline; `npx convex
dev` regenerates it. The frontend build is verified (`vite build`, 98 modules)
and `tsc --noEmit` is clean across `convex/` and `src/`.

### 2026-09-19 - 8961f9c
Live in production on Convex, which supersedes the "not yet deployed" note
above: that entry still describes the build environment, not the project. The
GitHub Actions workflow deployed backend and embedded site together, and the
app now answers on its `.convex.site` origin with the Convex deployment behind
it (`.github/workflows/allgas-deploy.yml`, `convex/http.ts`).

### 2026-09-20 - working tree
Added a wording layer over the catalog plan, not a replacement for it. One
OpenAI call per member per calendar day rewrites three titles, three one-line
hows and nine tier titles; ids, types, how-to lists, safety notes, costs and
every source stay exactly as the catalog has them (`convex/plansGenerate.ts`,
`convex/lib/openai.ts`, `convex/lib/rewrite.ts`). The day's row in the new
`dailyPlans` table is claimed in a transaction before the call goes out, so
the row is both the cache and the spend guard: tab changes, reloads and the
"Refresh wording" button all hit the table, and a second call for the same day
is impossible rather than merely unlikely.

Validation decides what is allowed through. A response is rejected whole if it
renames an id, reorders a tier, runs long, adds a URL the catalog did not
supply, or introduces a drug, dose, lab, supplement-as-treatment, diagnosis or
prediction. "Introduces" is defined against the catalog copy for that action,
so echoing a clinical word the catalog already used is fine and inventing one
is not. Any rejection, missing key, 401, 429, timeout or non-JSON body stores
`rewrite: "catalog"` and the catalog wording renders unchanged. There are no
retries; the model chain is walked only on a free 404 or parameter rejection.

Tests cover the parts that matter without a deployment (`tests/`): the
money rules against a stubbed fetch (one call per billable failure, the chain
advancing exactly once on a 404, the token ceiling), the safety rules
(invented drugs and doses rejected end to end), and a regression that walks
120 plan-days asserting the catalog's own wording always validates, so the
guard can never fail closed and quietly disable the layer. 40 tests pass, tsc
is clean and the build is green. The deployment's stored `model` field records
which model actually answered.

### 2026-09-20 - repo split
Published as its own repository. All Gas is the only product here: the Next.js
Nimiq Mini App it was built beside is not in this tree, and neither is its
Vercel config, its wallet code or its Postgres layer. What was the `allgas/`
subdirectory is now the root, and the deploy workflow runs from it without a
working-directory prefix. Earlier entries keep their dates, SHAs and facts;
their file paths were normalised to this root, since that is where the files
they name now live. Live URLs are unchanged, and no new Convex project was
created.

### 2026-09-20 - working tree
Restyled onto the Preventah tokens: lavender canvas, cream windows with a 2px
ink edge, and depth from an offset blush plate rather than a blur. The palette
carries a rule the product needs, which is that nothing is traffic-lit. Done is
mint, not done is cream, and a quiet day on the board reads as quiet rather
than as a failure, because a shared scoreboard that shames people is one a
family deletes.

The Gate is now the first screen rather than a form: the purpose line, two
calls to action, and after creating a household the join code at display size
with a copy button and the plain statement that it is not a password. Consent
gained a real checkbox that gates the button. Today shows each action's source
without opening the disclosure, since a citation you have to hunt for is not
really one. The mail tab reports its last send in plain language via a new
`mail.lastSendFor` query. Gate to consent to a check-in is three taps.

Verified by rendering rather than by inspection: Chromium at 390px reports no
horizontal scroll, one h1, every input labelled, no tap target under 44px and
no text input under 16px. Contrast was computed for all nine token pairs in
use, lowest 7.09:1. Two bugs turned up that way and were fixed: the blush
plate was painting over its own panel because the positioned pseudo-element
made a stacking context, now two zero-blur shadows; and a shared `capitalize`
rule was title-casing the Gate into "Start A Household". Motion is CSS only,
80/120/200ms, and `prefers-reduced-motion: reduce` turns all of it off.

### 2026-09-21 - working tree
Removed the three spend tiers from the product. They were an earlier idea and
they were making the decision the wrong one: an action is one thing to do, and
the question is whether you did it, not what you were willing to spend on it.
Today is now one cream window per action with a single control, mint means
exactly one thing on it, which is done, and the type bar reads eat / move /
keep.

The tiers are gone from every surface, not hidden. `members.today` drops
`options` before the plan leaves the server, so no client can render a price
even by accident; the board row no longer lists them; the morning email offers
the action and its source instead of nine priced lines; and the model is no
longer asked for tier titles, only a title and a one-line how. The resolver in
`convex/lib/tiers.ts` stays for the tests that pin its shape. Check-ins still
write the `tier` column the table has always had, with the default value and
never read back, because migrating a column to drop something the UI stopped
showing would be work for nobody.

Fonts are vendored rather than fetched: Outfit for titles and Figtree for body,
both variable woff2 under `public/fonts/`, served from the deployment's own
origin with `font-display: swap`. They needed no route change, because
`convex/http.ts` already registers an exact route for every embedded asset.

The Gate stopped being a stamp on a purple field. The page fills the viewport,
phones get near edge-to-edge windows instead of a narrow column, desktop caps
at 40rem for forms and 48rem for the tabs, and the disclaimer sits at the foot
of the viewport rather than leaving a dead band. Chrome is sticky on the
signed-in screens.

Verified by rendering at 390 and 1280: no horizontal scroll at either, content
fills the viewport, every tap target at least 44px, both vendored families
resolving, and no budget word anywhere in the rendered text. 44 tests pass.
Updating them caught a bad edit of my own: removing the tier block from
`validateRewrite` had taken the title and one-liner content checks with it,
which would have shipped a rewrite layer with its safety gate silently
removed. The tests failed on invented drugs and diagnosis wording, which is
precisely what they are for.
