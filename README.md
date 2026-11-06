# Foreign Agent

**Alpha hackathon prototype · Updated Nov 6, 2026**

Foreign Agent helps foreign desk editors discover and assess recent developments in Malaysia and China. It collects recent news, groups reports about the same event and produces an editorial shortlist. This is a Team Foreign Agent prototype, not an official Straits Times product. All AI output requires editorial review.

## Live dashboard

[Open Foreign Agent](https://foreignagent.bubblygrape513.chatgpt.site/)

Anyone with the link can view saved results. Collection and AI connection tests require the configured owner to sign in. Results persist in the hosted D1 database, separately from the original local pilot.

- **Run check** collects and analyses recent news using the server-side OpenAI API connection.
- **Sources fetched** opens a drawer with source results, ST comparison details, runtime status and the AI connection test.
- **Preview digest** shows the currently filtered shortlist. It does not send email or Slack messages.
- Country and priority filters apply to the shortlist and digest. The raw collected-items list is collapsed by default; priority filters do not affect that list.
- A **Back to top** button appears after scrolling. Open dashboards refresh saved results every minute.

## Sources and collection

| Desk | Configured sources |
| --- | --- |
| Malaysia | Malay Mail, Sinar Harian, Utusan, Free Malaysia Today, Malaysiakini, Astro Awani, Bernama, Google News |
| China | China News Service, Global Times, Baidu News via RSSHub, Phoenix, China Digital Times, NPC Observer |

Sources collect concurrently and fail independently. Fourteen configured sources does not mean all fourteen will return eligible reports on every check.

Collection uses RSS first, then public website listings and sitemap discovery where available. It reads short descriptions, headlines, and publication metadata, including Article JSON-LD; it does not collect full paywalled articles or bypass access controls, crawler rules or TLS verification. The supplied Global Times Feeder URL is a discovery page, so the collector uses the publisher feed and public website fallback.

Each check fixes a publication window from its start time minus three hours to its start time. RSS parsing examines up to 100 entries per source; public website fallback examines up to eight discovered articles. Each source contributes up to eight newest eligible reports. Old, future, invalid and unknown publication times are omitted with source-level warnings. Fetch time is never substituted for publication time. A source with no eligible recent stories can succeed with zero items.

Public discussion forums are outside the current pilot. Aggregator and syndicated reports retain their attribution and are not necessarily independent corroboration.

## Editorial shortlist and priorities

Malaysia and China are analysed independently, with **up to six distinct stories per country** and twelve in the combined view. Fewer suitable developments produce fewer cards rather than filler.

Each card includes:

- An English headline and one to three concise summary bullets, each limited to 200 characters.
- **Why it may matter:** a supported Singapore connection, or specific recent context when no concrete Singapore connection is established, followed by the development's significance.
- An **Important** (red), **Monitor** (orange) or **Good to know** (yellow) priority.
- Verification notes and expandable evidence with original headlines, links, excerpts and publication dates.

Priority considers impact, Singapore/regional audience relevance, freshness and novelty. Cards are ordered by priority band, then AI selection order; there is no numerical score. Priority is separate from factual verification.

A card can contain up to twelve stored reports covering the same specific event, with the primary report first. A separate same-event verification pass requires supporting quotations from both reports. Rejected supporting reports are removed, and affected cards are rewritten using only their retained reports. Broadly related topics, separate developments, rumours and confirmed actions should not be merged. The footer counts distinct outlets, not article links. Editorial review remains necessary.

Generated copy uses British English. Complete dates use **Nov 6, 2026**, with Singapore-time timestamps where applicable. Original source headlines and direct quotations retain their published wording. The Deepavali greeting on Nov 6, 2026 is a presentation-only override; subsequent days use a time-of-day greeting.

## Straits Times coverage

Candidate reports are compared across languages with the current [ST Asia RSS feed](https://www.straitstimes.com/news/asia/rss.xml), followed by a separate same-event verification pass. Stories already covered by ST remain eligible for the shortlist.

Cards and digest entries show **Covered by ST** with one link: the most recent matched reference by its available publication timestamp. If comparison fails, coverage is marked unknown and stories remain eligible. This is a feed comparison, not a search of the full ST archive; no match does not prove ST has not covered a story.

## Runtime AI and access

The hosted adapter currently uses **`gpt-4.1-mini`** through the OpenAI Responses API with `store: false`, bounded output, timeouts and strict JSON-schema validation. Malay and Chinese material is processed directly and summarised in British English. Credentials are server-side only:

- `OPENAI_API_KEY`: OpenAI API access, configured through Sites environment settings.
- `OWNER_EMAIL`: owner identity used for write authorisation.

Never commit credentials or put them in browser code or the hosting manifest. **Test AI connection** makes a small billable API request; successful configuration enables runtime analysis. Manual and scheduled checks send source headlines and excerpts to OpenAI and consume API credits. Viewing saved results and previewing a digest do not themselves trigger AI analysis.

The legacy export/import API remains in the code for recovery, but those controls are no longer exposed in the main dashboard. Run IDs, input fingerprints, known source IDs, country limits and output fields are validated before analysis is saved.

## Scheduled checks

The linked Sites cloud task is configured for **9am, noon, 3pm and 6pm, Asia/Singapore**, including while the dashboard is closed. It calls the owner-authorised `run_scheduled_check` tool and reads `get_monitoring_status` to verify persistence. It uses the same collection and analysis pipeline as the manual button.

A shared lease prevents overlapping checks. Completed scheduled slots are idempotent; failed analyses can be retried. Manual checks remain independent. Task instructions request one retry after failure, verification before retrying a timeout, silence on success and reporting when action is required. The dashboard's schedule label records configuration; it is not proof that a particular scheduled run succeeded.

**Known scheduling incident:** the 3pm check on Nov 6, 2026 did not produce a saved result at its expected time. A catch-up invocation succeeded at **3:13pm SGT**, collecting 35 items and saving six stories per country. The recurrence and task instructions were checked and resaved with explicit execution and recovery instructions. The original cause remains unconfirmed; the next unattended occurrence still requires verification. Do not describe scheduling as fully validated on the strength of a manual catch-up.

## Development

Use Node 24 for the TypeScript-based test scripts. The application's declared minimum is Node 22.13.

```sh
npm ci
npx tsc --noEmit
node --experimental-strip-types --test scripts/test-contracts.mjs
node --experimental-strip-types --test scripts/test-sources.mjs
npm run build
```

See [LOCAL-DEVELOPMENT.md](LOCAL-DEVELOPMENT.md) for local database migrations and preview startup. Apply pending local migrations once. Run `npm run db:generate` only after a schema change, inspect generated migrations, and keep applied SQL and migration metadata immutable. Local and hosted databases are separate.

The current suites contain 19 contract/access tests and 14 source, publication-window, schedule and matching tests. They cover structural validation and selected failure cases, not every possible model error or prompt injection.

## Source layout and deployment

- `app/dashboard.tsx`, `app/dashboard.css`: dashboard, drawer, evidence and digest preview.
- `app/api/[...path]/route.ts`: authenticated, same-origin API routes.
- `app/mcp/route.ts`: owner-authorised tools used by the linked cloud task.
- `lib/newsroom.ts`: collection, D1 persistence, AI calls and same-event verification.
- `lib/analysis-prompt.ts`, `lib/contracts.ts`: editorial instructions and validated output contract.
- `lib/sources.ts`, `lib/article-metadata.ts`, `lib/robots.ts`, `lib/news-window.ts`: source configuration and public collection rules.
- `lib/st-coverage.ts`, `lib/schedule.ts`: match validation and Singapore schedule slots.
- `db/schema.ts`, `drizzle/`: database schema and migrations.
- `.openai/hosting.json`: Site identity and storage binding, without secrets.
- `local-original/`: code-only recovery copy of the earlier Python/React pilot; the hosted app is the active implementation.

Sites maintains its own deployment source repository. This private GitHub repository is a source backup; pushing here does **not** automatically deploy the dashboard. Publication uses the Sites source-and-deployment workflow. A GitHub Release is optional and is not required for the live Site to run.

Dependencies, credentials, local databases, browser caches, generated builds, screenshots and collected records are excluded from this repository.

## Alpha limitations

- Sources can fail, block collection or omit usable timestamps.
- Summaries rely on headlines and short excerpts, not full reporting.
- AI selection, translation, grouping, ST matches and relevance explanations can be wrong.
- A source count is not a guarantee of independent confirmation.
- Scheduled execution reliability remains under observation after the incident above.
- Email/Slack digest delivery and public discussion collection are not connected.

Use the dashboard for supervised discovery and editorial review, not automatic publication.
