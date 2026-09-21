# Hackathon log

- **Project:** Preventah All Gas
- **Event:** Convex All Gas Hackathon
- **What it does:** Helps a household act on the illnesses that already run in it: pick the conditions, get something concrete to do today, and everyone you live with sees that you did it.
- **Live app:** https://qualified-hummingbird-614.convex.site
- **Repo:** https://github.com/levithefirst/preventah-convex
- **Frontend:** Convex static hosting
- **Convex deployment:** https://qualified-hummingbird-614.convex.cloud
- **Components:** none
- **Convex features:** schema, tables, indexes, queries, mutations, actions, internal functions, HTTP actions, crons, realtime queries, static site routes
- **Auth:** Convex Auth (Password, plus Google when configured)
- **AI models:** gpt-5-nano, falling back to gpt-4.1-nano then gpt-4o-mini
- **Started:** 2026-09-19T17:58:00Z
- **Last updated:** 2026-09-21T21:15:00Z

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

### 2026-09-21 - working tree
Navigation, a public site, and solo use as a household of one. Accounts are
not in this entry; see below.

The mark and wordmark are now a button that goes home, which was the bug worth
fixing: there had been no way back except leaving the household. A small
history router covers twelve paths, each registered as its own exact GET in
`convex/http.ts` so a reload or a shared link lands where it points. Still no
`pathPrefix: "/"`. On a phone the five destinations collapse into one Menu
that closes on Escape and returns focus to its button; from 641px they sit in
the header. Every page gained a skip link.

Solo is two labels on one model, not a second codepath. "Just me" and "Start a
household" call the same mutation and write the same rows; the only difference
is whether the join code is shown large or folded under "Invite family later".
A household of one gets the same Today, the same board with one row on it, and
the same everything else. Profile is a real screen now, and it is where
leaving lives rather than the footer.

Public pages written to match the code rather than a template: `/about` says
what this is not, `/faq` answers eight real questions, `/privacy` lists every
stored field taken from the schema and names each processor and what it
receives, `/terms` is honest about being a hackathon project, and `/contact`
says there is no office and publishes no invented address. Plus `/404`,
`robots.txt`, `sitemap.xml`, `llms.txt`, a web manifest, `security.txt`, and
icons and a 1200x630 Open Graph card generated from the existing P mark in
Outfit. Unique title, description and canonical per public route. No
analytics, no pixels, no cookie banner, because there is nothing non-essential
to consent to.

Verified by rendering every public route at 390px: one h1 each, distinct
title, description and canonical, no horizontal scroll, no tap target under
44px, skip link and home button present. 47 tests pass, including new ones
asserting that `convex/http.ts` and `src/site.ts` agree on the route list and
that every crawler-facing file is embedded and routed.

Accounts are not shipped. `@convex-dev/auth` signs tokens with a keypair its
init CLI generates and writes to the deployment as `JWT_PRIVATE_KEY` and
`JWKS`; the server calls `requireEnv("JWT_PRIVATE_KEY")` at runtime and throws
without it. That CLI needs Convex deployment access, which this build
environment's network policy blocks, and the keys cannot be invented. Shipping
auth-gated queries without them would have left a working app that nobody
could sign in to, so identity is still this browser and Profile says so
plainly. The Google button is not in the build either: it is gated on
`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, and no client secret was fabricated.

### 2026-09-21 - working tree
Accounts wired, and the keys that make them work moved to a workflow.
`@convex-dev/auth` signs sessions with a keypair that must live on the
deployment, and this build environment cannot reach convex.dev, so
`.github/workflows/init-auth.yml` generates the RS256 pair in Actions and sets
`JWT_PRIVATE_KEY`, `JWKS` and `SITE_URL` there. It is manual-only and does not
overwrite existing keys without `--force`, because rotating them signs every
live session out. Key material never reaches argv, a shell or the log: values
go to the CLI over stdin, and any error output is redacted before printing.
Two things in the plan did not survive contact with the CLI and were changed:
`convex env set` has no `--yes` flag and rejects it outright, and it documents
stdin as the way to keep secrets out of shell history, which is stronger than
passing them as arguments anyway.

Password is always offered; Google is added only when both halves of its
credential are present. Nothing about sign-in renders until
`convex/authStatus.ts` reports the deployment can actually sign a session, so
deploying this before the workflow runs leaves the app exactly as it was
rather than showing a button that throws.

Identity moves to the account without stranding anyone. A browser that never
signs in keeps using its member id; the moment an account exists it decides,
and `members.today` ignores the id in its argument for a signed-in caller.
`convex/account.ts` claims a member left behind by the old flow, once per
account and only one nobody owns. `auth.addHttpRoutes(http)` sits alongside
the exact page routes; there is still no `pathPrefix: "/"`.

One long-standing bug surfaced while verifying this. Every local production
build had been emitting a stub: with `VITE_CONVEX_URL` unset, Vite folds
`import.meta.env.VITE_CONVEX_URL` to undefined, decides the whole app is
unreachable, and ships a bundle containing only the "not configured" message.
The deployed site was fine because CI passes the variable through
`--cmd-url-env-var-name`, but the committed `convex/siteAssets.ts` had been a
217 KB shell rather than the app. A tracked `.env` holding the public
deployment URL fixes it; the bundle is now 350 KB and contains the product.

### 2026-09-21 - working tree
Account chrome, a landing window, and the selected-conditions rail.

The mark now goes to `/` from every screen. It used to go to Today, which is
a tab, so tapping the logo inside the app moved you sideways and never out:
that is why it felt broken. Sign in and Sign up sit in the header and the
phone menu when signed out, Sign out when signed in, and Profile's signed-out
state is two buttons instead of a paragraph telling you something you cannot
act on.

`/signin` and `/signup` are real routes with their own exact GET in
`convex/http.ts`. The form is always rendered now. The earlier version hid
itself until the deployment reported it could sign a session, which meant a
missing key showed up as a missing page; it now says account signing is
warming up and leaves the form where you can see it. Google stays conditional,
because a provider that is genuinely unconfigured fails at the redirect with
nothing useful to show.

Conditions leads with what you track rather than burying it in a hundred
cards: an "On your list" rail with Remove on each, then a Get help window
carrying the catalog's own source link per selected condition, then the
catalog with the selected ids filtered out so nothing appears twice. Get help
publishes no helpline and no clinic: anything a source says about seeking care
stays on the source's page, where it stays accurate. Fixing it properly meant
carrying `sourceName` and `sourceUrl` on `members.today`'s conditions, because
resolving them from the search results made the list shrink as you typed.

The landing is one hero window in the existing tokens: mint folder tab, cream
body, hard ink edge, offset blush plate, one pill. The mark is now a real
drawing at `public/brand/preventah-mark.svg`, a cream window with a mint
calendar stripe, blush offset and a bold ink P, drawn as paths so no font has
to load. No image file came through with the brief, so it was recreated from
its description.

Rendered at 390 and 1280: one h1 per route, the mark loading rather than
alt-texting, forms present on both auth routes, no horizontal scroll, no tap
target under 44px, no page errors. 47 tests pass.

### 2026-09-21 - working tree
Split the landing page from the app, which is the root of the complaint that
Today looked like a landing page: `/` was the app, so there was no landing
page to look at. `/` is now marketing only and never mounts a tab, a check-in
or a crawl result. The app entry is `/app`, onboarding is `/start`, and both
are exact GET routes like every other path.

`/start` is four steps, one visible at a time, and the step is derived from
what exists rather than from a counter, so a reload lands back where it left
off. Household or solo, consent, the name the board uses, then at least one
condition with the selected rail on the same screen. Nobody reaches Today
until all four are done, which is what stops the first Today anyone sees from
being three cards drawn from nothing.

The landing is a hero with an original SVG character, three how-it-works
windows and an ink band of three cards. The character is inline SVG with
CSS-only motion: a four second breath, an occasional blink, and the check
drawing itself once. No three.js, no Lottie, no runtime animation library;
reduced motion gets a static pose with the tick already drawn. The whole
bundle is 361 KB.

Two bugs fixed on the way. "5 of 3 done today" was real: the count was every
check-in row under today's key, and yesterday's action ids survive a plan
rotation or a change of conditions, so it could exceed three. It now counts
only rows matching today's three. And Firecrawl descriptions were rendered
raw, so markdown headings, link syntax and "Skip to main content" could reach
the page; `convex/lib/snippet.ts` now accepts only something that reads like a
sentence and returns nothing otherwise, and the UI shows title and link alone
when there is nothing clean to show.

Sign in and Sign up left the tab row: they belong on the marketing home and on
their own routes, not crowding the five destinations someone uses daily. Sign
out stays, because it is the way out.

Rendered at 390 and 1280: one h1 per route, no Today content on `/`, character
present, no horizontal scroll, no tap target under 44px, no page errors. 47
tests pass.

### 2026-09-21 - working tree
Three landing layout fixes, no new features.

The purple desert was `align-content: center` inside a full-viewport
minimum: a short strip of copy floating in the middle of a box far larger
than it needed. The hero is now top-aligned, and its minimum is deliberately
less than a screen, because a hero that owns the whole first view pushes
"How it works" exactly one scroll away. Measured at 1280x800: the section
heading now sits at 578px with its three cards visible, where it used to
start past the fold.

The character has a reserved band of its own rather than whatever height the
column happened to give it, sized by height instead of width so the whole
body, card and bench fit: 224px under the calls to action on a phone, 312px
beside the headline on desktop. Nothing is cropped and it is on the first
screen at 390 as well as 1280.

The primary call to action no longer tells a visitor the product is over. A
device with a household still gets "Open app" as the mint button, but "Start
a new household" sits beside it in cream, so a judge or a second family has
somewhere to go. The header's mint button says the same thing as the hero's.

The phone header stopped wrapping into two cramped rows: the links moved into
a Menu, which closes on Escape and returns focus to its button like the app's
does. Measured at 390, 768 and 1280, the header is 72px and one row at all
three.

### 2026-09-21 - working tree
Rewrote the marketing copy and fixed the auth pages.

The landing explained the product by counting to three, in three places, and
never said what it was for. It now leads with the thing itself: prevent the
diseases that run in your family, pick what runs in yours, do one thing today,
your household sees it. The numbered plates and the black band are gone, along
with their CSS, and what survives of "how it works" is one line under the
buttons where somebody scanning will read it. The duplicate Sign in under the
hero went too, since the header already has one. The engine still resolves eat,
move and keep inside the app; that was never the pitch.

The password field on `/signin` was genuinely broken, not just ugly. The input
rule matched `text`, `email` and untyped inputs, so `type="password"` fell back
to the browser's default width and rendered as a stub next to a full-width
email box. Both are 308px at 390 and 550px at 1280 now.

Every public page wears one shared header instead of a floating logo:
`SiteHeader`, one row at any width, links folding into a Menu below 720px. The
two links are one object in two instances, so they share size, weight,
underline and baseline by construction rather than by coincidence; measured,
both sit at 15px, weight 600, underlined, on the same baseline. The mint button
is the only thing in the row allowed to look different, and it says what the
hero's primary says.

The footer is pinned with `margin-top: auto`, so a short form is followed by
the footer rather than by a field of lavender.

### 2026-09-21 - working tree
Desktop layout, account-first onboarding, and the end of the join code.

The landing is an ordinary document again. It had `min-height: 100dvh` on the
column and `margin-top: auto` on the footer, so on a short page the footer was
pinned to the bottom of the screen and everything between it and the hero was
canvas. Both are gone for `/`. Measured at 1280x800: the footer's top is 468px
and the hero's bottom is 468px, a gap of zero, with the document exactly one
viewport tall. The hero is a two column grid, both columns top-aligned, 48px
gap, capped at 72rem, character at 280px. The two buttons share the column at
equal width and height rather than floating as two pills.

The header carries How it works, Sign in, Sign up and the mint primary, still
on one row at every width, still folding into a Menu below 720px. The hero's
secondary is Sign in; "What this is" moved into the Menu, where the footer's
About already covers it.

The join code is gone from the product. Nobody is shown a six-character string
to read aloud, and nothing calls it "not a password" to explain what it is not.
Inviting someone copies a link to `/start?invite=<token>`; opening it while
signed in attaches them to that household. The token is the household's
existing key, so households created before this keep working, and the schema
column is untouched. Zero user-facing hits for "join code", "Join with" or
"six characters" remain; the only occurrences left are the three places the
token is passed to the API.

Onboarding leads with the account, because a household that lives in one
browser is a cleared cache away from gone. Five steps now: account, solo or
household, consent, name, conditions. The "I have a code" branch is gone,
replaced by the invite link. One guard worth naming: the account step is only
required where the deployment reports it can sign a session, since requiring
an account the deployment cannot issue would lock everyone out of their own
app.
