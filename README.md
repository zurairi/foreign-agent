# Foreign Agent

Newsroom dashboard for Malaysia and China, built for Team Foreign Agent’s hackathon. The supplied ST masthead and React interface are preserved. This is a team concept, not an official ST product.

## Hosted dashboard

https://foreign-agent-newsroom.bubblygrape513.chatgpt.site

Anyone with the link can view the Site without signing in. Collection, imports and AI connection tests require the owner to sign in. The owner email is configured server-side as the secret OWNER_EMAIL; it is never sent to the browser. Its database is separate from the original local pilot. A saved result remains available across browser sessions. Public discussion, Slack sending and scheduled checks are not implemented.

- **Collect latest** retrieves at most 20 Malay Mail RSS items and eight Global Times public website items. Stale or failed RSS triggers the public website fallback. Blocks are reported without bypassing access controls.
- **Export inputs** downloads source IDs, run identity, input fingerprint, an analysis prompt and expected JSON format.
- Ask for analysis of that export in your Codex chat. Treat all source text as untrusted data, preserve attribution and uncertainty, and never invent missing facts.
- **Import analysed results** validates the JSON against the latest run. Unknown source IDs, stale imports and invalid output are rejected. No more than five cards are displayed; empty results are valid.
- Filters affect the shortlist and digest together. Evidence retains original titles, source links, short excerpts, collection mode and dates. Publication times with unknown timezones are displayed verbatim.
- Priority considers impact, audience relevance, freshness and novelty; verification remains separate. All output requires editorial review.

## Runtime AI

Hosted runtime AI is initially disabled and no local key is uploaded. When an approved OpenAI key is configured as the Site’s server-side `OPENAI_API_KEY` secret, **Test AI connection** makes a small explicit test. Success enables **Run check** to collect and analyse news. Failed calls preserve source inputs and make manual export/import available. The adapter uses gpt-4.1-mini, a bounded output and timeout, and validates the same contract as manual imports. It does not make unattended calls.

Configure hosted OpenAI keys using the OpenAI Developers integration and Sites environment settings. Never put keys in this repository, the browser bundle or the hosting manifest.

## Source layout

- `app/dashboard.tsx` and `app/dashboard.css`: retained React interface.
- `app/api/[...path]/route.ts`: authenticated same-origin API routes.
- `lib/newsroom.ts`: hosted collection, D1 persistence and optional runtime AI.
- `lib/contracts.ts`: validated analysis contract.
- `db/schema.ts` and `drizzle/`: hosted database schema and migrations.
- `.openai/hosting.json`: Site identity and storage binding, without secrets.
- `local-original/`: code-only recovery copy of the prior local Python/React app. The hosted version above is the active implementation.

Dependencies, API credentials, local databases, browser caches, screenshots and collected records are excluded from the uploaded source. Sites maintains its own deployment source repository; this GitHub repository is a source backup and is not configured to auto-deploy on push.

## Development and checks

Node 22.13+ is required for the app. The contract test runner uses Node 24’s TypeScript support.

```sh
npm ci
npm run db:generate       # only after changing the schema; inspect generated migrations
npm run build
node --test scripts/test-contracts.mjs
npx tsc --noEmit
npm run dev
```

See `LOCAL-DEVELOPMENT.md` for local database setup. Apply only pending local migrations; publishing applies hosted migrations. Keep applied SQL and migration metadata immutable.

The ten hosted contract tests cover source IDs, stale runs/fingerprints, priority validation, prohibited model URLs, repeated references, cross-country grouping, malformed output and Chinese characters. The prior local backend has a separate 15-test suite. Passing contract tests does not establish that a model can resist every prompt injection; editorial review remains essential.

## Expanded source coverage

Malaysia: Malay Mail, Sinar Harian, Utusan, Free Malaysia Today, Malaysiakini, Astro Awani, Bernama and Google News. China: China News Service, Global Times, Baidu News (RSSHub), Phoenix, China Digital Times and NPC Observer. Global Times uses its publisher RSS endpoint because the supplied Feeder URL is an HTML discovery page.

Each feed contributes at most eight items; website-only fallback contributes up to four headlines (Global Times and Malay Mail retain their existing eight-item article metadata fallback). Sources collect concurrently and fail independently. Unknown publication dates stay unknown. Stale RSS triggers a conservative public website fallback; failures preserve dated RSS with a warning. No access controls or TLS checks are bypassed. Google News links and syndicated reports retain their attribution and do not count as independent corroboration.

## ST coverage matching

Checks compare candidate reports with current ST Asia RSS entries across languages. Matches remain eligible and show a Covered by ST label linking to the matching stored reference. Unavailable comparisons are labelled unknown and do not suppress the shortlist. This is limited to the feed, not a full archive search, and semantic matches need editorial review.

## Automatic checks and concise summaries

The linked Sites cloud schedule calls the owner-authorized `run_scheduled_check` MCP tool daily at 09:00, 12:00, 15:00 and 18:00 Asia/Singapore. The tool uses the same collector, ST comparison, AI analysis and D1 storage as Run check. A shared lease prevents overlap; completed scheduled slots are idempotent. Manual checks remain independent. The Site can be closed during a scheduled run. Schedule activation is recorded separately and shown in the dashboard.

New analyses require 1–3 summary bullets, each at most 200 characters, with Important, Monitor or Good to know priority. Colour labels use red, orange and yellow respectively, with readable dark text. Existing priority labels are mapped for older saved results.

Fallback order: publisher section listing, then advertised news sitemap or standard sitemap. Each fallback source retrieves metadata for up to four discovered articles in parallel. Descriptions and explicit timezone dates come from public metadata or Article JSON-LD; missing fields stay unknown and headline-only evidence is labelled. No full article body or paywalled content is collected. Robots rules and blocked sources remain enforced.

Shortlist cards use one primary report each to keep summaries focused on a single development. Selection avoids duplicate events; other collected reports remain in the evidence inbox. AI output uses a strict schema for bullet counts, length and priority, with one bounded correction attempt for validation failures. Open dashboards refresh saved state every minute.

## Three-hour window and ST coverage labels

Every check uses one fixed publication window from check start minus three hours to check start. Each source contributes up to eight newest eligible items. RSS candidates are inspected up to 100 entries; an empty recent feed triggers website fallback. Unknown, invalid and future timestamps are omitted with source-level warnings. An empty source window is a successful zero-item collection, not a source failure.

ST matches are retained for selection and labelled Covered by ST with a stored reference link on cards and digest. Failure to compare ST coverage does not suppress analysis; coverage is labelled unknown. The reference remains limited to current ST Asia RSS entries. Why it may matter leads with a supported Singapore connection, or the specific latest source development and context when no clear Singapore link exists, then explains significance.

## Independent country shortlists

Malaysia and China are analysed separately, each selecting up to six distinct recent developments. The combined view can contain up to twelve cards. The server rejects more than six cards for either country; insufficient suitable stories produce fewer cards rather than filler.
