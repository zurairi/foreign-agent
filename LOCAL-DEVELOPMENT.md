# Local Sites preview

After `npm ci` and `npm run build`, apply each pending migration once:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_lame_warlock.sql
npm run dev
```

Open the Local URL printed by the server. Visit `/signin-with-chatgpt?return_to=/` to use the starter’s loopback-only development identity. This mock identity is not included in production. The production Site requires real ChatGPT sign-in.

Press Control+C to stop the preview. Hosted data and local preview data are separate. Rebuilding does not publish. Publication uses the native Sites source-and-deployment workflow with `.openai/hosting.json` and generated migrations.
